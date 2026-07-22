import { useMemo, useCallback } from 'react';
import { useFinance } from '@/store/finance-store';
import { useAccounts, useTransactions, useFixedItems, useGoals, useDebts } from '@/hooks/useSupabaseQueries';
import { isSupabaseEnabled } from '@/lib/supabase';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/context/AuthContext';
import { Debt, DebtPayment } from '@/lib/finance';

function mergeById<T extends { id: string }>(primary: T[], secondary: T[]): T[] {
  if (secondary.length === 0) return primary;
  if (primary.length === 0) return secondary;
  const primaryIds = new Set(primary.map(p => p.id));
  return [...primary, ...secondary.filter(s => !primaryIds.has(s.id))];
}

export function useHybridData() {
  const { session } = useAuth();
  const queryClient = useQueryClient();

  const store = useFinance();

  const { data: remoteAccounts, isLoading: accountsLoading } = useAccounts();
  const { data: remoteTransactions, isLoading: transactionsLoading } = useTransactions();
  const { data: remoteFixedItems, isLoading: fixedItemsLoading } = useFixedItems();
  const { data: remoteGoals, isLoading: goalsLoading } = useGoals();
  const { data: remoteDebts, isLoading: debtsLoading } = useDebts();

  const isLoading = useMemo(() =>
    accountsLoading || transactionsLoading || fixedItemsLoading || goalsLoading || debtsLoading,
  [accountsLoading, transactionsLoading, fixedItemsLoading, goalsLoading, debtsLoading]);

  const isOnline = isSupabaseEnabled && !!session;

  const accounts = useMemo(() => {
    const remote = remoteAccounts;
    return isOnline && Array.isArray(remote) && remote.length > 0
      ? mergeById(remote, store.accounts)
      : store.accounts;
  }, [isOnline, remoteAccounts, store.accounts]);

  const transactions = useMemo(() => {
    const remote = remoteTransactions;
    return isOnline && Array.isArray(remote) && remote.length > 0
      ? mergeById(remote, store.transactions)
      : store.transactions;
  }, [isOnline, remoteTransactions, store.transactions]);

  const fixedItems = useMemo(() => {
    const remote = remoteFixedItems;
    return isOnline && Array.isArray(remote) && remote.length > 0
      ? mergeById(remote, store.fixedItems)
      : store.fixedItems;
  }, [isOnline, remoteFixedItems, store.fixedItems]);

  const goals = useMemo(() => {
    const remote = remoteGoals;
    return isOnline && Array.isArray(remote) && remote.length > 0
      ? mergeById(remote, store.goals)
      : store.goals;
  }, [isOnline, remoteGoals, store.goals]);

  const debts = useMemo(() => {
    const remote = remoteDebts;
    return isOnline && Array.isArray(remote) && remote.length > 0
      ? mergeById(remote, store.debts)
      : store.debts;
  }, [isOnline, remoteDebts, store.debts]);

  const invalidateAll = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['accounts'] });
    queryClient.invalidateQueries({ queryKey: ['transactions'] });
    queryClient.invalidateQueries({ queryKey: ['fixed_items'] });
    queryClient.invalidateQueries({ queryKey: ['goals'] });
    queryClient.invalidateQueries({ queryKey: ['debts'] });
  }, [queryClient]);

  const invalidateDebts = useCallback(() => queryClient.invalidateQueries({ queryKey: ['debts'] }), [queryClient]);

  const wrappedAddDebtPayment = useCallback(async (debtId: string, p: Omit<DebtPayment, 'id'>) => {
    const state = useFinance.getState();
    const storeDebts = state.debts;
    const inLocal = storeDebts.some(d => d.id === debtId);
    if (!inLocal) {
      const sourceDebt = debts.find(d => d.id === debtId);
      if (sourceDebt) {
        const groupKey = `${sourceDebt.person}|${sourceDebt.amount}|${sourceDebt.concept}`;
        const alreadyExists = storeDebts.some(d => `${d.person}|${d.amount}|${d.concept}` === groupKey);
        if (!alreadyExists) {
          useFinance.setState({ debts: [{ ...sourceDebt }, ...storeDebts] });
        }
      }
    }
    await state.addDebtPayment(debtId, p);
    invalidateDebts();
  }, [debts, invalidateDebts]);

  const wrappedAddDebt = useCallback(async (d: Omit<Debt, 'id' | 'payments'>) => {
    await useFinance.getState().addDebt(d);
    invalidateDebts();
  }, [invalidateDebts]);

  const wrappedUpdateDebt = useCallback(async (id: string, p: Partial<Debt>) => {
    await useFinance.getState().updateDebt(id, p);
    invalidateDebts();
  }, [invalidateDebts]);

  const wrappedRemoveDebt = useCallback(async (id: string) => {
    await useFinance.getState().removeDebt(id);
    invalidateDebts();
  }, [invalidateDebts]);

  const wrappedRemoveDebtPayment = useCallback(async (debtId: string, paymentId: string) => {
    const state = useFinance.getState();
    const storeDebts = state.debts;
    const inLocal = storeDebts.some(d => d.id === debtId);
    if (!inLocal) {
      const sourceDebt = debts.find(d => d.id === debtId);
      if (sourceDebt) {
        useFinance.setState({ debts: [{ ...sourceDebt }, ...storeDebts] });
      }
    }
    await state.removeDebtPayment(debtId, paymentId);
    invalidateDebts();
  }, [debts, invalidateDebts]);

  return {
    accounts,
    transactions,
    fixedItems,
    goals,
    debts,
    theme: store.theme,
    profile: store.profile,
    activeYear: store.activeYear,
    activeMonth: store.activeMonth,
    changeLog: store.changeLog,
    isLoading,
    isSupabaseEnabled,

    addAccount: store.addAccount, updateAccount: store.updateAccount, removeAccount: store.removeAccount, mergeAccounts: store.mergeAccounts,
    addTx: store.addTx, updateTx: store.updateTx, removeTx: store.removeTx,
    addFixed: store.addFixed, updateFixed: store.updateFixed, removeFixed: store.removeFixed, toggleFixed: store.toggleFixed,
    addGoal: store.addGoal, updateGoal: store.updateGoal, removeGoal: store.removeGoal, contributeGoal: store.contributeGoal,
    addDebt: wrappedAddDebt,
    updateDebt: wrappedUpdateDebt,
    removeDebt: wrappedRemoveDebt,
    addDebtPayment: wrappedAddDebtPayment,
    removeDebtPayment: wrappedRemoveDebtPayment,

    setProfile: store.setProfile, setTheme: store.setTheme, toggleTheme: store.toggleTheme,
    setActive: store.setActive, resetToToday: store.resetToToday,
    ensureScheduledTransactions: store.ensureScheduledTransactions,
    syncFiltersToURL: store.syncFiltersToURL, setSyncFiltersToURL: store.setSyncFiltersToURL,
    clearChangeLog: store.clearChangeLog,
    exportData: store.exportData, importData: store.importData, migrateReceiptsInPlace: store.migrateReceiptsInPlace, cleanupOrphanReceipts: store.cleanupOrphanReceipts,
    resetAll: store.resetAll, loadSettingsFromCloud: store.loadSettingsFromCloud, syncAllToCloud: store.syncAllToCloud,
    invalidateAll,
  };
}
