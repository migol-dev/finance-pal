import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { UseMutationResult } from '@tanstack/react-query';
import { useFinance } from '@/store/finance-store';
import { isSupabaseEnabled } from '@/lib/supabase';
import { financeKeys } from '@/lib/queryKeys';
import { updateGoal, deleteGoal, insertGoal, addGoalContribution as addGoalContributionService } from '@/services/goals.service';
import { supabase } from '@/lib/supabase';
import { useSyncStore } from '@/store/sync-store';
import type { Goal } from '@/lib/finance';

// (useSyncStore solo para encolar mutations offline)

function isOffline(): boolean {
  return typeof navigator !== 'undefined' && !navigator.onLine;
}

export interface ContributeToGoalInput {
  id: string;
  amount: number;
  date?: string;
  accountId?: string;
}

export interface GoalMutations {
  addGoal: UseMutationResult<void, Error, Omit<Goal, 'id'>>;
  updateGoal: UseMutationResult<void, Error, { id: string; patch: Partial<Goal> }>;
  removeGoal: UseMutationResult<void, Error, string>;
  contributeToGoal: UseMutationResult<void, Error, ContributeToGoalInput>;
}

export function useGoalMutations(): GoalMutations {
  const queryClient = useQueryClient();

  const addGoal = useMutation<void, Error, Omit<Goal, 'id'>>({
    mutationFn: async (payload) => {
      const state = useFinance.getState();
      const goal = state.goals[0];
      
      if (!isSupabaseEnabled || isOffline()) {
        useSyncStore
          .getState()
          .addMutation({ table: 'goals', action: 'INSERT', recordId: goal.id, payload: goal });
        return;
      }
      
      const { data } = await supabase.auth.getUser();
      if (!data.user) throw new Error('No user');
      
      await insertGoal(data.user.id, goal);
    },
    onMutate: async (payload) => {
      await useFinance.getState().addGoal(payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: financeKeys.goals() });
    },
    onError: () => {
      queryClient.invalidateQueries({ queryKey: financeKeys.goals() });
    },
  });

  const updateGoalMutation = useMutation<void, Error, { id: string; patch: Partial<Goal> }>({
    mutationFn: async ({ id, patch }) => {
      if (!isSupabaseEnabled || isOffline()) {
        useSyncStore
          .getState()
          .addMutation({ table: 'goals', action: 'UPDATE', recordId: id, payload: patch });
        return;
      }
      await updateGoal(id, patch);
    },
    onMutate: async ({ id, patch }) => {
      await useFinance.getState().updateGoal(id, patch);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: financeKeys.goals() });
    },
    onError: () => {
      queryClient.invalidateQueries({ queryKey: financeKeys.goals() });
    },
  });

  const removeGoal = useMutation<void, Error, string>({
    mutationFn: async (id) => {
      if (!isSupabaseEnabled || isOffline()) {
        useSyncStore.getState().addMutation({ table: 'goals', action: 'DELETE', recordId: id });
        return;
      }
      await deleteGoal(id);
    },
    onMutate: async (id) => {
      await useFinance.getState().removeGoal(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: financeKeys.goals() });
    },
    onError: () => {
      queryClient.invalidateQueries({ queryKey: financeKeys.goals() });
    },
  });

  const contributeToGoal = useMutation<void, Error, ContributeToGoalInput>({
    mutationFn: async (input) => {
      if (!isSupabaseEnabled || isOffline()) {
        const state = useFinance.getState();
        const updatedGoal = state.goals.find(g => g.id === input.id);
        if (updatedGoal) {
           useSyncStore.getState().addMutation({ 
             table: 'goals', 
             action: 'UPDATE', 
             recordId: updatedGoal.id, 
             payload: { saved: updatedGoal.saved, contributions: updatedGoal.contributions } 
           });
        }
        return;
      }

      const { data } = await supabase.auth.getUser();
      if (!data.user) throw new Error('No user');

      await addGoalContributionService(data.user.id, input.id, input);
    },
    onMutate: async ({ id, amount, date, accountId }) => {
      useFinance.getState().contributeGoal(id, amount, date, accountId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: financeKeys.goals() });
      queryClient.invalidateQueries({ queryKey: financeKeys.transactions() });
    },
    onError: () => {
      queryClient.invalidateQueries({ queryKey: financeKeys.goals() });
      queryClient.invalidateQueries({ queryKey: financeKeys.transactions() });
    },
  });

  return { addGoal, updateGoal: updateGoalMutation, removeGoal, contributeToGoal };
}
