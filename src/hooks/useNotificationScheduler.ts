import { useEffect, useRef, useState, useCallback } from "react";
import { useFinanceData } from "@/hooks/useFinanceData";
import {
  scheduleAllNotifications,
  getNotificationPermissionState,
  requestNotificationPermissions,
  ensureAndroidNotificationChannel,
} from "@/lib/notifications";
import { subscribeToWebPush, unsubscribeFromWebPush } from "@/lib/web-push";
import type { NotificationPermissionState } from "@/lib/finance";

const SCHEDULER_DEBOUNCE_MS = 600;
const PERIODIC_EVAL_MS = 15 * 60 * 1000; // 15 minutos

export function useNotificationScheduler() {
  const { goals, fixedItems, transactions, appSettings, isLoading } = useFinanceData();
  const notificationPrefs = appSettings.notifications;

  const [permissionState, setPermissionState] = useState<NotificationPermissionState>("prompt");
  const [scheduledCount, setScheduledCount] = useState<number>(0);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastPushSyncRef = useRef<string | null>(null);

  const refreshPermissionState = useCallback(async () => {
    try {
      const state = await getNotificationPermissionState();
      setPermissionState(state);
      return state;
    } catch {
      return "prompt" as NotificationPermissionState;
    }
  }, []);

  const runSchedule = useCallback(async () => {
    if (isLoading) return;
    try {
      await ensureAndroidNotificationChannel(notificationPrefs);
      const list = await scheduleAllNotifications(
        goals,
        fixedItems,
        notificationPrefs,
        transactions,
      );
      setScheduledCount(list.length);
    } catch (e) {
      console.warn("[useNotificationScheduler] Failed to schedule notifications:", e);
    }
  }, [goals, fixedItems, transactions, notificationPrefs, isLoading]);

  // 1. Mantener el estado real del permiso sincronizado al iniciar y al recuperar el foco
  useEffect(() => {
    refreshPermissionState();

    const onVisibilityOrFocus = () => {
      if (typeof document !== "undefined" && document.visibilityState === "hidden") return;
      refreshPermissionState();
    };

    if (typeof window !== "undefined") {
      window.addEventListener("focus", onVisibilityOrFocus);
      document.addEventListener("visibilitychange", onVisibilityOrFocus);
    }

    return () => {
      if (typeof window !== "undefined") {
        window.removeEventListener("focus", onVisibilityOrFocus);
        document.removeEventListener("visibilitychange", onVisibilityOrFocus);
      }
    };
  }, [refreshPermissionState]);

  // 2. Reprogramar con debounce cuando cambien metas, fijos, transacciones, preferencias o permisos
  useEffect(() => {
    if (isLoading) return;
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    debounceTimerRef.current = setTimeout(() => {
      runSchedule();
    }, SCHEDULER_DEBOUNCE_MS);

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [runSchedule, permissionState, isLoading]);

  // 3. Evaluación periódica autónoma (cada 15m y al volver a la pestaña)
  useEffect(() => {
    if (isLoading || !notificationPrefs.enabled) return;

    const interval = setInterval(() => {
      runSchedule();
    }, PERIODIC_EVAL_MS);

    const onVisible = () => {
      if (typeof document !== "undefined" && document.visibilityState === "visible") {
        runSchedule();
      }
    };

    if (typeof document !== "undefined") {
      document.addEventListener("visibilitychange", onVisible);
    }

    return () => {
      clearInterval(interval);
      if (typeof document !== "undefined") {
        document.removeEventListener("visibilitychange", onVisible);
      }
    };
  }, [runSchedule, isLoading, notificationPrefs.enabled]);

  // 4. Sincronizar suscripción Web Push cuando el permiso ya fue concedido
  useEffect(() => {
    if (permissionState !== "granted") return;
    const desired = Boolean(notificationPrefs.enabled && notificationPrefs.pushEnabled);
    const syncKey = `${permissionState}:${desired}`;
    if (lastPushSyncRef.current === syncKey) return;
    lastPushSyncRef.current = syncKey;

    if (desired) {
      subscribeToWebPush().catch((err) => {
        console.warn("[useNotificationScheduler] Web Push subscribe warning:", err);
      });
    } else {
      unsubscribeFromWebPush().catch((err) => {
        console.warn("[useNotificationScheduler] Web Push unsubscribe warning:", err);
      });
    }
  }, [permissionState, notificationPrefs.enabled, notificationPrefs.pushEnabled]);

  const requestPermission = useCallback(async () => {
    const res = await requestNotificationPermissions(notificationPrefs.pushEnabled);
    const updated = await refreshPermissionState();
    await runSchedule();
    return { status: res.display, permissionState: updated };
  }, [notificationPrefs.pushEnabled, refreshPermissionState, runSchedule]);

  return {
    permissionState,
    scheduledCount,
    refreshPermissionState,
    requestPermission,
    rescheduleNow: runSchedule,
  };
}
