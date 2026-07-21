import { useFinance } from '@/store/finance-store';
import { useAccounts, useTransactions, useFixedItems, useGoals, useDebts } from '@/hooks/useSupabaseQueries';
import { isSupabaseEnabled } from '@/lib/supabase';
import { useQueryClient } from '@tanstack/react-query';
import { Account, Transaction, FixedItem, Goal, Debt } from '@/lib/finance';

export function useHybridData() {
  const queryClient = useQueryClient();
  const { 
    accounts: localAccounts, 
    transactions: localTransactions,
    fixedItems: localFixedItems,
    goals: localGoals,
    debts: localDebts,
    // mutations
    addAccount, updateAccount, removeAccount, mergeAccounts,
    addTx, updateTx, removeTx,
    addFixed, updateFixed, removeFixed, toggleFixed,
    addGoal, updateGoal, removeGoal, contributeGoal,
    addDebt, updateDebt, removeDebt, addDebtPayment, removeDebtPayment,
    // other state
    theme, profile, activeYear, activeMonth, setActive, resetToToday,
    setProfile, setTheme, toggleTheme,
    ensureScheduledTransactions,
    syncFiltersToURL, setSyncFiltersToURL,
    changeLog, clearChangeLog,
    exportData, importData, migrateReceiptsInPlace, cleanupOrphanReceipts,
    resetAll,
  } = useFinance();

  // React Query hooks (only fetch when Supabase enabled)
  const { data: remoteAccounts, isLoading: accountsLoading } = useAccounts();
  const { data: remoteTransactions, isLoading: transactionsLoading } = useTransactions();
  const { data: remoteFixedItems, isLoading: fixedItemsLoading } = useFixedItems();
  const { data: remoteGoals, isLoading: goalsLoading } = useGoals();
  const { data: remoteDebts, isLoading: debtsLoading } = useDebts();

  const isLoading = accountsLoading || transactionsLoading || fixedItemsLoading || goalsLoading || debtsLoading;

  // Use remote data when Supabase enabled and has actual items, otherwise local
  const hasItems = (d: unknown): d is any[] => Array.isArray(d) && d.length > 0;
  const accounts = (isSupabaseEnabled && !isLoading && hasItems(remoteAccounts)) ? remoteAccounts : localAccounts;
  const transactions = (isSupabaseEnabled && !isLoading && hasItems(remoteTransactions)) ? remoteTransactions : localTransactions;
  const fixedItems = (isSupabaseEnabled && !isLoading && hasItems(remoteFixedItems)) ? remoteFixedItems : localFixedItems;
  const goals = (isSupabaseEnabled && !isLoading && hasItems(remoteGoals)) ? remoteGoals : localGoals;

  // Merge local debts not yet synced to Supabase (e.g. non-UUID IDs) with remote debts.
  // For debts that exist in both local and remote (matched by person+amount+concept),
  // merge unsynced local payments into the remote debt so pending payments don't disappear.
  const debts = (isSupabaseEnabled && !isLoading && hasItems(remoteDebts))
    ? (() => {
        const remoteById = new Map(remoteDebts.map((d: Debt) => [d.id, d]));
        const localByGroupKey = new Map(localDebts.map((d: Debt) => [`${d.person}|${d.amount}|${d.concept}`, d]));
        const merged = remoteDebts.map((remote: Debt) => {
          const groupKey = `${remote.person}|${remote.amount}|${remote.concept}`;
          const local = localByGroupKey.get(groupKey);
          if (!local) return remote;
          // Merge payments from local that aren't already in the remote debt
          const remotePaymentIds = new Set(remote.payments.map(p => p.id));
          const unsynced = local.payments.filter(p => !remotePaymentIds.has(p.id));
          if (unsynced.length === 0) return remote;
          return { ...remote, payments: [...unsynced, ...remote.payments] };
        });
        const remoteGroupKeys = new Set(remoteDebts.map((d: Debt) => `${d.person}|${d.amount}|${d.concept}`));
        const localOnly = localDebts.filter((d: Debt) =>
          !remoteById.has(d.id) && !remoteGroupKeys.has(`${d.person}|${d.amount}|${d.concept}`)
        );
        return [...merged, ...localOnly];
      })()
    : localDebts;

  const invalidateDebts = () => queryClient.invalidateQueries({ queryKey: ['debts'] });

  const wrappedAddDebtPayment = async (debtId: string, p: Omit<import('@/lib/finance').DebtPayment, 'id'>) => {
    await addDebtPayment(debtId, p);
    invalidateDebts();
  };

  const wrappedAddDebt = async (d: Omit<Debt, 'id' | 'payments'>) => {
    await addDebt(d);
    invalidateDebts();
  };

  const wrappedUpdateDebt = async (id: string, p: Partial<Debt>) => {
    await updateDebt(id, p);
    invalidateDebts();
  };

  const wrappedRemoveDebt = async (id: string) => {
    await removeDebt(id);
    invalidateDebts();
  };

  const wrappedRemoveDebtPayment = async (debtId: string, paymentId: string) => {
    await removeDebtPayment(debtId, paymentId);
    invalidateDebts();
  };

  return {
    // Data
    accounts,
    transactions,
    fixedItems,
    goals,
    debts,
    theme,
    profile,
    activeYear,
    activeMonth,
    changeLog,
    isLoading,
    isSupabaseEnabled,
    
    // Mutations (always use local store mutations which handle sync)
    addAccount, updateAccount, removeAccount, mergeAccounts,
    addTx, updateTx, removeTx,
    addFixed, updateFixed, removeFixed, toggleFixed,
    addGoal, updateGoal, removeGoal, contributeGoal,
    addDebt: wrappedAddDebt,
    updateDebt: wrappedUpdateDebt,
    removeDebt: wrappedRemoveDebt,
    addDebtPayment: wrappedAddDebtPayment,
    removeDebtPayment: wrappedRemoveDebtPayment,
    
    // Other actions
    setProfile, setTheme, toggleTheme,
    setActive, resetToToday,
    ensureScheduledTransactions,
    syncFiltersToURL, setSyncFiltersToURL,
    clearChangeLog,
    exportData, importData, migrateReceiptsInPlace, cleanupOrphanReceipts,
    resetAll,
  };
}