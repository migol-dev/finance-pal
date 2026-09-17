import { useMemo } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { useFinance } from '@/store/finance-store';
import type { ExportScopes } from '@/store/finance-store';
import { useAuth } from '@/context/AuthContext';
import { isSupabaseEnabled } from '@/lib/supabase';
import {
  useAccounts,
  useTransactions,
  useFixedItems,
  useGoals,
  useDebts,
} from '@/hooks/useSupabaseQueries';
import type {
  Account,
  Transaction,
  FixedItem,
  Goal,
  Debt,
  DebtPayment,
  ThemeMode,
  UserProfile,
  ChangeLogEntry,
} from '@/lib/finance';

type FinanceDataSelection = {
  accounts: Account[];
  transactions: Transaction[];
  fixedItems: FixedItem[];
  goals: Goal[];
  debts: Debt[];
  theme: ThemeMode;
  profile: UserProfile;
  activeYear: number;
  activeMonth: number;
  syncFiltersToURL: boolean;
  changeLog: ChangeLogEntry[];
  addAccount: (a: Omit<Account, 'id'>) => void;
  updateAccount: (id: string, p: Partial<Account>) => void;
  removeAccount: (id: string) => void;
  mergeAccounts: (fromIds: string[], intoId: string) => void;
  addTx: (t: Omit<Transaction, 'id'>) => Promise<void>;
  updateTx: (id: string, p: Partial<Transaction>) => Promise<void>;
  removeTx: (id: string) => Promise<void>;
  addFixed: (i: Omit<FixedItem, 'id'>) => void;
  updateFixed: (id: string, p: Partial<FixedItem>) => void;
  removeFixed: (id: string) => void;
  toggleFixed: (id: string) => void;
  addGoal: (g: Omit<Goal, 'id'>) => void;
  updateGoal: (id: string, p: Partial<Goal>) => void;
  removeGoal: (id: string) => void;
  contributeGoal: (id: string, amount: number, date?: string, accountId?: string) => void;
  addDebt: (d: Omit<Debt, 'id' | 'payments'>) => void;
  updateDebt: (id: string, p: Partial<Debt>) => void;
  removeDebt: (id: string) => void;
  addDebtPayment: (debtId: string, p: Omit<DebtPayment, 'id'>) => void;
  removeDebtPayment: (debtId: string, paymentId: string) => void;
  setTheme: (t: ThemeMode) => void;
  toggleTheme: () => void;
  setProfile: (p: Partial<UserProfile>) => void;
  setActive: (year: number, month: number) => void;
  resetToToday: () => void;
  ensureScheduledTransactions: () => void;
  setSyncFiltersToURL: (v: boolean) => void;
  clearChangeLog: () => void;
  exportData: (scopes?: ExportScopes) => string;
  importData: (
    json: string,
    scopes?: ExportScopes,
  ) => Promise<{ ok: boolean; error?: string; warnings?: string[] }>;
  resetAll: () => void;
  migrateReceiptsInPlace: () => Promise<void>;
  cleanupOrphanReceipts: (
    deleteFiles?: boolean,
  ) => Promise<{ orphans: string[]; freedBytes: number }>;
};

