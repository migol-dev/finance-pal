/* eslint-disable @typescript-eslint/ban-ts-comment */
// @ts-nocheck
// Supabase Edge Function: send-reminders
// Dispara recordatorios diarios autónomos de Metas y Conceptos Fijos a través de Web Push
// Respetando el 100% de las preferencias granulares por usuario (notification_prefs)

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import webpush from "npm:web-push@3.6.7";

const allowedOrigin = Deno.env.get("ALLOWED_ORIGIN") || "*";
const corsHeaders = {
  "Access-Control-Allow-Origin": allowedOrigin,
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-function-secret",
};

// Rate limiting in-memory store
const rateLimit = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT_MAX = 5;
const RATE_LIMIT_WINDOW_MS = 60000;

const DEFAULT_PREFS = {
  enabled: true,
  pushEnabled: true,
  localEnabled: true,
  inAppToastEnabled: true,
  goalDeadlineReminders: true,
  upcomingDays: [7, 3, 1, 0],
  overdueAlert: true,
  overdueRepeat: "every_3_days",
  behindPaceAlert: true,
  behindPaceRepeat: "weekly",
  behindPaceTolerancePct: 2,
  fixedItemReminders: true,
  notifyFixedExpenses: true,
  notifyFixedIncomes: true,
  notifyFixedSavings: true,
  fixedUpcomingDays: [3, 1, 0],
  skipIfAlreadyRecorded: true,
  preferredTime: "09:00",
  quietHoursEnabled: true,
  quietHours: { start: "22:00", end: "08:00" },
  soundEnabled: true,
  vibrationEnabled: true,
  hideAmountsInNotifications: false,
};

function mergePrefs(raw: any) {
  if (!raw || typeof raw !== "object") return { ...DEFAULT_PREFS };
  return {
    ...DEFAULT_PREFS,
    ...raw,
    upcomingDays: Array.isArray(raw.upcomingDays) ? raw.upcomingDays : DEFAULT_PREFS.upcomingDays,
    fixedUpcomingDays: Array.isArray(raw.fixedUpcomingDays)
      ? raw.fixedUpcomingDays
      : DEFAULT_PREFS.fixedUpcomingDays,
    quietHours:
      raw.quietHours && typeof raw.quietHours === "object"
        ? { ...DEFAULT_PREFS.quietHours, ...raw.quietHours }
        : DEFAULT_PREFS.quietHours,
  };
}

function startOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function parseDateSafe(d: string | Date | null | undefined): Date | null {
  if (!d) return null;
  if (d instanceof Date) return isNaN(d.getTime()) ? null : d;
  const clean = String(d).slice(0, 10);
  const m = clean.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (m) return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]), 12, 0, 0);
  const fallback = new Date(d);
  return isNaN(fallback.getTime()) ? null : fallback;
}

