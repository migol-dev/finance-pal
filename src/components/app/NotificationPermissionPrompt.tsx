import React, { useState, useEffect } from "react";
import { BellRing, X, Sparkles, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useFinanceData } from "@/hooks/useFinanceData";
import {
  getNotificationPermissionState,
  requestNotificationPermissions,
  scheduleAllNotifications,
} from "@/lib/notifications";
import { subscribeToWebPush } from "@/lib/web-push";
import { toast } from "sonner";

const PROMPT_DISMISSED_KEY = "finance-pal-notif-prompt-dismissed-at";
const DISMISS_COOLDOWN_MS = 7 * 24 * 60 * 60 * 1000; // 7 días

function isRecentlyDismissed(): boolean {
  if (typeof window === "undefined" || typeof localStorage === "undefined") return false;
  try {
    const raw = localStorage.getItem(PROMPT_DISMISSED_KEY);
    if (!raw) return false;
    const ts = Number(raw);
    if (!Number.isFinite(ts)) return false;
    return Date.now() - ts < DISMISS_COOLDOWN_MS;
  } catch {
    return false;
  }
}

export function NotificationPermissionPrompt() {
  const { goals, fixedItems, transactions, appSettings, setNotificationPrefs } = useFinanceData();
  const prefs = appSettings.notifications;

  const [visible, setVisible] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!prefs?.enabled) {
      setVisible(false);
      return;
    }
    if (isRecentlyDismissed()) {
      setVisible(false);
      return;
    }

    let cancelled = false;
    const timer = setTimeout(async () => {
      const state = await getNotificationPermissionState();
      if (!cancelled && state === "prompt") {
        setVisible(true);
      } else if (!cancelled) {
        setVisible(false);
      }
    }, 1800);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [prefs?.enabled, goals.length, fixedItems.length]);

  const handleDismiss = () => {
    try {
      localStorage.setItem(PROMPT_DISMISSED_KEY, String(Date.now()));
    } catch {
      // Ignore storage errors
    }
    setVisible(false);
  };

  const handleGrantPermission = async () => {
    setSubmitting(true);
    try {
      const res = await requestNotificationPermissions(prefs.pushEnabled);
      if (res.display === "granted") {
        setNotificationPrefs({ enabled: true });
        if (prefs.pushEnabled) {
          subscribeToWebPush().catch(console.warn);
        }
        await scheduleAllNotifications(goals, fixedItems, { ...prefs, enabled: true }, transactions);
        toast.success("¡Notificaciones activadas correctamente! 🔔");
        setVisible(false);
      } else if (res.display === "denied") {
        toast.error(
          "Permiso bloqueado. Puedes activarlo desde el ícono de candado en tu navegador o en Ajustes del sistema.",
        );
        setVisible(false);
      }
    } catch (e) {
      console.warn("[NotificationPermissionPrompt] Error requesting permission:", e);
      toast.error("No se pudo solicitar el permiso de notificaciones");
    } finally {
      setSubmitting(false);
    }
  };

  if (!visible) return null;

  return (
    <div
      role="region"
      aria-label="Solicitud de permisos de notificación"
      className="fixed bottom-20 lg:bottom-6 right-4 left-4 sm:left-auto sm:w-[400px] z-40 rounded-3xl bg-card/95 backdrop-blur-md border border-primary/25 shadow-pop p-4 sm:p-5 animate-in fade-in slide-in-from-bottom-4 duration-300"
    >
      <button
        type="button"
        onClick={handleDismiss}
        aria-label="Posponer aviso de notificaciones"
        className="absolute top-3.5 right-3.5 size-8 rounded-full bg-muted/60 hover:bg-muted text-muted-foreground hover:text-foreground flex items-center justify-center transition"
      >
        <X className="size-4" />
      </button>

      <div className="flex items-start gap-3.5 pr-6">
        <div className="size-11 rounded-2xl bg-primary/10 text-primary flex items-center justify-center shrink-0 shadow-sm">
          <BellRing className="size-5.5" />
        </div>
        <div className="space-y-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <h3 className="font-extrabold text-sm text-foreground">
              Activa tus alertas inteligentes
            </h3>
            <Sparkles className="size-3.5 text-primary shrink-0" />
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Recibe avisos automáticos antes de tus <strong>gastos o ingresos fijos</strong>, cuando
            se acerque la fecha límite de una <strong>meta</strong> o si vas{" "}
            <strong>atrasado según tu plan</strong>.
          </p>
        </div>
      </div>

      <div className="mt-3.5 flex items-center justify-between gap-2 pt-3 border-t border-border/60">
        <span className="text-[11px] text-muted-foreground flex items-center gap-1">
          <ShieldCheck className="size-3.5 text-emerald-500 shrink-0" />
          100% personalizable en Ajustes
        </span>
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleDismiss}
            className="h-9 rounded-xl text-xs font-semibold text-muted-foreground"
          >
            Ahora no
          </Button>
          <Button
            type="button"
            size="sm"
            disabled={submitting}
            onClick={handleGrantPermission}
            className="h-9 rounded-xl text-xs font-bold px-3.5 shadow-sm"
          >
            {submitting ? "Solicitando..." : "Permitir notificaciones"}
          </Button>
        </div>
      </div>
    </div>
  );
}
