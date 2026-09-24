import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { UseMutationResult } from '@tanstack/react-query';
import { useFinance } from '@/store/finance-store';
import { isSupabaseEnabled } from '@/lib/supabase';
import { financeKeys } from '@/lib/queryKeys';
import { updateDebt, deleteDebt, deleteDebtPayment, insertDebt, insertDebtPayment as insertDebtPaymentService } from '@/services/debts.service';
import { supabase } from '@/lib/supabase';
import { useSyncStore } from '@/store/sync-store';
import type { Debt, DebtPayment } from '@/lib/finance';

// (useSyncStore solo para encolar mutations offline)

function isOffline(): boolean {
  return typeof navigator !== 'undefined' && !navigator.onLine;
}

export interface AddDebtPaymentInput {
  debtId: string;
  payment: Omit<DebtPayment, 'id'>;
}

export interface RemoveDebtPaymentInput {
  debtId: string;
  paymentId: string;
}

export interface DebtMutations {
  addDebt: UseMutationResult<void, Error, Omit<Debt, 'id' | 'payments'>>;
  updateDebt: UseMutationResult<void, Error, { id: string; patch: Partial<Debt> }>;
  removeDebt: UseMutationResult<void, Error, string>;
  addDebtPayment: UseMutationResult<void, Error, AddDebtPaymentInput>;
  removeDebtPayment: UseMutationResult<void, Error, RemoveDebtPaymentInput>;
}

export function useDebtMutations(): DebtMutations {
  const queryClient = useQueryClient();

  const addDebt = useMutation<void, Error, Omit<Debt, 'id' | 'payments'>>({
    mutationFn: async (payload) => {
      const state = useFinance.getState();
      const debt = state.debts[0];
      
      if (!isSupabaseEnabled || isOffline()) {
        useSyncStore
          .getState()
          .addMutation({ table: 'debts', action: 'INSERT', recordId: debt.id, payload: debt });
        return;
      }
      
      const { data } = await supabase.auth.getUser();
      if (!data.user) throw new Error('No user');
      
      await insertDebt(data.user.id, debt);
    },
    onMutate: async (payload) => {
      await useFinance.getState().addDebt(payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: financeKeys.debts() });
    },
    onError: () => {
      queryClient.invalidateQueries({ queryKey: financeKeys.debts() });
    },
  });

  const updateDebtMutation = useMutation<void, Error, { id: string; patch: Partial<Debt> }>({
    mutationFn: async ({ id, patch }) => {
      if (!isSupabaseEnabled || isOffline()) {
        useSyncStore
          .getState()
          .addMutation({ table: 'debts', action: 'UPDATE', recordId: id, payload: patch });
        return;
      }
      const { data } = await supabase.auth.getUser();
      if (!data.user) throw new Error("No user");
      await updateDebt(data.user.id, id, patch);
    },
    onMutate: async ({ id, patch }) => {
      await useFinance.getState().updateDebt(id, patch);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: financeKeys.debts() });
    },
    onError: () => {
      queryClient.invalidateQueries({ queryKey: financeKeys.debts() });
    },
  });

  const removeDebt = useMutation<void, Error, string>({
    mutationFn: async (id) => {
      if (!isSupabaseEnabled || isOffline()) {
        useSyncStore.getState().addMutation({ table: 'debts', action: 'DELETE', recordId: id });
        return;
      }
      const { data } = await supabase.auth.getUser();
      if (!data.user) throw new Error("No user");
      await deleteDebt(data.user.id, id);
    },
    onMutate: async (id) => {
      await useFinance.getState().removeDebt(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: financeKeys.debts() });
    },
    onError: () => {
      queryClient.invalidateQueries({ queryKey: financeKeys.debts() });
    },
  });

  const addDebtPayment = useMutation<void, Error, AddDebtPaymentInput>({
    mutationFn: async (input) => {
      if (!isSupabaseEnabled || isOffline()) {
        const state = useFinance.getState();
        const debt = state.debts.find(d => d.id === input.debtId);
        const payment = debt?.payments[0]; // because addDebtPayment prepends it usually, or we can just pass input.payment
        if (payment) {
          useSyncStore
            .getState()
            .addMutation({ 
              table: 'debt_payments', 
              action: 'INSERT', 
              recordId: payment.id, 
              payload: { 
                id: payment.id,
                debt_id: input.debtId,
                amount: payment.amount,
                date: payment.date,
                payment_method: payment.paymentMethod,
                account_id: payment.accountId,
                transfer_to_account_id: payment.transferToAccountId,
                external_payee: payment.externalPayee,
                receipt_url: payment.receipt,
                note: payment.note
              } 
            });
        }
        return;
      }

      const { data } = await supabase.auth.getUser();
      if (!data.user) throw new Error('No user');
      
      const state = useFinance.getState();
      const debt = state.debts.find(d => d.id === input.debtId);
      const generatedPayment = debt?.payments.find(p => p.date === input.payment.date && p.amount === input.payment.amount);

      if (!generatedPayment) throw new Error('Debt payment not found in local state');

      await insertDebtPaymentService(data.user.id, input.debtId, generatedPayment);
    },
    onMutate: async ({ debtId, payment }) => {
      await useFinance.getState().addDebtPayment(debtId, payment);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: financeKeys.debts() });
    },
    onError: () => {
      queryClient.invalidateQueries({ queryKey: financeKeys.debts() });
    },
  });

  const removeDebtPayment = useMutation<void, Error, RemoveDebtPaymentInput>({
    mutationFn: async ({ paymentId }) => {
      if (!isSupabaseEnabled || isOffline()) {
        useSyncStore
          .getState()
          .addMutation({ table: 'debt_payments', action: 'DELETE', recordId: paymentId });
        return;
      }
      const { data } = await supabase.auth.getUser();
      if (!data.user) throw new Error('No user');
      await deleteDebtPayment(data.user.id, paymentId);
    },
    onMutate: async ({ debtId, paymentId }) => {
      await useFinance.getState().removeDebtPayment(debtId, paymentId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: financeKeys.debts() });
    },
    onError: () => {
      queryClient.invalidateQueries({ queryKey: financeKeys.debts() });
    },
  });

  return { addDebt, updateDebt: updateDebtMutation, removeDebt, addDebtPayment, removeDebtPayment };
}
