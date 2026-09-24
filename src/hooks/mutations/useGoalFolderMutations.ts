import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { UseMutationResult } from '@tanstack/react-query';
import { useFinance } from '@/store/finance-store';
import { isSupabaseEnabled } from '@/lib/supabase';
import { financeKeys } from '@/lib/queryKeys';
import { updateGoalFolder, deleteGoalFolder, insertGoalFolder, reorderGoalFolders as reorderGoalFoldersService } from '@/services/goalFolders.service';
import { supabase } from '@/lib/supabase';
import { useSyncStore } from '@/store/sync-store';
import type { GoalFolder } from '@/lib/finance';

// (useSyncStore solo para encolar mutations offline)

function isOffline(): boolean {
  return typeof navigator !== 'undefined' && !navigator.onLine;
}

export interface GoalFolderMutations {
  addGoalFolder: UseMutationResult<void, Error, Omit<GoalFolder, 'id'>>;
  updateGoalFolder: UseMutationResult<void, Error, { id: string; patch: Partial<GoalFolder> }>;
  removeGoalFolder: UseMutationResult<void, Error, string>;
  reorderGoalFolders: UseMutationResult<void, Error, GoalFolder[]>;
}

export function useGoalFolderMutations(): GoalFolderMutations {
  const queryClient = useQueryClient();

  const addGoalFolder = useMutation<void, Error, Omit<GoalFolder, 'id'>>({
    mutationFn: async (payload) => {
      const state = useFinance.getState();
      const folder = state.goalFolders[0];
      
      if (!isSupabaseEnabled || isOffline()) {
        useSyncStore
          .getState()
          .addMutation({ table: 'goal_folders', action: 'INSERT', recordId: folder.id, payload: folder });
        return;
      }
      
      const { data } = await supabase.auth.getUser();
      if (!data.user) throw new Error('No user');
      
      await insertGoalFolder(data.user.id, folder);
    },
    onMutate: async (payload) => {
      await useFinance.getState().addGoalFolder(payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: financeKeys.goalFolders() });
    },
    onError: () => {
      queryClient.invalidateQueries({ queryKey: financeKeys.goalFolders() });
    },
  });

  const updateGoalFolderMutation = useMutation<
    void,
    Error,
    { id: string; patch: Partial<GoalFolder> }
  >({
    mutationFn: async ({ id, patch }) => {
      if (!isSupabaseEnabled || isOffline()) {
        useSyncStore
          .getState()
          .addMutation({ table: 'goal_folders', action: 'UPDATE', recordId: id, payload: patch });
        return;
      }
      const { data } = await supabase.auth.getUser();
      if (!data.user) throw new Error("No user");
      await updateGoalFolder(data.user.id, id, patch);
    },
    onMutate: async ({ id, patch }) => {
      await useFinance.getState().updateGoalFolder(id, patch);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: financeKeys.goalFolders() });
    },
    onError: () => {
      queryClient.invalidateQueries({ queryKey: financeKeys.goalFolders() });
    },
  });

  const removeGoalFolder = useMutation<void, Error, string>({
    mutationFn: async (id) => {
      if (!isSupabaseEnabled || isOffline()) {
        useSyncStore
          .getState()
          .addMutation({ table: 'goal_folders', action: 'DELETE', recordId: id });
        return;
      }
      const { data } = await supabase.auth.getUser();
      if (!data.user) throw new Error("No user");
      await deleteGoalFolder(data.user.id, id);
    },
    onMutate: async (id) => {
      await useFinance.getState().removeGoalFolder(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: financeKeys.goalFolders() });
      queryClient.invalidateQueries({ queryKey: financeKeys.goals() });
    },
    onError: () => {
      queryClient.invalidateQueries({ queryKey: financeKeys.goalFolders() });
      queryClient.invalidateQueries({ queryKey: financeKeys.goals() });
    },
  });

  const reorderGoalFolders = useMutation<void, Error, GoalFolder[]>({
    mutationFn: async (folders) => {
      if (!isSupabaseEnabled || isOffline()) {
        const syncStore = useSyncStore.getState();
        folders.forEach(f => {
          syncStore.addMutation({ table: 'goal_folders', action: 'UPDATE', recordId: f.id, payload: { order: f.order } });
        });
        return;
      }
      
      const { data } = await supabase.auth.getUser();
      if (!data.user) throw new Error('No user');
      
      await reorderGoalFoldersService(data.user.id, folders);
    },
    onMutate: async (folders) => {
      useFinance.getState().reorderGoalFolders(folders);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: financeKeys.goalFolders() });
    },
    onError: () => {
      queryClient.invalidateQueries({ queryKey: financeKeys.goalFolders() });
    },
  });

  return {
    addGoalFolder,
    updateGoalFolder: updateGoalFolderMutation,
    removeGoalFolder,
    reorderGoalFolders,
  };
}
