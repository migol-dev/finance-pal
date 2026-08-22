import { LocalNotifications, PermissionStatus } from "@capacitor/local-notifications";
import { PushNotifications, PushNotificationSchema, Token } from "@capacitor/push-notifications";
import { Capacitor } from "@capacitor/core";
import { Goal, FixedItem } from "./finance";
import { startOfDay, parseDateLocal, daysBetween } from "./finance";

export interface NotificationPreferences {
  enabled: boolean;
  pushEnabled: boolean;
  localEnabled: boolean;
  upcomingDays: number[];        // e.g., [7, 3, 1]
  overdueAlert: boolean;
  behindPaceAlert: boolean;
  fixedItemReminders: boolean;
  quietHours: { start: string; end: string }; // "22:00" - "08:00"
}

export const DEFAULT_NOTIFICATION_PREFS: NotificationPreferences = {
  enabled: true,
  pushEnabled: true,
  localEnabled: true,
  upcomingDays: [7, 3, 1],
  overdueAlert: true,
  behindPaceAlert: true,
  fixedItemReminders: true,
  quietHours: { start: "22:00", end: "08:00" },
};

type NotificationType = 
  | "goal_deadline_upcoming" 
  | "goal_overdue" 
  | "goal_behind_pace" 
  | "fixed_item_due";

interface ScheduledNotification {
  id: string;
  type: NotificationType;
  entityId: string;
  title: string;
  body: string;
  scheduledAt: Date;
  payload?: Record<string, any>;
}

function isQuietHours(prefs: NotificationPreferences): boolean {
  const now = new Date();
  const [startH, startM] = prefs.quietHours.start.split(":").map(Number);
  const [endH, endM] = prefs.quietHours.end.split(":").map(Number);
  
  const start = new Date(now);
  start.setHours(startH, startM, 0, 0);
  
  const end = new Date(now);
  end.setHours(endH, endM, 0, 0);
  
  if (start <= end) {
    return now >= start && now <= end;
  } else {
    // Crosses midnight
    return now >= start || now <= end;
  }
}

function generateNotificationId(type: NotificationType, entityId: string, extra?: string): string {
  const base = `${type}_${entityId}`;
  return extra ? `${base}_${extra}` : base;
}

export async function requestNotificationPermissions(): Promise<PermissionStatus> {
  if (!Capacitor.isNativePlatform()) {
    // On web, just return granted (browser handles permission)
    return { display: "granted", badge: "granted", alert: "granted" };
  }
  
  const localPerm = await LocalNotifications.requestPermissions();
  const pushPerm = await PushNotifications.requestPermissions();
  
  return {
    display: localPerm.display === "granted" && pushPerm.receive === "granted" ? "granted" : "denied",
    badge: localPerm.badge,
    alert: localPerm.alert,
  };
}

export async function registerPushNotifications(): Promise<string | null> {
  if (!Capacitor.isNativePlatform()) return null;
  
  try {
    const perm = await PushNotifications.requestPermissions();
    if (perm.receive !== "granted") return null;
    
    await PushNotifications.register();
    return null; // Token will come via listener
  } catch (e) {
    console.warn("Push registration failed:", e);
    return null;
  }
}