export function useFinanceData() {
  const { session } = useAuth();
  const isSupabase = isSupabaseEnabled && !!session;

  // React Query hooks (only enabled when Supabase is on)
  const accountsQuery = useAccounts();
  const transactionsQuery = useTransactions();
  const fixedItemsQuery = useFixedItems();
  const goalsQuery = useGoals();
  const debtsQuery = useDebts();

  // Zustand store (atomic subscription - only re-renders on used slices)
  const zustand = useFinance(
    useShallow((state): FinanceDataSelection => ({
      accounts: state.accounts,
      transactions: state.transactions,
      fixedItems: state.fixedItems,
      goals: state.goals,
      debts: state.debts,
      theme: state.theme,
      profile: state.profile,
      activeYear: state.activeYear,
      activeMonth: state.activeMonth,
      syncFiltersToURL: state.syncFiltersToURL,
      changeLog: state.changeLog,
      addAccount: state.addAccount,
      updateAccount: state.updateAccount,
      removeAccount: state.removeAccount,
      mergeAccounts: state.mergeAccounts,
      addTx: state.addTx,
      updateTx: state.updateTx,
      removeTx: state.removeTx,
      addFixed: state.addFixed,
      updateFixed: state.updateFixed,
      removeFixed: state.removeFixed,
      toggleFixed: state.toggleFixed,
      addGoal: state.addGoal,
      updateGoal: state.updateGoal,
      removeGoal: state.removeGoal,
      contributeGoal: state.contributeGoal,
      addDebt: state.addDebt,
      updateDebt: state.updateDebt,
      removeDebt: state.removeDebt,
      addDebtPayment: state.addDebtPayment,
      removeDebtPayment: state.removeDebtPayment,
      setTheme: state.setTheme,
      toggleTheme: state.toggleTheme,
      setProfile: state.setProfile,
      setActive: state.setActive,
      resetToToday: state.resetToToday,
      ensureScheduledTransactions: state.ensureScheduledTransactions,
      setSyncFiltersToURL: state.setSyncFiltersToURL,
      clearChangeLog: state.clearChangeLog,
      exportData: state.exportData,
      importData: state.importData,
      resetAll: state.resetAll,
      migrateReceiptsInPlace: state.migrateReceiptsInPlace,
      cleanupOrphanReceipts: state.cleanupOrphanReceipts,
    })),
  );

  // Merge data: Supabase takes priority when enabled and data loaded
  const accounts = useMemo((): Account[] => {
    if (isSupabase && accountsQuery.data) return accountsQuery.data;
    return zustand.accounts;
  }, [isSupabase, accountsQuery.data, zustand.accounts]);

  const transactions = useMemo((): Transaction[] => {
    if (isSupabase && transactionsQuery.data) return transactionsQuery.data;
    return zustand.transactions;
  }, [isSupabase, transactionsQuery.data, zustand.transactions]);

  const fixedItems = useMemo((): FixedItem[] => {
    if (isSupabase && fixedItemsQuery.data) return fixedItemsQuery.data;
    return zustand.fixedItems;
  }, [isSupabase, fixedItemsQuery.data, zustand.fixedItems]);

  const goals = useMemo((): Goal[] => {
    if (isSupabase && goalsQuery.data) return goalsQuery.data;
    return zustand.goals;
  }, [isSupabase, goalsQuery.data, zustand.goals]);

  const debts = useMemo((): Debt[] => {
    if (isSupabase && debtsQuery.data) return debtsQuery.data;
    return zustand.debts;
  }, [isSupabase, debtsQuery.data, zustand.debts]);

  // Loading states
  const isLoading =
    isSupabase &&
    (accountsQuery.isLoading ||
      transactionsQuery.isLoading ||
      fixedItemsQuery.isLoading ||
      goalsQuery.isLoading ||
      debtsQuery.isLoading);

  const isError =
    isSupabase &&
    (accountsQuery.isError ||
      transactionsQuery.isError ||
      fixedItemsQuery.isError ||
      goalsQuery.isError ||
      debtsQuery.isError);

  const error =
    accountsQuery.error ||
    transactionsQuery.error ||
    fixedItemsQuery.error ||
    goalsQuery.error ||
    debtsQuery.error;

  return {
    // Data
    accounts,
    transactions,
    fixedItems,
    goals,
    debts,

    // Zustand mutations (always work - sync to Supabase internally)
    addAccount: zustand.addAccount,
    updateAccount: zustand.updateAccount,
    removeAccount: zustand.removeAccount,
    mergeAccounts: zustand.mergeAccounts,

    addTx: zustand.addTx,
    updateTx: zustand.updateTx,
    removeTx: zustand.removeTx,

    addFixed: zustand.addFixed,
    updateFixed: zustand.updateFixed,
    removeFixed: zustand.removeFixed,
    toggleFixed: zustand.toggleFixed,

    addGoal: zustand.addGoal,
    updateGoal: zustand.updateGoal,
    removeGoal: zustand.removeGoal,
    contributeGoal: zustand.contributeGoal,

    addDebt: zustand.addDebt,
    updateDebt: zustand.updateDebt,
    removeDebt: zustand.removeDebt,
    addDebtPayment: zustand.addDebtPayment,
    removeDebtPayment: zustand.removeDebtPayment,

    // Other Zustand state
    theme: zustand.theme,
    setTheme: zustand.setTheme,
    toggleTheme: zustand.toggleTheme,
    profile: zustand.profile,
    setProfile: zustand.setProfile,
    activeYear: zustand.activeYear,
    activeMonth: zustand.activeMonth,
    setActive: zustand.setActive,
    resetToToday: zustand.resetToToday,
    ensureScheduledTransactions: zustand.ensureScheduledTransactions,
    syncFiltersToURL: zustand.syncFiltersToURL,
    setSyncFiltersToURL: zustand.setSyncFiltersToURL,
    changeLog: zustand.changeLog,
    clearChangeLog: zustand.clearChangeLog,
    exportData: zustand.exportData,
    importData: zustand.importData,
    resetAll: zustand.resetAll,
    migrateReceiptsInPlace: zustand.migrateReceiptsInPlace,
    cleanupOrphanReceipts: zustand.cleanupOrphanReceipts,

    // Query states
    isLoading,
    isError,
    error,

    // Refresh functions
    refetch: () => {
      accountsQuery.refetch();
      transactionsQuery.refetch();
      fixedItemsQuery.refetch();
      goalsQuery.refetch();
      debtsQuery.refetch();
    },
  };
}
