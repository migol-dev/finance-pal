import { LocalNotifications, PermissionStatus } from "@capacitor/local-notifications";
import { PushNotifications, PushNotificationSchema, Token } from "@capacitor/push-notifications";
import { Capacitor } from "@capacitor/core";
import {
  Goal,
  FixedItem,
  Transaction,
  NotificationPreferences,
  NotificationPermissionState,
  NotificationRepeatFrequency,
  DEFAULT_NOTIFICATION_PREFS,
  startOfDay,
  parseDateLocal,
  parseGoalDeadline,
  paceForGoal,
  statusForGoal,
  getUpcomingOccurrencesForFixedItem,
} from "./finance";
import { sanitizeNotificationPrefs } from "./sanitizers";
import { toast } from "sonner";

// Re-export obligatorio para mantener compatibilidad con consumidores y tests existentes
export {
  type NotificationPreferences,
  type NotificationPermissionState,
  type NotificationRepeatFrequency,
  DEFAULT_NOTIFICATION_PREFS,
} from "./finance";

export type NotificationType =
  | "goal_deadline_upcoming"
  | "goal_overdue"
  | "goal_behind_pace"
  | "fixed_item_due"
  | "new_login";

export interface ScheduledNotification {
  id: string;
  dedupeKey?: string;
  type: NotificationType;
  entityId: string;
  title: string;
  body: string;
  scheduledAt: Date;
  url?: string;
  payload?: Record<string, unknown>;
}

export const ANDROID_CHANNEL_ID = "finance_pal_reminders";
const DELIVERY_LOG_KEY = "finance-pal-notif-delivery-log-v1";
const DELIVERY_LOG_TTL_MS = 45 * 24 * 60 * 60 * 1000; // 45 días

let channelCreated = false;

// Mapa en memoria de timers para sesión Web activa
const webNotificationTimers = new Map<string, ReturnType<typeof setTimeout>>();
// Protección contra cancelación prematura de notificaciones inmediatas en Android (ventana de 3.5s)
const recentImmediateAndroidIds = new Map<number, number>();
// Cola de serialización para evitar que dos llamadas concurrentes a scheduleAllNotifications se pisen
let scheduleQueuePromise: Promise<unknown> = Promise.resolve();

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

function toYMD(d: Date): string {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

function parseTimeHHMM(value: string | undefined, fallbackH: number, fallbackM: number): [number, number] {
  if (!value || typeof value !== "string") return [fallbackH, fallbackM];
  const m = value.match(/^([01]\d|2[0-3]):([0-5]\d)$/);
  if (!m) return [fallbackH, fallbackM];
  return [Number(m[1]), Number(m[2])];
}

export function hashCode(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0;
  }
  return (hash & 0x7fffffff) || 1;
}

function generateNotificationId(type: NotificationType, entityId: string, extra?: string): string {
  const base = `${type}_${entityId}`;
  return extra ? `${base}_${extra}` : base;
}

/* ─────────────────────────  Deduplicación Persistente  ───────────────────────── */