export function setupPushListeners(
  onToken: (token: string) => void,
  onNotification: (notification: PushNotificationSchema) => void
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

export async function scheduleLocalNotification(notification: ScheduledNotification): Promise<void> {
  if (!Capacitor.isNativePlatform()) return;
  
  const { display } = await LocalNotifications.checkPermissions();
  if (display !== "granted") return;
  
  await LocalNotifications.schedule({
    notifications: [
      {
        id: Math.abs(hashCode(notification.id)),
        title: notification.title,
        body: notification.body,
        schedule: { at: notification.scheduledAt },
        extra: { ...notification.payload, type: notification.type, entityId: notification.entityId },
        sound: "default",
        smallIcon: "ic_notification",
        iconColor: "#3B82F6",
      }
    ]
  });
}

export async function cancelLocalNotification(id: string): Promise<void> {
  if (!Capacitor.isNativePlatform()) return;
  await LocalNotifications.cancel({ notifications: [{ id: Math.abs(hashCode(id)) }] });
}

export async function cancelAllLocalNotifications(): Promise<void> {
  if (!Capacitor.isNativePlatform()) return;
  const pending = await LocalNotifications.getPending();
  if (pending.notifications.length > 0) {
    await LocalNotifications.cancel({ notifications: pending.notifications.map(n => ({ id: n.id })) });
  }
}

function hashCode(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return hash;
}

// --- Goal Notifications ---

function paceFor(goal: Goal) {
  if (!goal.deadline) return null;
  const remaining = Math.max(0, goal.target - goal.saved);
  const today = startOfDay(new Date());
  const dl = startOfDay(new Date(`${goal.deadline}T12:00:00`));
  const days = Math.max(1, Math.round((dl.getTime() - today.getTime()) / 86400000) || 1);
  return { remaining, days, perDay: remaining / days, overdue: dl < today };
}

function statusFor(goal: Goal) {
  if (!goal.deadline) return null;
  const today = new Date();
  // Simplified status check
  const pace = paceFor(goal);
  if (!pace) return null;
  if (goal.saved >= goal.target) return { kind: "done" as const };
  if (pace.overdue) return { kind: "behind" as const };
  // Check if behind pace (simplified)
  const expectedByNow = (goal.target / Math.max(1, pace.days + 1)) * (pace.days + 1); // rough
  if (goal.saved < expectedByNow * 0.9) return { kind: "behind" as const };
  return { kind: "ontrack" as const };
}

export function computeGoalNotifications(
  goal: Goal, 
  prefs: NotificationPreferences
): ScheduledNotification[] {
  if (!prefs.enabled || !prefs.localEnabled) return [];
  if (!goal.deadline) return [];
  if (isQuietHours(prefs)) return [];
  
  const notifications: ScheduledNotification[] = [];
  const deadline = parseDateLocal(goal.deadline);
  const today = startOfDay(new Date());
  const pace = paceFor(goal);
  const status = statusFor(goal);
  
  // Upcoming deadline notifications
  if (prefs.upcomingDays.length > 0) {
    for (const daysBefore of prefs.upcomingDays) {
      const notifyDate = new Date(deadline);
      notifyDate.setDate(notifyDate.getDate() - daysBefore);
      notifyDate.setHours(10, 0, 0, 0); // 10 AM
      
      if (notifyDate > today && !pace?.overdue) {
        notifications.push({
          id: generateNotificationId("goal_deadline_upcoming", goal.id, `${daysBefore}d`),
          type: "goal_deadline_upcoming",
          entityId: goal.id,
          title: `Meta: ${goal.name}`,
          body: `Faltan ${daysBefore} día${daysBefore === 1 ? "" : "s"} para tu meta. Te faltan ${formatCurrency(pace?.remaining ?? goal.target - goal.saved)}.`,
          scheduledAt: notifyDate,
          payload: { goalId: goal.id, daysBefore },
        });
      }
    }
  }
  
  // Overdue notification
  if (prefs.overdueAlert && pace?.overdue && goal.saved < goal.target) {
    const notifyDate = new Date(today);
    notifyDate.setHours(10, 0, 0, 0);
    
    notifications.push({
      id: generateNotificationId("goal_overdue", goal.id),
      type: "goal_overdue",
      entityId: goal.id,
      title: `Meta vencida: ${goal.name}`,
      body: `La fecha límite pasó. Te faltan ${formatCurrency(goal.target - goal.saved)} para completar la meta.`,
      scheduledAt: notifyDate,
      payload: { goalId: goal.id },
    });
  }
  
  // Behind pace notification (once per week)
  if (prefs.behindPaceAlert && status?.kind === "behind" && pace) {
    const notifyDate = new Date(today);
    notifyDate.setHours(19, 0, 0, 0); // 7 PM
    
    notifications.push({
      id: generateNotificationId("goal_behind_pace", goal.id),
      type: "goal_behind_pace",
      entityId: goal.id,
      title: `Te estás atrasando: ${goal.name}`,
      body: `Vas ${formatCurrency(Math.abs(pace.remaining))} por debajo del ritmo. Necesitas ${formatCurrency(pace.perDay)}/día para llegar a tiempo.`,
      scheduledAt: notifyDate,
      payload: { goalId: goal.id },
    });
  }
  
  return notifications;
}

// --- Fixed Item Notifications ---

export function computeFixedItemNotifications(
  item: FixedItem,
  prefs: NotificationPreferences
): ScheduledNotification[] {
  if (!prefs.enabled || !prefs.localEnabled || !prefs.fixedItemReminders) return [];
  if (!item.active) return [];
  if (isQuietHours(prefs)) return [];
  
  const notifications: ScheduledNotification[] = [];
  const today = startOfDay(new Date());
  
  // Check if item is due in the next 3 days
  if (item.frequency === "monthly" && typeof item.payDay === "number") {
    const dueDate = new Date(today.getFullYear(), today.getMonth(), item.payDay);
    if (dueDate < today) dueDate.setMonth(dueDate.getMonth() + 1);
    
    const daysUntil = Math.round((dueDate.getTime() - today.getTime()) / 86400000);
    if (daysUntil >= 0 && daysUntil <= 3) {
      const notifyDate = new Date(dueDate);
      notifyDate.setHours(10, 0, 0, 0);
      if (notifyDate < today) notifyDate.setDate(notifyDate.getDate() + 1); // tomorrow if already passed today
      
      notifications.push({
        id: generateNotificationId("fixed_item_due", item.id),
        type: "fixed_item_due",
        entityId: item.id,
        title: `Pago próximo: ${item.concept}`,
        body: `${item.type === "income_fixed" ? "Ingreso" : "Gasto"} de ${formatCurrency(item.amount)} ${daysUntil === 0 ? "hoy" : "en " + daysUntil + " día" + (daysUntil === 1 ? "" : "s")}`,
        scheduledAt: notifyDate,
        payload: { fixedItemId: item.id },
      });
    }
  }
  
  if (item.frequency === "weekly" && typeof item.payWeekDay === "number") {
    const daysUntil = (item.payWeekDay - today.getDay() + 7) % 7;
    if (daysUntil >= 0 && daysUntil <= 3) {
      const notifyDate = new Date(today);
      notifyDate.setDate(notifyDate.getDate() + daysUntil);
      notifyDate.setHours(10, 0, 0, 0);
      
      notifications.push({
        id: generateNotificationId("fixed_item_due", item.id),
        type: "fixed_item_due",
        entityId: item.id,
        title: `Pago semanal: ${item.concept}`,
        body: `${item.type === "income_fixed" ? "Ingreso" : "Gasto"} de ${formatCurrency(item.amount)} ${daysUntil === 0 ? "hoy" : "en " + daysUntil + " día" + (daysUntil === 1 ? "" : "s")}`,
        scheduledAt: notifyDate,
        payload: { fixedItemId: item.id },
      });
    }
  }
  
  return notifications;
}

// --- Main Scheduler ---

export async function scheduleAllNotifications(
  goals: Goal[],
  fixedItems: FixedItem[],
  prefs: NotificationPreferences
): Promise<void> {
  // Cancel existing
  await cancelAllLocalNotifications();
  
  // Schedule new
  const allNotifications: ScheduledNotification[] = [];
  
  for (const goal of goals) {
    allNotifications.push(...computeGoalNotifications(goal, prefs));
  }
  
  for (const item of fixedItems) {
    allNotifications.push(...computeFixedItemNotifications(item, prefs));
  }
  
  // Schedule in batches to avoid overload
  for (const notif of allNotifications) {
    try {
      await scheduleLocalNotification(notif);
    } catch (e) {
      console.warn("Failed to schedule notification:", notif.id, e);
    }
  }
}

export function formatCurrency(n: number): string {
  return n.toLocaleString("es-MX", { style: "currency", currency: "MXN", maximumFractionDigits: 0 });
}