import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { UseMutationResult } from '@tanstack/react-query';
import { useFinance } from '@/store/finance-store';
import { isSupabaseEnabled } from '@/lib/supabase';
import { financeKeys } from '@/lib/queryKeys';
import { updateTransaction, deleteTransaction, insertTransaction } from '@/services/transactions.service';
import { supabase } from '@/lib/supabase';
import { useSyncStore } from '@/store/sync-store';
import type { Transaction } from '@/lib/finance';

// (useSyncStore solo para encolar mutations offline)

function isOffline(): boolean {
  return typeof navigator !== 'undefined' && !navigator.onLine;
}

export interface TransactionMutations {
  addTransaction: UseMutationResult<void, Error, Transaction>;
  updateTransaction: UseMutationResult<void, Error, { id: string; patch: Partial<Transaction> }>;
  removeTransaction: UseMutationResult<void, Error, string>;
}

export function useTransactionMutations(): TransactionMutations {
  const queryClient = useQueryClient();

  const addTransaction = useMutation<void, Error, Transaction>({
    mutationFn: async (payload) => {
      if (!isSupabaseEnabled || isOffline()) {
        useSyncStore
          .getState()
          .addMutation({ table: 'transactions', action: 'INSERT', recordId: payload.id, payload: payload });
        return;
      }
      
      const { data } = await supabase.auth.getUser();
      if (!data.user) throw new Error('No user');
      
      await insertTransaction(data.user.id, payload);
    },
    onMutate: async (payload) => {
      await useFinance.getState().addTx(payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: financeKeys.transactions() });
    },
    onError: () => {
      queryClient.invalidateQueries({ queryKey: financeKeys.transactions() });
    },
  });

  const updateTransactionMutation = useMutation<
    void,
    Error,
    { id: string; patch: Partial<Transaction> }
  >({
    mutationFn: async ({ id, patch }) => {
      if (!isSupabaseEnabled || isOffline()) {
        useSyncStore
          .getState()
          .addMutation({ table: 'transactions', action: 'UPDATE', recordId: id, payload: patch });
        return;
      }
      const { data } = await supabase.auth.getUser();
      if (!data.user) throw new Error("No user");
      await updateTransaction(data.user.id, id, patch);
    },
    onMutate: async ({ id, patch }) => {
      await useFinance.getState().updateTx(id, patch);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: financeKeys.transactions() });
    },
    onError: () => {
      queryClient.invalidateQueries({ queryKey: financeKeys.transactions() });
    },
  });

  const removeTransaction = useMutation<void, Error, string>({
    mutationFn: async (id) => {
      if (!isSupabaseEnabled || isOffline()) {
        useSyncStore
          .getState()
          .addMutation({ table: 'transactions', action: 'DELETE', recordId: id });
        return;
      }
      const { data } = await supabase.auth.getUser();
      if (!data.user) throw new Error("No user");
      await deleteTransaction(data.user.id, id);
    },
    onMutate: async (id) => {
      await useFinance.getState().removeTx(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: financeKeys.transactions() });
    },
    onError: () => {
      queryClient.invalidateQueries({ queryKey: financeKeys.transactions() });
    },
  });

  return { addTransaction, updateTransaction: updateTransactionMutation, removeTransaction };
}
