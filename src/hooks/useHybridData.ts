import { useMemo, useCallback } from 'react';
import { useFinance } from '@/store/finance-store';
import { useAccounts, useTransactions, useFixedItems, useGoals, useGoalFolders, useDebts } from '@/hooks/useSupabaseQueries';
import { isSupabaseEnabled } from '@/lib/supabase';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/context/AuthContext';
import { Debt, DebtPayment, GoalFolder } from '@/lib/finance';

function mergeById<T extends { id: string }>(primary: T[], secondary: T[]): T[] {
  if (secondary.length === 0) return primary;
  if (primary.length === 0) return secondary;
  const primaryIds = new Set(primary.map(p => p.id));
  return [...primary, ...secondary.filter(s => !primaryIds.has(s.id))];
}

function mergeGoals(primary: any[], secondary: any[]): any[] {
  if (secondary.length === 0) return primary;
  if (primary.length === 0) return secondary;
  const primaryMap = new Map(primary.map(p => [p.id, p]));
  const secondaryMap = new Map(secondary.map(s => [s.id, s]));
  const allIds = new Set([...primaryMap.keys(), ...secondaryMap.keys()]);
  
  return Array.from(allIds).map(id => {
    const p = primaryMap.get(id); // remote
    const s = secondaryMap.get(id); // local
    if (!p) return s;
    if (!s) return p;
    return {
      ...s,
      ...p,
      saved: (typeof p.saved === 'number' && p.saved > 0) ? p.saved : (s.saved ?? 0),
      contributions: [...(p.contributions ?? []), ...(s.contributions ?? [])].filter(
        (c, i, arr) => arr.findIndex(x => x.id === c.id) === i
      ),
    };
  });
}

