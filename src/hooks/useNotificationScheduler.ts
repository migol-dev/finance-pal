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

interface SharedSchedulerState {
  permissionState: NotificationPermissionState;
  scheduledCount: number;
}

const sharedState: SharedSchedulerState = {
  permissionState: "prompt",
  scheduledCount: 0,
};

const listeners = new Set<(state: SharedSchedulerState) => void>();
let globalDebounceTimer: ReturnType<typeof setTimeout> | null = null;
let globalLastPushSyncKey: string | null = null;

function notifySchedulerListeners() {
  const snapshot = { ...sharedState };
  listeners.forEach((fn) => fn(snapshot));
}

export function useNotificationScheduler() {
  const { goals, fixedItems, transactions, appSettings, isLoading } = useFinanceData();
  const notificationPrefs = appSettings.notifications;

  const [permissionState, setPermissionState] = useState<NotificationPermissionState>(
    sharedState.permissionState,
  );
  const [scheduledCount, setScheduledCount] = useState<number>(sharedState.scheduledCount);
  const isPrimaryInstanceRef = useRef<boolean>(false);

  useEffect(() => {
    const isFirst = listeners.size === 0;
    isPrimaryInstanceRef.current = isFirst;
    const listener = (s: SharedSchedulerState) => {
      setPermissionState(s.permissionState);
      setScheduledCount(s.scheduledCount);
    };
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  }, []);

  const refreshPermissionState = useCallback(async () => {
    try {
      const state = await getNotificationPermissionState();
      if (sharedState.permissionState !== state) {
        sharedState.permissionState = state;
        notifySchedulerListeners();
      } else {
        setPermissionState(state);
      }
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
      sharedState.scheduledCount = list.length;
      notifySchedulerListeners();
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

  // 2. Reprogramar con debounce único global cuando cambien metas, fijos, transacciones, preferencias o permisos
  useEffect(() => {
    if (isLoading) return;
    if (globalDebounceTimer) {
      clearTimeout(globalDebounceTimer);
    }
    globalDebounceTimer = setTimeout(() => {
      globalDebounceTimer = null;
      runSchedule();
    }, SCHEDULER_DEBOUNCE_MS);

    return () => {
      if (globalDebounceTimer && listeners.size <= 1) {
        clearTimeout(globalDebounceTimer);
        globalDebounceTimer = null;
      }
    };
  }, [runSchedule, permissionState, isLoading]);

  // 3. Evaluación periódica autónoma (cada 15m y al volver a la pestaña, solo en la instancia primaria)
  useEffect(() => {
    if (!isPrimaryInstanceRef.current || isLoading || !notificationPrefs.enabled) return;

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
    if (globalLastPushSyncKey === syncKey) return;
    globalLastPushSyncKey = syncKey;

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