function readDeliveryLog(): Record<string, number> {
  if (typeof window === "undefined" || typeof localStorage === "undefined") return {};
  try {
    const raw = localStorage.getItem(DELIVERY_LOG_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return {};
    return parsed as Record<string, number>;
  } catch {
    return {};
  }
}

function writeDeliveryLog(log: Record<string, number>, nowMs: number = Date.now()): void {
  if (typeof window === "undefined" || typeof localStorage === "undefined") return;
  try {
    const pruned: Record<string, number> = {};
    for (const [k, ts] of Object.entries(log)) {
      if (typeof ts === "number" && Number.isFinite(ts) && nowMs - ts <= DELIVERY_LOG_TTL_MS) {
        pruned[k] = ts;
      }
    }
    localStorage.setItem(DELIVERY_LOG_KEY, JSON.stringify(pruned));
  } catch {
    // Ignore storage quota errors
  }
}

export function hasNotificationBeenDelivered(dedupeKey: string): boolean {
  if (!dedupeKey) return false;
  const log = readDeliveryLog();
  const ts = log[dedupeKey];
  if (typeof ts !== "number" || !Number.isFinite(ts)) return false;
  return Date.now() - ts <= DELIVERY_LOG_TTL_MS;
}

export function markNotificationDelivered(dedupeKey: string, deliveredAt: Date = new Date()): void {
  if (!dedupeKey) return;
  const log = readDeliveryLog();
  log[dedupeKey] = deliveredAt.getTime();
  writeDeliveryLog(log, deliveredAt.getTime());
}

export function clearDeliveredNotificationsLog(): void {
  if (typeof window === "undefined" || typeof localStorage === "undefined") return;
  try {
    localStorage.removeItem(DELIVERY_LOG_KEY);
  } catch {
    // Ignore
  }
}

/* ─────────────────────────  Horario Preferido y Silencioso  ───────────────────────── */

export function isDateInQuietHours(date: Date, rawPrefs: Partial<NotificationPreferences>): boolean {
  const prefs = sanitizeNotificationPrefs(rawPrefs);
  if (!prefs.quietHoursEnabled) return false;

  const [startH, startM] = parseTimeHHMM(prefs.quietHours.start, 22, 0);
  const [endH, endM] = parseTimeHHMM(prefs.quietHours.end, 8, 0);

  const startMins = startH * 60 + startM;
  const endMins = endH * 60 + endM;
  if (startMins === endMins) return false;

  const currentMins = date.getHours() * 60 + date.getMinutes();

  if (startMins < endMins) {
    return currentMins >= startMins && currentMins < endMins;
  }
  // Cruza medianoche (ej. 22:00 a 08:00)
  return currentMins >= startMins || currentMins < endMins;
}

export function applyPreferredTimeAndQuietHours(
  targetDate: Date,
  rawPrefs: Partial<NotificationPreferences>,
  preserveTargetTime: boolean = false,
): Date {
  const prefs = sanitizeNotificationPrefs(rawPrefs);
  const result = new Date(targetDate);

  if (!preserveTargetTime) {
    const [prefH, prefM] = parseTimeHHMM(prefs.preferredTime, 9, 0);
    result.setHours(prefH, prefM, 0, 0);
  }

  if (!isDateInQuietHours(result, prefs)) {
    return result;
  }

  const [startH, startM] = parseTimeHHMM(prefs.quietHours.start, 22, 0);
  const [endH, endM] = parseTimeHHMM(prefs.quietHours.end, 8, 0);
  const startMins = startH * 60 + startM;
  const endMins = endH * 60 + endM;
  const currentMins = result.getHours() * 60 + result.getMinutes();

  if (startMins > endMins && currentMins >= startMins) {
    // Está en el tramo nocturno antes de medianoche -> posponer a endH:endM del día siguiente
    result.setDate(result.getDate() + 1);
  }
  result.setHours(endH, endM, 0, 0);
  return result;
}

/* ─────────────────────────  Permisos y Canales (Web + Android)  ───────────────────────── */

export async function getNotificationPermissionState(): Promise<NotificationPermissionState> {
  if (Capacitor.isNativePlatform()) {
    try {
      const status = await LocalNotifications.checkPermissions();
      if (status.display === "granted") return "granted";
      if (status.display === "denied") return "denied";
      return "prompt";
    } catch {
      return "prompt";
    }
  }

  if (typeof window === "undefined" || !("Notification" in window)) {
    return "unsupported";
  }

  const perm = Notification.permission;
  if (perm === "granted") return "granted";
  if (perm === "denied") return "denied";
  return "prompt";
}

export async function ensureAndroidNotificationChannel(
  rawPrefs?: Partial<NotificationPreferences>,
): Promise<void> {
  if (!Capacitor.isNativePlatform()) return;
  const prefs = sanitizeNotificationPrefs(rawPrefs);
  try {
    await LocalNotifications.createChannel({
      id: ANDROID_CHANNEL_ID,
      name: "Recordatorios y Metas",
      description: "Alertas de próximos gastos/ingresos recurrentes, fechas límite y ritmo de metas",
      importance: 4,
      visibility: 1,
      vibration: prefs.vibrationEnabled,
      sound: prefs.soundEnabled ? "default" : undefined,
    });
    channelCreated = true;
  } catch (e) {
    console.warn("[Notifications] Failed to create Android notification channel:", e);
  }
}

export async function requestNotificationPermissions(
  pushEnabled: boolean = true,
): Promise<PermissionStatus> {
  if (!Capacitor.isNativePlatform()) {
    if (typeof window !== "undefined" && "Notification" in window) {
      try {
        const perm = await Notification.requestPermission();
        if (perm === "granted" && pushEnabled) {
          import("./web-push").then((m) => m.subscribeToWebPush()).catch(console.warn);
        }
        return {
          display: perm === "granted" ? "granted" : perm === "denied" ? "denied" : "prompt",
        };
      } catch (e) {
        console.warn("Web notification permission request failed:", e);
        return { display: "denied" };
      }
    }
    return { display: "denied" };
  }

  try {
    await ensureAndroidNotificationChannel();
    const localPerm = await LocalNotifications.requestPermissions();
    if (pushEnabled) {
      try {
        await PushNotifications.requestPermissions();
      } catch {
        // Push opcional si FCM no está configurado
      }
    }
    return localPerm;
  } catch (e) {
    console.warn("Native notification permission request failed:", e);
    return { display: "denied" };
  }
}

export async function registerPushNotifications(): Promise<string | null> {
  if (!Capacitor.isNativePlatform()) return null;

  try {
    const perm = await PushNotifications.requestPermissions();
    if (perm.receive !== "granted") return null;

    await PushNotifications.register();
    return null;
  } catch (e) {
    console.warn("Push registration failed:", e);
    return null;
  }
}

export function setupPushListeners(
  onToken: (token: string) => void,
  onNotification: (notification: PushNotificationSchema) => void,
) {
  if (!Capacitor.isNativePlatform()) return () => {};

  PushNotifications.addListener("registration", (token: Token) => {
    onToken(token.value);
  });

  PushNotifications.addListener("registrationError", (err) => {
    console.error("Push registration error:", err);
  });

  PushNotifications.addListener("pushNotificationReceived", onNotification);

  return () => {
    PushNotifications.removeAllListeners();
  };
}

/* ─────────────────────────  Entrega en Web (SW + Fallback) y Android  ───────────────────────── */

export async function showWebNotification(
  notification: ScheduledNotification,
  rawPrefs?: Partial<NotificationPreferences>,
): Promise<boolean> {
  if (typeof window === "undefined" || !("Notification" in window)) return false;
  if (Notification.permission !== "granted") return false;

  const prefs = sanitizeNotificationPrefs(rawPrefs);
  const tag = notification.dedupeKey || notification.id;
  const silent = !prefs.soundEnabled;
  const vibrate = prefs.vibrationEnabled ? [100, 50, 100] : [];
  const dataPayload = {
    ...(notification.payload ?? {}),
    id: notification.id,
    type: notification.type,
    entityId: notification.entityId,
    url: notification.url || "/",
  };

  // 1. Preferir ServiceWorkerRegistration.showNotification (compatible con PWA móvil Android/iOS y escritorio)
  if ("serviceWorker" in navigator) {
    try {
      const reg =
        (await navigator.serviceWorker.getRegistration("/sw.js")) ??
        (await navigator.serviceWorker.getRegistration());
      if (reg && typeof reg.showNotification === "function") {
        await reg.showNotification(notification.title, {
          body: notification.body,
          icon: "/icon-192.png",
          badge: "/icon-192.png",
          tag,
          silent,
          vibrate,
          data: dataPayload,
        } as NotificationOptions);
        return true;
      }
    } catch (swErr) {
      console.warn("[Notifications] ServiceWorker showNotification fallback:", swErr);
    }
  }

  // 2. Fallback al constructor clásico en navegadores de escritorio sin SW activo
  try {
    new Notification(notification.title, {
      body: notification.body,
      icon: "/icon-192.png",
      tag,
      silent,
      data: dataPayload,
    });
    return true;
  } catch (err) {
    console.warn("[Notifications] Web Notification constructor failed:", err);
    return false;
  }
}

export function showInAppToastNotification(
  notification: ScheduledNotification,
  rawPrefs?: Partial<NotificationPreferences>,
): boolean {
  if (typeof window === "undefined") return false;
  if (typeof document !== "undefined" && document.visibilityState === "hidden") return false;
  const prefs = sanitizeNotificationPrefs(rawPrefs);
  if (!prefs.enabled || !prefs.inAppToastEnabled) return false;
  try {
    toast.info(notification.title, {
      description: notification.body,
      id: notification.dedupeKey || notification.id,
    });
    return true;
  } catch {
    return false;
  }
}

export async function scheduleLocalNotification(
  notification: ScheduledNotification,
  rawPrefs?: Partial<NotificationPreferences>,
): Promise<void> {
  const prefs = sanitizeNotificationPrefs(rawPrefs);

  if (Capacitor.isNativePlatform()) {
    if (!prefs.localEnabled) return;
    try {
      const { display } = await LocalNotifications.checkPermissions();
      if (display !== "granted") return;

      if (!channelCreated) {
        await ensureAndroidNotificationChannel(prefs);
      }

      const nowMs = Date.now();
      const isImmediate = notification.scheduledAt.getTime() <= nowMs + 2000;
      const safeAt =
        notification.scheduledAt.getTime() <= nowMs
          ? new Date(nowMs + 1500)
          : notification.scheduledAt;

      const numericId = hashCode(notification.id);
      if (isImmediate) {
        recentImmediateAndroidIds.set(numericId, nowMs + 4000);
      }

      await LocalNotifications.schedule({
        notifications: [
          {
            id: numericId,
            title: notification.title,
            body: notification.body,
            channelId: ANDROID_CHANNEL_ID,
            schedule: {
              at: safeAt,
              allowWhileIdle: true,
            },
            extra: {
              ...(notification.payload ?? {}),
              type: notification.type,
              entityId: notification.entityId,
              url: notification.url || "/",
              dedupeKey: notification.dedupeKey || notification.id,
            },
            sound: prefs.soundEnabled ? "default" : undefined,
            smallIcon: "ic_stat_notification",
            iconColor: "#3B82F6",
          },
        ],
      });
    } catch (e) {
      console.warn("Native local notification scheduling failed:", e);
    }
    return;
  }

  // Programación Web en sesión activa
  if (typeof window !== "undefined") {
    if (webNotificationTimers.has(notification.id)) {
      clearTimeout(webNotificationTimers.get(notification.id)!);
      webNotificationTimers.delete(notification.id);
    }

    const canShowOsWeb =
      prefs.localEnabled && "Notification" in window && Notification.permission === "granted";
    if (!canShowOsWeb && !prefs.inAppToastEnabled) return;

    const delay = notification.scheduledAt.getTime() - Date.now();
    // Límite seguro para setTimeout (24.8 días)
    if (delay > 0 && delay <= 2147483647) {
      const timer = setTimeout(async () => {
        try {
          const key = notification.dedupeKey || notification.id;
          if (!hasNotificationBeenDelivered(key)) {
            const osShown = prefs.localEnabled
              ? await showWebNotification(notification, prefs)
              : false;
            const toastShown = prefs.inAppToastEnabled
              ? showInAppToastNotification(notification, prefs)
              : false;
            if (osShown || toastShown) {
              markNotificationDelivered(key);
            }
          }
        } catch (e) {
          console.warn("Web Notification trigger failed:", e);
        } finally {
          webNotificationTimers.delete(notification.id);
        }
      }, delay);
      webNotificationTimers.set(notification.id, timer);
    }
  }
}

export async function cancelLocalNotification(id: string): Promise<void> {
  if (Capacitor.isNativePlatform()) {
    try {
      const numericId = hashCode(id);
      recentImmediateAndroidIds.delete(numericId);
      await LocalNotifications.cancel({ notifications: [{ id: numericId }] });
    } catch (e) {
      console.warn("Native notification cancel failed:", e);
    }
    return;
  }

  if (webNotificationTimers.has(id)) {
    clearTimeout(webNotificationTimers.get(id)!);
    webNotificationTimers.delete(id);
  }
}

export async function cancelAllLocalNotifications(): Promise<void> {
  if (Capacitor.isNativePlatform()) {
    try {
      const nowMs = Date.now();
      for (const [id, exp] of recentImmediateAndroidIds.entries()) {
        if (exp <= nowMs) recentImmediateAndroidIds.delete(id);
      }
      const pending = await LocalNotifications.getPending();
      const cancellable = pending.notifications.filter(
        (n) => !recentImmediateAndroidIds.has(n.id),
      );
      if (cancellable.length > 0) {
        await LocalNotifications.cancel({
          notifications: cancellable.map((n) => ({ id: n.id })),
        });
      }
    } catch (e) {
      console.warn("Native cancel all notifications failed:", e);
    }
    return;
  }

  webNotificationTimers.forEach((timer) => clearTimeout(timer));
  webNotificationTimers.clear();
}

export async function sendTestNotification(
  rawPrefs?: Partial<NotificationPreferences>,
): Promise<boolean> {
  const prefs = sanitizeNotificationPrefs(rawPrefs);

  if (Capacitor.isNativePlatform()) {
    await ensureAndroidNotificationChannel(prefs);
    const perm = await LocalNotifications.requestPermissions();
    if (perm.display !== "granted") {
      throw new Error("Permisos de notificación denegados en el dispositivo");
    }
    recentImmediateAndroidIds.set(999999, Date.now() + 4000);
    await LocalNotifications.schedule({
      notifications: [
        {
          id: 999999,
          title: "Finance Pal — Notificación activa",
          body: "¡Tus recordatorios de pagos, ingresos y metas están listos en Android! 🎉",
          channelId: ANDROID_CHANNEL_ID,
          schedule: { at: new Date(Date.now() + 1000), allowWhileIdle: true },
          extra: { test: true, url: "/ajustes?seccion=notificaciones" },
          sound: prefs.soundEnabled ? "default" : undefined,
          smallIcon: "ic_stat_notification",
          iconColor: "#3B82F6",
        },
      ],
    });
    return true;
  }

  if (typeof window !== "undefined" && "Notification" in window) {
    let perm = Notification.permission;
    if (perm !== "granted") {
      perm = await Notification.requestPermission();
    }
    if (perm !== "granted") {
      throw new Error("Permisos de notificación denegados en el navegador");
    }
    const testNotif: ScheduledNotification = {
      id: `test_notif_${Date.now()}`,
      type: "goal_deadline_upcoming",
      entityId: "test",
      title: "Finance Pal — Notificación activa",
      body: "¡Tus recordatorios de gastos, ingresos y metas funcionan correctamente! 🎉",
      scheduledAt: new Date(),
      url: "/ajustes?seccion=notificaciones",
      payload: { test: true },
    };
    const shown = await showWebNotification(testNotif, prefs);
    if (!shown) {
      throw new Error("No se pudo mostrar la notificación en el navegador");
    }
    return true;
  }

  throw new Error("Este navegador no soporta notificaciones del sistema");
}

/* ─────────────────────────  Cálculo de Alertas de Metas  ───────────────────────── */

function buildRepeatWindowKey(repeat: NotificationRepeatFrequency, today: Date): string {
  const dayMs = startOfDay(today).getTime();
  switch (repeat) {
    case "once":
      return "once";
    case "daily":
      return toYMD(today);
    case "every_3_days":
      return `d3_${Math.floor(dayMs / (86400000 * 3))}`;
    case "weekly":
    default:
      return `w_${Math.floor(dayMs / (86400000 * 7))}`;
  }
}

export function computeGoalNotifications(
  goal: Goal,
  rawPrefs: Partial<NotificationPreferences>,
  now: Date = new Date(),
): ScheduledNotification[] {
  const prefs = sanitizeNotificationPrefs(rawPrefs);
  if (!prefs.enabled || (!prefs.localEnabled && !prefs.inAppToastEnabled)) return [];
  if (!goal || !goal.deadline) return [];
  if (goal.saved >= goal.target) return [];

  const deadline = parseGoalDeadline(goal.deadline) ?? parseDateLocal(goal.deadline);
  if (!deadline || isNaN(deadline.getTime())) return [];

  const notifications: ScheduledNotification[] = [];
  const today = startOfDay(now);
  const dlDay = startOfDay(deadline);
  const pace = paceForGoal(goal, now);
  const status = statusForGoal(goal, prefs.behindPaceTolerancePct, now);
  const remaining = Math.max(0, goal.target - goal.saved);
  const fmtAmt = (n: number) => (prefs.hideAmountsInNotifications ? "$•••" : formatCurrency(n));

  // 1. Cercanía de fecha límite (upcomingDays, incluyendo 0 = hoy)
  if (prefs.goalDeadlineReminders && prefs.upcomingDays.length > 0 && !pace?.overdue) {
    for (const daysBefore of prefs.upcomingDays) {
      const targetDay = new Date(
        dlDay.getFullYear(),
        dlDay.getMonth(),
        dlDay.getDate() - daysBefore,
        12,
        0,
        0,
      );
      if (startOfDay(targetDay) >= today) {
        const scheduledAt = applyPreferredTimeAndQuietHours(targetDay, prefs);
        const id = generateNotificationId("goal_deadline_upcoming", goal.id, `${daysBefore}d`);
        const dedupeKey = `${id}_${toYMD(targetDay)}`;
        const whenLabel =
          daysBefore === 0
            ? "vence hoy"
            : daysBefore === 1
              ? "vence mañana"
              : `Faltan ${daysBefore} días para tu meta`;

        const body =
          daysBefore <= 1
            ? `Tu meta "${goal.name}" ${whenLabel}. Te faltan ${fmtAmt(remaining)} para completarla.`
            : `${whenLabel}. Te faltan ${fmtAmt(remaining)} para completar "${goal.name}".`;

        notifications.push({
          id,
          dedupeKey,
          type: "goal_deadline_upcoming",
          entityId: goal.id,
          title: `Meta: ${goal.name}`,
          body,
          scheduledAt,
          url: "/metas",
          payload: { goalId: goal.id, daysBefore },
        });
      }
    }
  }

  // 2. Meta vencida (overdueAlert + overdueRepeat)
  if (prefs.overdueAlert && pace?.overdue && goal.saved < goal.target) {
    const winKey = buildRepeatWindowKey(prefs.overdueRepeat, today);
    const id = generateNotificationId("goal_overdue", goal.id);
    const dedupeKey = `${id}_${winKey}`;
    if (!hasNotificationBeenDelivered(dedupeKey)) {
      const scheduledAt = applyPreferredTimeAndQuietHours(today, prefs);
      notifications.push({
        id,
        dedupeKey,
        type: "goal_overdue",
        entityId: goal.id,
        title: `Meta vencida: ${goal.name}`,
        body: `La fecha límite pasó. Te faltan ${fmtAmt(remaining)} para completar la meta.`,
        scheduledAt,
        url: "/metas",
        payload: { goalId: goal.id, repeat: prefs.overdueRepeat },
      });
    }
  }

  // 3. Atraso según el plan lineal (behindPaceAlert + behindPaceRepeat + behindPaceTolerancePct)
  if (prefs.behindPaceAlert && !pace?.overdue && status?.kind === "behind" && pace) {
    const winKey = buildRepeatWindowKey(prefs.behindPaceRepeat, today);
    const id = generateNotificationId("goal_behind_pace", goal.id);
    const dedupeKey = `${id}_${winKey}`;
    if (!hasNotificationBeenDelivered(dedupeKey)) {
      const scheduledAt = applyPreferredTimeAndQuietHours(today, prefs);
      const deficit = Math.max(0, Math.round(status.ideal - status.actual));
      const perDayAmt = fmtAmt(Math.ceil(pace.perDay));
      notifications.push({
        id,
        dedupeKey,
        type: "goal_behind_pace",
        entityId: goal.id,
        title: `Te estás atrasando: ${goal.name}`,
        body: `Vas ${fmtAmt(deficit)} por debajo del plan. Necesitas ahorrar ${perDayAmt}/día para llegar a tiempo.`,
        scheduledAt,
        url: "/metas",
        payload: {
          goalId: goal.id,
          deficit,
          perDay: pace.perDay,
          repeat: prefs.behindPaceRepeat,
        },
      });
    }
  }

  return notifications;
}

/* ─────────────────────────  Cálculo de Conceptos Fijos / Recurrentes  ───────────────────────── */

export function computeFixedItemNotifications(
  item: FixedItem,
  rawPrefs: Partial<NotificationPreferences>,
  transactions: Transaction[] = [],
  now: Date = new Date(),
): ScheduledNotification[] {
  const prefs = sanitizeNotificationPrefs(rawPrefs);
  if (!prefs.enabled || (!prefs.localEnabled && !prefs.inAppToastEnabled) || !prefs.fixedItemReminders) {
    return [];
  }
  if (!item || !item.active) return [];

  // Filtrar por tipo configurado por el usuario
  if (
    (item.type === "expense_fixed" || item.type === "expense_variable") &&
    !prefs.notifyFixedExpenses
  ) {
    return [];
  }
  if (item.type === "income_fixed" && !prefs.notifyFixedIncomes) {
    return [];
  }
  if (item.type === "saving_fixed" && !prefs.notifyFixedSavings) {
    return [];
  }

  const today = startOfDay(now);
  const maxDaysBefore =
    prefs.fixedUpcomingDays.length > 0 ? Math.max(0, ...prefs.fixedUpcomingDays) : 0;
  const minOccurrences =
    item.frequency === "weekly"
      ? Math.max(2, Math.ceil(maxDaysBefore / 7) + 2)
      : item.frequency === "biweekly"
        ? Math.max(2, Math.ceil(maxDaysBefore / 14) + 2)
        : Math.max(2, Math.ceil(maxDaysBefore / 28) + 2);

  const occurrences = getUpcomingOccurrencesForFixedItem(
    item,
    transactions,
    now,
    minOccurrences,
  );
  if (occurrences.length === 0) return [];

  const fmtAmt = (n: number) => (prefs.hideAmountsInNotifications ? "$•••" : formatCurrency(n));
  const kindLabel =
    item.type === "income_fixed"
      ? "Ingreso"
      : item.type === "saving_fixed"
        ? "Ahorro"
        : "Gasto";

  const titlePrefix =
    item.type === "income_fixed"
      ? "Ingreso próximo"
      : item.type === "saving_fixed"
        ? "Ahorro programado"
        : "Pago próximo";

  const notifications: ScheduledNotification[] = [];

  for (const occ of occurrences) {
    // Si ya fue registrado manualmente, omitir esa ocurrencia pero conservar el siguiente ciclo
    if (occ.alreadyRecorded && prefs.skipIfAlreadyRecorded && !occ.autoRecordedToday) {
      continue;
    }

    for (const daysBefore of prefs.fixedUpcomingDays) {
      const triggerDay = new Date(
        occ.dueDate.getFullYear(),
        occ.dueDate.getMonth(),
        occ.dueDate.getDate() - daysBefore,
        12,
        0,
        0,
      );
      if (startOfDay(triggerDay) < today) {
        continue;
      }

      const scheduledAt = applyPreferredTimeAndQuietHours(triggerDay, prefs);
      const id = generateNotificationId("fixed_item_due", item.id, `${occ.dueISO}_${daysBefore}d`);
      const dedupeKey = id;
      const whenLabel =
        daysBefore === 0
          ? "hoy"
          : daysBefore === 1
            ? "mañana"
            : `en ${daysBefore} días`;

      notifications.push({
        id,
        dedupeKey,
        type: "fixed_item_due",
        entityId: item.id,
        title: `${titlePrefix}: ${item.concept}`,
        body: `${kindLabel} de ${fmtAmt(item.amount)} ${whenLabel}.`,
        scheduledAt,
        url: "/ajustes?seccion=fijos",
        payload: {
          fixedItemId: item.id,
          dueISO: occ.dueISO,
          daysBefore,
          frequency: item.frequency,
        },
      });
    }
  }

  return notifications;
}

/* ─────────────────────────  Orquestador Principal  ───────────────────────── */

async function executeScheduleAllNotifications(
  goals: Goal[],
  fixedItems: FixedItem[],
  rawPrefs: Partial<NotificationPreferences>,
  transactions: Transaction[] = [],
  now: Date = new Date(),
): Promise<ScheduledNotification[]> {
  await cancelAllLocalNotifications();

  const prefs = sanitizeNotificationPrefs(rawPrefs);
  if (!prefs.enabled || (!prefs.localEnabled && !prefs.inAppToastEnabled)) {
    return [];
  }

  const allNotifications: ScheduledNotification[] = [];

  for (const goal of goals) {
    allNotifications.push(...computeGoalNotifications(goal, prefs, now));
  }

  for (const item of fixedItems) {
    allNotifications.push(...computeFixedItemNotifications(item, prefs, transactions, now));
  }

  const nowMs = now.getTime();

  for (const notif of allNotifications) {
    const key = notif.dedupeKey || notif.id;
    if (hasNotificationBeenDelivered(key)) {
      continue;
    }

    try {
      if (notif.scheduledAt.getTime() <= nowMs) {
        // La hora programada de hoy ya llegó o pasó
        if (isDateInQuietHours(now, prefs)) {
          // Posponer al fin del horario silencioso actual sin perder la alerta
          const postponedAt = applyPreferredTimeAndQuietHours(now, prefs, true);
          await scheduleLocalNotification({ ...notif, scheduledAt: postponedAt }, prefs);
        } else if (Capacitor.isNativePlatform()) {
          let delivered = false;
          if (prefs.localEnabled) {
            const { display } = await LocalNotifications.checkPermissions();
            if (display === "granted") {
              await scheduleLocalNotification(
                { ...notif, scheduledAt: new Date(Date.now() + 1500) },
                prefs,
              );
              delivered = true;
            }
          }
          if (prefs.inAppToastEnabled) {
            const toastShown = showInAppToastNotification(notif, prefs);
            delivered = delivered || toastShown;
          }
          if (delivered) {
            markNotificationDelivered(key, now);
          }
        } else {
          const osShown = prefs.localEnabled
            ? await showWebNotification(notif, prefs)
            : false;
          const toastShown = prefs.inAppToastEnabled
            ? showInAppToastNotification(notif, prefs)
            : false;
          if (osShown || toastShown) {
            markNotificationDelivered(key, now);
          }
        }
      } else {
        await scheduleLocalNotification(notif, prefs);
      }
    } catch (e) {
      console.warn("Failed to schedule notification:", notif.id, e);
    }
  }

  return allNotifications;
}

export async function scheduleAllNotifications(
  goals: Goal[],
  fixedItems: FixedItem[],
  rawPrefs: Partial<NotificationPreferences>,
  transactions: Transaction[] = [],
  now: Date = new Date(),
): Promise<ScheduledNotification[]> {
  const nextRun = scheduleQueuePromise
    .catch(() => {})
    .then(() => executeScheduleAllNotifications(goals, fixedItems, rawPrefs, transactions, now));
  scheduleQueuePromise = nextRun;
  return nextRun;
}

export function formatCurrency(n: number): string {
  return n.toLocaleString("es-MX", {
    style: "currency",
    currency: "MXN",
    maximumFractionDigits: 0,
  });
}
