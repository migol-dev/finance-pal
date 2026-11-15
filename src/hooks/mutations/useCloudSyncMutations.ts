import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { UseMutationResult } from '@tanstack/react-query';
import { useFinance } from '@/store/finance-store';
import { isSupabaseEnabled, supabase } from '@/lib/supabase';
import { invalidateAllFinanceEntityQueries } from '@/lib/queryKeys';
import {
  downloadAllFromCloud,
  syncAllToCloud,
  loadSettingsFromCloud,
  type CloudSyncResult,
  type CloudSnapshot,
  type CloudSettings,
} from '@/services/cloudSync.service';

export function applyCloudSnapshotToStore(snapshot: CloudSnapshot): void {
  useFinance.setState({
    accounts: snapshot.accounts,
    transactions: snapshot.transactions,
    fixedItems: snapshot.fixedItems,
    goals: snapshot.goals,
    goalFolders: snapshot.goalFolders,
    debts: snapshot.debts,
  });
}

export interface CloudSyncMutations {
  /**
   * Descarga todas las entidades desde Supabase y las aplica al store Zustand.
   * Invalida el caché de React Query para que los queries refresquen.
   */
  downloadFromCloud: UseMutationResult<CloudSnapshot, Error, void>;

  /**
   * Sube todas las entidades del store Zustand a Supabase (delete+insert masivo).
   * Retorna el número de registros sincronizados.
   */
  syncAllToCloud: UseMutationResult<CloudSyncResult, Error, void>;

  /**
   * Carga theme y profile desde user_settings y los aplica al store Zustand.
   */
  loadSettingsFromCloud: UseMutationResult<CloudSettings | null, Error, void>;
}

export function useCloudSyncMutations(): CloudSyncMutations {
  const queryClient = useQueryClient();

  const downloadFromCloud = useMutation<CloudSnapshot, Error, void>({
    mutationFn: async () => {
      const { data } = await supabase.auth.getUser();
      const userId = data.user?.id;
      if (!userId) throw new Error('No user');

      const snapshot = await downloadAllFromCloud(userId);
      applyCloudSnapshotToStore(snapshot);
      return snapshot;
    },
    onSuccess: async () => {
      await invalidateAllFinanceEntityQueries(queryClient);
    },
    // No hace rollback (la descarga no modifica Supabase, solo el estado local).
  });

  const syncAllToCloudMutation = useMutation<CloudSyncResult, Error, void>({
    mutationFn: async () => {
      if (!isSupabaseEnabled) return { syncedCount: 0, errors: [] };
      const { data } = await supabase.auth.getUser();
      const userId = data.user?.id;
      if (!userId) throw new Error('No user');

      const s = useFinance.getState();
      const input = {
        userId,
        accounts: s.accounts,
        transactions: s.transactions,
        fixedItems: s.fixedItems,
        goals: s.goals,
        goalFolders: s.goalFolders,
        debts: s.debts,
        theme: s.theme,
        profile: s.profile,
        notificationPrefs: s.appSettings?.notifications,
      };

      return syncAllToCloud(input);
    },
    onSuccess: async () => {
      await invalidateAllFinanceEntityQueries(queryClient);
    },
  });

  const loadSettingsFromCloudMutation = useMutation<CloudSettings | null, Error, void>({
    mutationFn: async () => {
      if (!isSupabaseEnabled) return null;
      const { data } = await supabase.auth.getUser();
      const userId = data.user?.id;
      if (!userId) throw new Error('No user');

      const settings = await loadSettingsFromCloud(userId);

      if (settings !== null) {
        useFinance.getState().setTheme(settings.theme);
        useFinance.getState().setProfile(settings.profile);
        if (settings.notificationPrefs) {
          useFinance.getState().setNotificationPrefs(settings.notificationPrefs);
        }
      }

      return settings;
    },
    // Sin invalidación (no afecta queries de entidades financieras).
  });

  return {
    downloadFromCloud,
    syncAllToCloud: syncAllToCloudMutation,
    loadSettingsFromCloud: loadSettingsFromCloudMutation,
  };
}
