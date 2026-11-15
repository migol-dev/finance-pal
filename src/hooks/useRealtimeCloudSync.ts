import { useCallback, useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { isSupabaseEnabled, supabase } from '@/lib/supabase';
import { invalidateAllFinanceEntityQueries } from '@/lib/queryKeys';
import { downloadAllFromCloud } from '@/services/cloudSync.service';
import { applyCloudSnapshotToStore } from '@/hooks/mutations/useCloudSyncMutations';
import { useSyncStore } from '@/store/sync-store';

const REALTIME_TABLES = [
  'accounts',
  'transactions',
  'fixed_items',
  'goals',
  'goal_folders',
  'debts',
] as const;

export const FOCUS_SYNC_COOLDOWN_MS = 15_000;
const REALTIME_DEBOUNCE_MS = 400;

export function canPullCloudChanges(): boolean {
  if (!isSupabaseEnabled) return false;
  const { syncQueue, isSyncing } = useSyncStore.getState();
  return syncQueue.length === 0 && !isSyncing;
}

export function useRealtimeCloudSync(userId?: string | null, enabled = true): void {
  const queryClient = useQueryClient();
  const inFlightRef = useRef(false);
  const lastFocusSyncAtRef = useRef(0);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const pullLatest = useCallback(
    async (enforceCooldown: boolean): Promise<void> => {
      if (!enabled || !userId || !canPullCloudChanges()) return;
      if (inFlightRef.current) return;

      const now = Date.now();
      if (enforceCooldown && now - lastFocusSyncAtRef.current < FOCUS_SYNC_COOLDOWN_MS) {
        return;
      }

      inFlightRef.current = true;
      lastFocusSyncAtRef.current = now;
      try {
        const snapshot = await downloadAllFromCloud(userId);
        // Re-check queue after async download before mutating Zustand store.
        if (!canPullCloudChanges()) return;
        applyCloudSnapshotToStore(snapshot);
        await invalidateAllFinanceEntityQueries(queryClient);
      } catch {
        // Silent background refresh failure; next event or manual sync recovers.
      } finally {
        inFlightRef.current = false;
      }
    },
    [enabled, userId, queryClient],
  );

  useEffect(() => {
    if (!enabled || !isSupabaseEnabled || !userId) return;

    const handleFocus = () => {
      void pullLatest(true);
    };
    const handleVisibility = () => {
      if (typeof document !== 'undefined' && document.visibilityState === 'visible') {
        void pullLatest(true);
      }
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('focus', handleFocus);
    }
    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', handleVisibility);
    }

    const scheduleRealtimePull = () => {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = setTimeout(() => {
        void pullLatest(false);
      }, REALTIME_DEBOUNCE_MS);
    };

    let channel: ReturnType<typeof supabase.channel> | null = null;
    if (typeof supabase.channel === 'function') {
      let builder = supabase.channel(`mcp-cloud-sync:${userId}`);
      for (const table of REALTIME_TABLES) {
        builder = builder.on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table,
            filter: `user_id=eq.${userId}`,
          },
          scheduleRealtimePull,
        );
      }
      channel = builder.subscribe();
    }

    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('focus', handleFocus);
      }
      if (typeof document !== 'undefined') {
        document.removeEventListener('visibilitychange', handleVisibility);
      }
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
        debounceTimerRef.current = null;
      }
      if (channel && typeof supabase.removeChannel === 'function') {
        void supabase.removeChannel(channel);
      }
    };
  }, [enabled, userId, pullLatest]);
}
