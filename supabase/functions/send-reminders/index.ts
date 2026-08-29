// @ts-nocheck
// Supabase Edge Function: send-reminders
// Dispara recordatorios diarios de Metas y Pagos fijos a través de Web Push

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import webpush from "npm:web-push@3.6.7";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Rate limiting in-memory store
const rateLimit = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT_MAX = 5; // max 5 requests
const RATE_LIMIT_WINDOW_MS = 60000; // 1 minute

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
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const vapidPublicKey = Deno.env.get("VAPID_PUBLIC_KEY");
    if (!vapidPublicKey) {
      throw new Error("VAPID_PUBLIC_KEY is not set in environment secrets.");
    }
    const vapidPrivateKey = Deno.env.get("VAPID_PRIVATE_KEY")!;
    const vapidSubject = Deno.env.get("VAPID_SUBJECT") || "mailto:soporte@financepal.com";

    if (!vapidPrivateKey) {
      throw new Error("VAPID_PRIVATE_KEY is not set in environment secrets.");
    }

    webpush.setVapidDetails(vapidSubject, vapidPublicKey, vapidPrivateKey);

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // 1. Obtener todas las suscripciones push agrupadas por usuario
    const { data: subscriptions, error: subError } = await supabase
      .from("push_subscriptions")
      .select("*");

    if (subError) throw subError;
    if (!subscriptions || subscriptions.length === 0) {
      return new Response(JSON.stringify({ message: "No active push subscriptions found", sent: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    // Agrupar suscripciones por user_id
    const userSubsMap = new Map<string, any[]>();
    for (const sub of subscriptions) {
      if (!userSubsMap.has(sub.user_id)) userSubsMap.set(sub.user_id, []);
      userSubsMap.get(sub.user_id)!.push(sub);
    }

    const today = new Date();
    const __todayStr = today.toISOString().split("T")[0];
    const currentDayOfMonth = today.getDate();
    const currentDayOfWeek = today.getDay(); // 0 = Domingo

    let totalSent = 0;
    let totalFailed = 0;
    const deadSubIds: string[] = [];

    // 2. Procesar recordatorios para cada usuario suscrito
    for (const [userId, userSubs] of userSubsMap.entries()) {
      const notificationsToSend: { title: string; body: string; url: string }[] = [];

      // A) Consultar metas del usuario
      const { data: goals } = await supabase
        .from("goals")
        .select("id, name, target, saved, deadline")
        .eq("user_id", userId);

      if (goals) {
        for (const g of goals) {
          if (!g.deadline || g.saved >= g.target) continue;
          const deadlineDate = new Date(g.deadline);
          const diffDays = Math.ceil((deadlineDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
          const remaining = g.target - g.saved;

          if (diffDays === 7 || diffDays === 3 || diffDays === 1) {
            notificationsToSend.push({
              title: `Meta próxima: ${g.name}`,
              body: `Faltan ${diffDays} día(s) para tu fecha límite. Te faltan $${remaining.toLocaleString("es-MX")}.`,
              url: "/metas",
            });
          } else if (diffDays === 0) {
            notificationsToSend.push({
              title: `¡Meta vence hoy!: ${g.name}`,
              body: `Hoy es la fecha límite para completar tu meta. Te faltan $${remaining.toLocaleString("es-MX")}.`,
              url: "/metas",
            });
          } else if (diffDays < 0) {
            notificationsToSend.push({
              title: `Meta atrasada: ${g.name}`,
              body: `La fecha límite ya pasó. Aún te faltan $${remaining.toLocaleString("es-MX")}.`,
              url: "/metas",
            });
          }
        }
      }

      // B) Consultar pagos fijos del usuario
      const { data: fixedItems } = await supabase
        .from("fixed_items")
        .select("id, concept, amount, type, frequency, pay_day, pay_week_day, active")
        .eq("user_id", userId)
        .eq("active", true);

      if (fixedItems) {
        for (const item of fixedItems) {
          const typeLabel = item.type === "income_fixed" ? "Ingreso" : "Gasto";
          const amountStr = `$${item.amount.toLocaleString("es-MX")}`;

          if (item.frequency === "monthly" && typeof item.pay_day === "number") {
            const daysUntil = item.pay_day - currentDayOfMonth;
            if (daysUntil === 0) {
              notificationsToSend.push({
                title: `Pago programado para hoy: ${item.concept}`,
                body: `${typeLabel} fijo de ${amountStr} programado para hoy.`,
                url: "/movimientos",
              });
            } else if (daysUntil > 0 && daysUntil <= 3) {
              notificationsToSend.push({
                title: `Pago próximo: ${item.concept}`,
                body: `${typeLabel} fijo de ${amountStr} vence en ${daysUntil} día(s).`,
                url: "/movimientos",
              });
            }
          } else if (item.frequency === "weekly" && typeof item.pay_week_day === "number") {
            const daysUntil = (item.pay_week_day - currentDayOfWeek + 7) % 7;
            if (daysUntil === 0) {
              notificationsToSend.push({
                title: `Pago semanal de hoy: ${item.concept}`,
                body: `${typeLabel} semanal de ${amountStr} para hoy.`,
                url: "/movimientos",
              });
            } else if (daysUntil > 0 && daysUntil <= 2) {
              notificationsToSend.push({
                title: `Pago semanal próximo: ${item.concept}`,
                body: `${typeLabel} semanal de ${amountStr} en ${daysUntil} día(s).`,
                url: "/movimientos",
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
                icon: "/icon-192.png",
                badge: "/icon-192.png",
                url: notif.url,
              })
            );
            totalSent++;
          } catch (err: any) {
            totalFailed++;
            // 404 o 410 significa que el usuario revocó permisos o cerró sesión permanentemente
            if (err?.statusCode === 410 || err?.statusCode === 404) {
              deadSubIds.push(sub.id);
            }
            console.warn(`[send-reminders] Error al enviar a ${sub.endpoint}:`, err?.message);
          }
        }
      }
    }

    // 3. Limpiar suscripciones inválidas o dadas de baja
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
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
    );
  } catch (error: any) {
    console.error("[send-reminders] Fatal error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