export function useHybridData() {
  const { session } = useAuth();
  const queryClient = useQueryClient();

  const store = useFinance();

  const { data: remoteAccounts, isLoading: accountsLoading } = useAccounts();
  const { data: remoteTransactions, isLoading: transactionsLoading } = useTransactions();
  const { data: remoteFixedItems, isLoading: fixedItemsLoading } = useFixedItems();
  const { data: remoteGoals, isLoading: goalsLoading } = useGoals();
  const { data: remoteGoalFolders, isLoading: goalFoldersLoading } = useGoalFolders();
  const { data: remoteDebts, isLoading: debtsLoading } = useDebts();

  const isLoading = useMemo(() =>
    accountsLoading || transactionsLoading || fixedItemsLoading || goalsLoading || goalFoldersLoading || debtsLoading,
  [accountsLoading, transactionsLoading, fixedItemsLoading, goalsLoading, goalFoldersLoading, debtsLoading]);

  const isOnline = isSupabaseEnabled && !!session;

  const accounts = useMemo(() => {
    const remote = remoteAccounts;
    return isOnline && Array.isArray(remote)
      ? mergeById(remote, store.accounts)
      : store.accounts;
  }, [isOnline, remoteAccounts, store.accounts]);

  const transactions = useMemo(() => {
    const remote = remoteTransactions;
    return isOnline && Array.isArray(remote)
      ? mergeById(remote, store.transactions)
      : store.transactions;
  }, [isOnline, remoteTransactions, store.transactions]);

  const fixedItems = useMemo(() => {
    const remote = remoteFixedItems;
    return isOnline && Array.isArray(remote)
      ? mergeById(remote, store.fixedItems)
      : store.fixedItems;
  }, [isOnline, remoteFixedItems, store.fixedItems]);

  const goals = useMemo(() => {
    const remote = remoteGoals;
    return isOnline && Array.isArray(remote)
      ? mergeGoals(remote, store.goals)
      : store.goals;
  }, [isOnline, remoteGoals, store.goals]);

  const goalFolders = useMemo(() => {
    const remote = remoteGoalFolders;
    return isOnline && Array.isArray(remote)
      ? mergeById(remote, store.goalFolders)
      : store.goalFolders;
  }, [isOnline, remoteGoalFolders, store.goalFolders]);

  const debts = useMemo(() => {
    const remote = remoteDebts;
    return isOnline && Array.isArray(remote)
      ? mergeById(remote, store.debts)
      : store.debts;
  }, [isOnline, remoteDebts, store.debts]);

  const invalidateAll = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['accounts'] });
    queryClient.invalidateQueries({ queryKey: ['transactions'] });
    queryClient.invalidateQueries({ queryKey: ['fixed_items'] });
    queryClient.invalidateQueries({ queryKey: ['goals'] });
    queryClient.invalidateQueries({ queryKey: ['goal_folders'] });
    queryClient.invalidateQueries({ queryKey: ['debts'] });
  }, [queryClient]);

  const invalidateAccounts = useCallback(() => queryClient.invalidateQueries({ queryKey: ['accounts'] }), [queryClient]);
  const invalidateTransactions = useCallback(() => queryClient.invalidateQueries({ queryKey: ['transactions'] }), [queryClient]);
  const invalidateFixedItems = useCallback(() => queryClient.invalidateQueries({ queryKey: ['fixed_items'] }), [queryClient]);
  const invalidateGoals = useCallback(() => queryClient.invalidateQueries({ queryKey: ['goals'] }), [queryClient]);
  const invalidateGoalFolders = useCallback(() => queryClient.invalidateQueries({ queryKey: ['goal_folders'] }), [queryClient]);
  const invalidateDebts = useCallback(() => queryClient.invalidateQueries({ queryKey: ['debts'] }), [queryClient]);

  // Wrapped folder mutations
  const wrappedAddGoalFolder = useCallback(async (f: Omit<GoalFolder, 'id'>) => {
    await store.addGoalFolder(f);
    invalidateGoalFolders();
  }, [store, invalidateGoalFolders]);

  const wrappedUpdateGoalFolder = useCallback(async (id: string, p: Partial<GoalFolder>) => {
    await store.updateGoalFolder(id, p);
    invalidateGoalFolders();
  }, [store, invalidateGoalFolders]);

  const wrappedRemoveGoalFolder = useCallback(async (id: string) => {
    await store.removeGoalFolder(id);
    invalidateGoalFolders();
    invalidateGoals();
  }, [store, invalidateGoalFolders, invalidateGoals]);

  const wrappedReorderGoalFolders = useCallback((folders: GoalFolder[]) => {
    store.reorderGoalFolders(folders);
    invalidateGoalFolders();
  }, [store, invalidateGoalFolders]);

  // Wrapped goal mutations
  const wrappedAddGoal = useCallback(async (g: any) => {
    await store.addGoal(g);
    invalidateGoals();
  }, [store, invalidateGoals]);

  const wrappedUpdateGoal = useCallback(async (id: string, p: any) => {
    await store.updateGoal(id, p);
    invalidateGoals();
  }, [store, invalidateGoals]);

  const wrappedRemoveGoal = useCallback(async (id: string) => {
    await store.removeGoal(id);
    invalidateGoals();
  }, [store, invalidateGoals]);

  const wrappedContributeGoal = useCallback((id: string, amount: number, date?: string, accountId?: string) => {
    store.contributeGoal(id, amount, date, accountId);
    invalidateGoals();
    invalidateTransactions();
  }, [store, invalidateGoals, invalidateTransactions]);

  // Wrapped account mutations
  const wrappedAddAccount = useCallback(async (a: any) => {
    await store.addAccount(a);
    invalidateAccounts();
  }, [store, invalidateAccounts]);

  const wrappedUpdateAccount = useCallback(async (id: string, p: any) => {
    await store.updateAccount(id, p);
    invalidateAccounts();
  }, [store, invalidateAccounts]);

  const wrappedRemoveAccount = useCallback(async (id: string) => {
    await store.removeAccount(id);
    invalidateAccounts();
  }, [store, invalidateAccounts]);

  const wrappedMergeAccounts = useCallback(async (sourceId: string, targetId: string) => {
    await store.mergeAccounts(sourceId, targetId);
    invalidateAccounts();
    invalidateTransactions();
  }, [store, invalidateAccounts, invalidateTransactions]);

  // Wrapped transaction mutations
  const wrappedAddTx = useCallback(async (t: any) => {
    await store.addTx(t);
    invalidateTransactions();
  }, [store, invalidateTransactions]);

  const wrappedUpdateTx = useCallback(async (id: string, p: any) => {
    await store.updateTx(id, p);
    invalidateTransactions();
  }, [store, invalidateTransactions]);

  const wrappedRemoveTx = useCallback(async (id: string) => {
    await store.removeTx(id);
    invalidateTransactions();
  }, [store, invalidateTransactions]);

  // Wrapped fixed item mutations
  const wrappedAddFixed = useCallback(async (f: any) => {
    await store.addFixed(f);
    invalidateFixedItems();
  }, [store, invalidateFixedItems]);

  const wrappedUpdateFixed = useCallback(async (id: string, p: any) => {
    await store.updateFixed(id, p);
    invalidateFixedItems();
  }, [store, invalidateFixedItems]);

  const wrappedRemoveFixed = useCallback(async (id: string) => {
    await store.removeFixed(id);
    invalidateFixedItems();
  }, [store, invalidateFixedItems]);

  const wrappedToggleFixed = useCallback(async (id: string) => {
    await store.toggleFixed(id);
    invalidateFixedItems();
  }, [store, invalidateFixedItems]);

  // Wrapped debt mutations
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
    goalFolders,
    debts,
    theme: store.theme,
    profile: store.profile,
    activeYear: store.activeYear,
    activeMonth: store.activeMonth,
    changeLog: store.changeLog,
    isLoading,
    isSupabaseEnabled,

    addAccount: wrappedAddAccount, updateAccount: wrappedUpdateAccount, removeAccount: wrappedRemoveAccount, mergeAccounts: wrappedMergeAccounts,
    addTx: wrappedAddTx, updateTx: wrappedUpdateTx, removeTx: wrappedRemoveTx,
    addFixed: wrappedAddFixed, updateFixed: wrappedUpdateFixed, removeFixed: wrappedRemoveFixed, toggleFixed: wrappedToggleFixed,
    addGoal: wrappedAddGoal, updateGoal: wrappedUpdateGoal, removeGoal: wrappedRemoveGoal, contributeGoal: wrappedContributeGoal,
    addGoalFolder: wrappedAddGoalFolder, updateGoalFolder: wrappedUpdateGoalFolder, removeGoalFolder: wrappedRemoveGoalFolder, reorderGoalFolders: wrappedReorderGoalFolders,
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
