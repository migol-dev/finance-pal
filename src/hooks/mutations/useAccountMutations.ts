import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { UseMutationResult } from '@tanstack/react-query';
import { useFinance } from '@/store/finance-store';
import { isSupabaseEnabled } from '@/lib/supabase';
import { financeKeys } from '@/lib/queryKeys';
import { updateAccount, deleteAccount, insertAccount } from '@/services/accounts.service';
import { supabase } from '@/lib/supabase';
import { useSyncStore } from '@/store/sync-store';
import type { Account } from '@/lib/finance';

// (useSyncStore solo para encolar mutations offline)

function isOffline(): boolean {
  return typeof navigator !== 'undefined' && !navigator.onLine;
}

export interface AccountMutations {
  addAccount: UseMutationResult<void, Error, Omit<Account, 'id'>>;
  updateAccount: UseMutationResult<void, Error, { id: string; patch: Partial<Account> }>;
  removeAccount: UseMutationResult<void, Error, string>;
  mergeAccounts: UseMutationResult<void, Error, { fromIds: string[]; intoId: string }>;
}

export function useAccountMutations(): AccountMutations {
  const queryClient = useQueryClient();

  const addAccount = useMutation<void, Error, Omit<Account, 'id'>>({
    mutationFn: async (payload) => {
      const state = useFinance.getState();
      const account = state.accounts[0];
      
      if (!isSupabaseEnabled || isOffline()) {
        useSyncStore
          .getState()
          .addMutation({ table: 'accounts', action: 'INSERT', recordId: account.id, payload: account });
        return;
      }
      
      const { data } = await supabase.auth.getUser();
      if (!data.user) throw new Error('No user');
      
      await insertAccount(data.user.id, account);
    },
    onMutate: async (payload) => {
      await useFinance.getState().addAccount(payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: financeKeys.accounts() });
    },
    onError: () => {
      queryClient.invalidateQueries({ queryKey: financeKeys.accounts() });
    },
  });

  const updateAccountMutation = useMutation<void, Error, { id: string; patch: Partial<Account> }>({
    mutationFn: async ({ id, patch }) => {
      if (!isSupabaseEnabled || isOffline()) {
        useSyncStore
          .getState()
          .addMutation({ table: 'accounts', action: 'UPDATE', recordId: id, payload: patch });
        return;
      }
      await updateAccount(id, patch);
    },
    onMutate: async ({ id, patch }) => {
      await useFinance.getState().updateAccount(id, patch);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: financeKeys.accounts() });
    },
    onError: () => {
      queryClient.invalidateQueries({ queryKey: financeKeys.accounts() });
    },
  });

  const removeAccount = useMutation<void, Error, string>({
    mutationFn: async (id) => {
      if (!isSupabaseEnabled || isOffline()) {
        useSyncStore.getState().addMutation({ table: 'accounts', action: 'DELETE', recordId: id });
        return;
      }
      await deleteAccount(id);
    },
    onMutate: async (id) => {
      await useFinance.getState().removeAccount(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: financeKeys.accounts() });
    },
    onError: () => {
      queryClient.invalidateQueries({ queryKey: financeKeys.accounts() });
    },
  });

  const mergeAccounts = useMutation<void, Error, { fromIds: string[]; intoId: string }>({
    mutationFn: async ({ fromIds, intoId }) => {
      const idsToDelete = fromIds.filter(id => id !== intoId);
      if (idsToDelete.length === 0) return;

      if (!isSupabaseEnabled || isOffline()) {
        const syncStore = useSyncStore.getState();
        idsToDelete.forEach(id => {
          syncStore.addMutation({ table: 'accounts', action: 'DELETE', recordId: id });
        });
        return;
      }

      const { error: txError } = await supabase
        .from('transactions')
        .update({ account_id: intoId })
        .in('account_id', idsToDelete);

      if (txError) throw txError;

      const { error: accError } = await supabase
        .from('accounts')
        .delete()
        .in('id', idsToDelete);

      if (accError) throw accError;
    },
    onMutate: async ({ fromIds, intoId }) => {
      useFinance.getState().mergeAccounts(fromIds, intoId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: financeKeys.accounts() });
      queryClient.invalidateQueries({ queryKey: financeKeys.transactions() });
    },
    onError: () => {
      queryClient.invalidateQueries({ queryKey: financeKeys.accounts() });
      queryClient.invalidateQueries({ queryKey: financeKeys.transactions() });
    },
  });

  return { addAccount, updateAccount: updateAccountMutation, removeAccount, mergeAccounts };
}
