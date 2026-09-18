import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { UseMutationResult } from '@tanstack/react-query';
import { useFinance } from '@/store/finance-store';
import { isSupabaseEnabled } from '@/lib/supabase';
import { supabase } from '@/lib/supabase';
import { financeKeys } from '@/lib/queryKeys';
import {
  downloadAllFromCloud,
  syncAllToCloud,
  loadSettingsFromCloud,
  type CloudSyncResult,
  type CloudSnapshot,
  type CloudSettings,
} from '@/services/cloudSync.service';

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

      // Aplicar snapshot al store Zustand:
      useFinance.setState({
        accounts: snapshot.accounts,
        transactions: snapshot.transactions,
        fixedItems: snapshot.fixedItems,
        goals: snapshot.goals,
        goalFolders: snapshot.goalFolders,
        debts: snapshot.debts,
      });

      return snapshot;
    },
    onSuccess: () => {
      // Invalida TODAS las entidades de una sola vez (financeKeys.all es array raíz).
      queryClient.invalidateQueries({ queryKey: financeKeys.all });
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
      };

      return syncAllToCloud(input);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: financeKeys.all });
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
