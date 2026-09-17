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
  addTransaction: UseMutationResult<void, Error, Omit<Transaction, 'id'>>;
  updateTransaction: UseMutationResult<void, Error, { id: string; patch: Partial<Transaction> }>;
  removeTransaction: UseMutationResult<void, Error, string>;
}

export function useTransactionMutations(): TransactionMutations {
  const queryClient = useQueryClient();

  const addTransaction = useMutation<void, Error, Omit<Transaction, 'id'>>({
    mutationFn: async (payload) => {
      const state = useFinance.getState();
      const transaction = state.transactions[0];
      
      if (!isSupabaseEnabled || isOffline()) {
        useSyncStore
          .getState()
          .addMutation({ table: 'transactions', action: 'INSERT', recordId: transaction.id, payload: transaction });
        return;
      }
      
      const { data } = await supabase.auth.getUser();
      if (!data.user) throw new Error('No user');
      
      await insertTransaction(data.user.id, transaction);
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
      await updateTransaction(id, patch);
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
      await deleteTransaction(id);
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