function toYMD(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function daysBetween(a: Date, b: Date): number {
  return Math.round((startOfDay(b).getTime() - startOfDay(a).getTime()) / 86400000);
}

function parseTimeHHMM(value: string | undefined, fallbackH: number, fallbackM: number): [number, number] {
  if (!value || typeof value !== "string") return [fallbackH, fallbackM];
  const m = value.match(/^([01]\d|2[0-3]):([0-5]\d)$/);
  if (!m) return [fallbackH, fallbackM];
  return [Number(m[1]), Number(m[2])];
}

function isDateInQuietHours(date: Date, prefs: any): boolean {
  if (!prefs?.quietHoursEnabled) return false;
  const [startH, startM] = parseTimeHHMM(prefs.quietHours?.start, 22, 0);
  const [endH, endM] = parseTimeHHMM(prefs.quietHours?.end, 8, 0);
  const startMins = startH * 60 + startM;
  const endMins = endH * 60 + endM;
  if (startMins === endMins) return false;
  const currentMins = date.getHours() * 60 + date.getMinutes();
  if (startMins < endMins) {
    return currentMins >= startMins && currentMins < endMins;
  }
  return currentMins >= startMins || currentMins < endMins;
}

function shouldTriggerRepeat(repeat: string, daysSinceRef: number): boolean {
  if (daysSinceRef < 0) return false;
  if (repeat === "once") return daysSinceRef === 0 || daysSinceRef === 1;
  if (repeat === "daily") return true;
  if (repeat === "every_3_days") return daysSinceRef % 3 === 0;
  // weekly
  return daysSinceRef % 7 === 0;
}

function isFixedActiveInMonth(item: any, year: number, month: number): boolean {
  if (!item.active) return false;
  const start = parseDateSafe(item.start_date) ?? new Date(year, 0, 1);
  const end = parseDateSafe(item.end_date) ?? new Date(year + 5, 11, 31);
  const monthStart = new Date(year, month, 1);
  const monthEnd = new Date(year, month + 1, 0, 23, 59, 59);
  if (end < monthStart || start > monthEnd) return false;
  const freq = item.frequency === "annual" ? "yearly" : item.frequency;
  if (freq === "yearly") return start.getMonth() === month;
  if (freq === "one_time") return start.getFullYear() === year && start.getMonth() === month;
  const monthsSinceStart = (year - start.getFullYear()) * 12 + (month - start.getMonth());
  if (monthsSinceStart < 0) return false;
  if (freq === "bimonthly") return monthsSinceStart % 2 === 0;
  if (freq === "quarterly") return monthsSinceStart % 3 === 0;
  if (freq === "fourmonthly") return monthsSinceStart % 4 === 0;
  if (freq === "biannual") return monthsSinceStart % 6 === 0;
  return true;
}

function getNextFixedDueDates(item: any, today: Date, maxDaysBefore: number = 7): Date[] {
  const start = parseDateSafe(item.start_date) ?? today;
  const end = parseDateSafe(item.end_date) ?? new Date(today.getFullYear() + 5, 11, 31);
  const todayDay = startOfDay(today);
  const startDay = startOfDay(start);
  const endDay = startOfDay(end);
  const todayISO = toYMD(todayDay);
  const startISO = toYMD(startDay);
  const endISO = toYMD(endDay);
  if (todayISO > endISO) return [];

  const freq = item.frequency === "annual" ? "yearly" : item.frequency;
  const dates: Date[] = [];

  if (freq === "weekly") {
    const payWeekDay =
      typeof item.pay_week_day === "number" ? ((item.pay_week_day % 7) + 7) % 7 : startDay.getDay();
    const base = todayDay > startDay ? todayDay : startDay;
    const daysUntil = (payWeekDay - base.getDay() + 7) % 7;
    const first = new Date(base.getFullYear(), base.getMonth(), base.getDate() + daysUntil, 12, 0, 0);
    const maxWeeks = Math.max(3, Math.ceil(maxDaysBefore / 7) + 2);
    for (let w = 0; w < maxWeeks; w++) {
      const cand = new Date(first.getFullYear(), first.getMonth(), first.getDate() + w * 7, 12, 0, 0);
      const iso = toYMD(cand);
      if (iso >= todayISO && iso >= startISO && iso <= endISO) dates.push(cand);
    }
    return dates;
  }

  if (freq === "biweekly") {
    const maxMonths = Math.max(3, Math.ceil(maxDaysBefore / 28) + 2);
    const maxCount = Math.max(2, Math.ceil(maxDaysBefore / 14) + 2);
    for (let offset = 0; offset < maxMonths; offset++) {
      const mDate = new Date(todayDay.getFullYear(), todayDay.getMonth() + offset, 1);
      const y = mDate.getFullYear();
      const m = mDate.getMonth();
      if (!isFixedActiveInMonth(item, y, m)) continue;
      const daysInM = new Date(y, m + 1, 0).getDate();
      const rawPayDay = typeof item.pay_day === "number" ? item.pay_day : 1;
      const baseDay = Math.min(Math.max(1, rawPayDay), daysInM);
      const d1 = baseDay <= 15 ? baseDay : Math.max(1, baseDay - 15);
      const d2 = Math.min(d1 + 15, daysInM);
      for (const d of Array.from(new Set([d1, d2])).sort((a, b) => a - b)) {
        const cand = new Date(y, m, d, 12, 0, 0);
        const iso = toYMD(cand);
        if (iso >= todayISO && iso >= startISO && iso <= endISO) dates.push(cand);
      }
    }
    return dates.slice(0, maxCount);
  }

  const maxCount = Math.max(2, Math.ceil(maxDaysBefore / 28) + 2);
  for (let offset = 0; offset < 24 && dates.length < maxCount; offset++) {
    const mDate = new Date(todayDay.getFullYear(), todayDay.getMonth() + offset, 1);
    const y = mDate.getFullYear();
    const m = mDate.getMonth();
    if (!isFixedActiveInMonth(item, y, m)) continue;
    const daysInM = new Date(y, m + 1, 0).getDate();
    const rawPayDay = typeof item.pay_day === "number" ? item.pay_day : startDay.getDate();
    const effDay = Math.min(Math.max(1, rawPayDay), daysInM);
    const cand = new Date(y, m, effDay, 12, 0, 0);
    const iso = toYMD(cand);
    if (iso >= todayISO && iso <= endISO) dates.push(cand);
  }

  return dates;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  // Rate Limiting Logic
  const ip = req.headers.get("x-forwarded-for") || "unknown-ip";
  const now = Date.now();
  const clientLimit = rateLimit.get(ip);
  if (clientLimit && clientLimit.resetTime > now) {
    if (clientLimit.count >= RATE_LIMIT_MAX) {
      return new Response(JSON.stringify({ error: "Too many requests" }), {
        status: 429,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    clientLimit.count++;
  } else {
    rateLimit.set(ip, { count: 1, resetTime: now + RATE_LIMIT_WINDOW_MS });
  }

  try {
    const FUNCTION_SECRET = Deno.env.get("FUNCTION_SECRET");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const secretHeader = req.headers.get("x-function-secret");
    const bearerToken = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "");

    // SEC-003: Permitir tanto FUNCTION_SECRET como SUPABASE_SERVICE_ROLE_KEY (usado por pg_cron)
    const isAuthorizedBySecret = Boolean(
      FUNCTION_SECRET && (secretHeader === FUNCTION_SECRET || bearerToken === FUNCTION_SECRET),
    );
    const isAuthorizedByServiceRole = Boolean(
      supabaseServiceKey && bearerToken === supabaseServiceKey,
    );

    if (!isAuthorizedBySecret && !isAuthorizedByServiceRole) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const vapidPublicKey = Deno.env.get("VAPID_PUBLIC_KEY");
    const vapidPrivateKey = Deno.env.get("VAPID_PRIVATE_KEY");
    const vapidSubject = Deno.env.get("VAPID_SUBJECT") || "mailto:soporte@financepal.com";

    if (!vapidPublicKey || !vapidPrivateKey) {
      throw new Error("VAPID_PUBLIC_KEY or VAPID_PRIVATE_KEY is not set in environment secrets.");
    }

    webpush.setVapidDetails(vapidSubject, vapidPublicKey, vapidPrivateKey);

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // 1. Obtener todas las suscripciones push agrupadas por usuario
    const { data: subscriptions, error: subError } = await supabase
      .from("push_subscriptions")
      .select("*");

    if (subError) throw subError;
    if (!subscriptions || subscriptions.length === 0) {
      return new Response(
        JSON.stringify({ message: "No active push subscriptions found", sent: 0 }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        },
      );
    }

    const userSubsMap = new Map<string, any[]>();
    for (const sub of subscriptions) {
      if (!userSubsMap.has(sub.user_id)) userSubsMap.set(sub.user_id, []);
      userSubsMap.get(sub.user_id)!.push(sub);
    }

    const nowDate = new Date();
    const today = startOfDay(nowDate);
    const todayISO = toYMD(today);
    let totalSent = 0;
    let totalFailed = 0;
    const deadSubIds: string[] = [];

    // 2. Procesar recordatorios para cada usuario suscrito respetando sus preferencias
    for (const [userId, userSubs] of userSubsMap.entries()) {
      const { data: settingsRow } = await supabase
        .from("user_settings")
        .select("notification_prefs")
        .eq("user_id", userId)
        .maybeSingle();

      const prefs = mergePrefs(settingsRow?.notification_prefs);
      if (!prefs.enabled || !prefs.pushEnabled) {
        continue;
      }
      if (isDateInQuietHours(nowDate, prefs)) {
        continue;
      }

      const fmtAmt = (n: number) =>
        prefs.hideAmountsInNotifications ? "$•••" : `$${Math.round(n).toLocaleString("es-MX")}`;

      const notificationsToSend: { title: string; body: string; url: string; tag: string }[] = [];

      // A) Consultar metas del usuario
      const { data: goals } = await supabase
        .from("goals")
        .select("id, name, target, saved, deadline, created_at")
        .eq("user_id", userId);

      if (goals) {
        for (const g of goals) {
          if (!g.deadline || g.saved >= g.target) continue;
          const dlDate = parseDateSafe(g.deadline);
          if (!dlDate) continue;
          const dlDay = startOfDay(dlDate);
          const diffDays = daysBetween(today, dlDay);
          const remaining = Math.max(0, Number(g.target) - Number(g.saved));

          // 1) Cercanía de fecha límite
          if (
            prefs.goalDeadlineReminders &&
            diffDays >= 0 &&
            prefs.upcomingDays.includes(diffDays)
          ) {
            notificationsToSend.push({
              title: diffDays === 0 ? `¡Meta vence hoy!: ${g.name}` : `Meta próxima: ${g.name}`,
              body:
                diffDays === 0
                  ? `Hoy es la fecha límite para completar "${g.name}". Te faltan ${fmtAmt(remaining)}.`
                  : `Faltan ${diffDays} día(s) para tu fecha límite. Te faltan ${fmtAmt(remaining)}.`,
              url: "/metas",
              tag: `goal_deadline_upcoming_${g.id}_${diffDays}d`,
            });
          }

          // 2) Meta vencida
          if (prefs.overdueAlert && diffDays < 0) {
            const daysOverdue = Math.abs(diffDays);
            if (shouldTriggerRepeat(prefs.overdueRepeat, daysOverdue)) {
              notificationsToSend.push({
                title: `Meta vencida: ${g.name}`,
                body: `La fecha límite ya pasó. Aún te faltan ${fmtAmt(remaining)} para lograrla.`,
                url: "/metas",
                tag: `goal_overdue_${g.id}_${toYMD(today)}`,
              });
            }
          }

          // 3) Meta atrasada según el plan lineal (cuando tiene fecha límite futura)
          if (prefs.behindPaceAlert && diffDays > 0) {
            const createdDate = parseDateSafe(g.created_at) ?? today;
            const startDay = startOfDay(createdDate);
            const totalDays = Math.max(1, daysBetween(startDay, dlDay));
            const elapsedDays = Math.min(totalDays, Math.max(0, daysBetween(startDay, today)));
            const targetAmt = Math.max(1, Number(g.target) || 1);
            const ideal = (targetAmt * elapsedDays) / totalDays;
            const actual = Number(g.saved) || 0;
            const diff = actual - ideal;
            const tolerance = Math.max(
              50,
              targetAmt * ((Number(prefs.behindPaceTolerancePct) || 2) / 100),
            );

            if (diff < -tolerance) {
              const firstBehindDay = Math.max(
                1,
                Math.floor(((actual + tolerance) * totalDays) / targetAmt) + 1,
              );
              const daysBehind = Math.max(0, elapsedDays - firstBehindDay);
              if (shouldTriggerRepeat(prefs.behindPaceRepeat, daysBehind)) {
                const deficit = Math.max(0, Math.round(ideal - actual));
                const perDay = Math.ceil(remaining / Math.max(1, diffDays));
                notificationsToSend.push({
                  title: `Te estás atrasando: ${g.name}`,
                  body: `Vas ${fmtAmt(deficit)} por debajo del plan. Necesitas ahorrar ${fmtAmt(perDay)}/día para llegar a tiempo.`,
                  url: "/metas",
                  tag: `goal_behind_pace_${g.id}_${toYMD(today)}`,
                });
              }
            }
          }
        }
      }

      // B) Consultar conceptos fijos / recurrentes del usuario (9 frecuencias)
      if (prefs.fixedItemReminders) {
        const [{ data: fixedItems }, { data: recentTxs }] = await Promise.all([
          supabase
            .from("fixed_items")
            .select(
              "id, concept, amount, type, frequency, pay_day, pay_week_day, start_date, end_date, active",
            )
            .eq("user_id", userId)
            .eq("active", true),
          supabase
            .from("transactions")
            .select("id, fixed_id, date")
            .eq("user_id", userId)
            .not("fixed_id", "is", null),
        ]);

        const maxDaysBefore =
          Array.isArray(prefs.fixedUpcomingDays) && prefs.fixedUpcomingDays.length > 0
            ? Math.max(0, ...prefs.fixedUpcomingDays)
            : 7;

        if (fixedItems) {
          for (const item of fixedItems) {
            if (
              (item.type === "expense_fixed" || item.type === "expense_variable") &&
              !prefs.notifyFixedExpenses
            ) {
              continue;
            }
            if (item.type === "income_fixed" && !prefs.notifyFixedIncomes) continue;
            if (item.type === "saving_fixed" && !prefs.notifyFixedSavings) continue;

            const typeLabel =
              item.type === "income_fixed"
                ? "Ingreso"
                : item.type === "saving_fixed"
                  ? "Ahorro"
                  : "Gasto";
            const amountStr = fmtAmt(Number(item.amount) || 0);
            const freq = item.frequency === "annual" ? "yearly" : item.frequency;
            const isSinglePerMonthFreq = [
              "monthly",
              "bimonthly",
              "quarterly",
              "fourmonthly",
              "biannual",
              "yearly",
              "one_time",
            ].includes(freq);
            const dueDates = getNextFixedDueDates(item, today, maxDaysBefore);

            for (const dueDate of dueDates) {
              const dueISO = toYMD(dueDate);
              const daysUntil = daysBetween(today, dueDate);
              if (!prefs.fixedUpcomingDays.includes(daysUntil)) continue;

              const scheduledId = `scheduled-${item.id}-${dueISO}`;
              const autoRecordedToday =
                dueISO === todayISO &&
                Array.isArray(recentTxs) &&
                recentTxs.some((t: any) => t.id === scheduledId);

              if (prefs.skipIfAlreadyRecorded && !autoRecordedToday && Array.isArray(recentTxs)) {
                const recorded = recentTxs.some((t: any) => {
                  if (t.id === scheduledId) return true;
                  if (t.fixed_id !== item.id) return false;
                  const td = parseDateSafe(t.date);
                  if (!td) return false;
                  if (toYMD(td) === dueISO) return true;
                  if (
                    isSinglePerMonthFreq &&
                    td.getFullYear() === dueDate.getFullYear() &&
                    td.getMonth() === dueDate.getMonth()
                  ) {
                    return true;
                  }
                  return false;
                });
                if (recorded) continue;
              }

              notificationsToSend.push({
                title:
                  daysUntil === 0
                    ? `${typeLabel} programado para hoy: ${item.concept}`
                    : `${typeLabel} próximo: ${item.concept}`,
                body:
                  daysUntil === 0
                    ? `${typeLabel} recurrente de ${amountStr} programado para hoy.`
                    : `${typeLabel} recurrente de ${amountStr} ${daysUntil === 1 ? "mañana" : `en ${daysUntil} días`}.`,
                url: "/ajustes?seccion=fijos",
                tag: `fixed_item_due_${item.id}_${dueISO}_${daysUntil}d`,
              });
            }
          }
        }
      }

      // C) Enviar las notificaciones a los dispositivos del usuario
      for (const notif of notificationsToSend) {
        for (const sub of userSubs) {
          const pushSubscription = {
            endpoint: sub.endpoint,
            keys: {
              p256dh: sub.p256dh,
              auth: sub.auth,
            },
          };

          try {
            await webpush.sendNotification(
              pushSubscription,
              JSON.stringify({
                title: notif.title,
                body: notif.body,
                tag: notif.tag,
                silent: !prefs.soundEnabled,
                vibrate: prefs.vibrationEnabled ? [100, 50, 100] : [],
                icon: "/icon-192.png",
                badge: "/icon-192.png",
                url: notif.url,
              }),
            );
            totalSent++;
          } catch (err: any) {
            totalFailed++;
            if (err?.statusCode === 410 || err?.statusCode === 404) {
              deadSubIds.push(sub.id);
            }
            console.warn(`[send-reminders] Error al enviar a ${sub.endpoint}:`, err?.message);
          }
        }
      }
    }

    if (deadSubIds.length > 0) {
      await supabase.from("push_subscriptions").delete().in("id", deadSubIds);
    }

    return new Response(
      JSON.stringify({
        success: true,
        sent: totalSent,
        failed: totalFailed,
        cleaned: deadSubIds.length,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 },
    );
  } catch (error: any) {
    console.error("[send-reminders] Fatal error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
