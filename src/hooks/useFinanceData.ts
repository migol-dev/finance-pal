import { useMemo } from 'react';
import { useFinance } from '@/store/finance-store';
import { useAuth } from '@/context/AuthContext';
import { isSupabaseEnabled } from '@/lib/supabase';
import { 
  useAccounts, 
  useTransactions, 
  useFixedItems, 
  useGoals, 
  useDebts 
} from '@/hooks/useSupabaseQueries';
import { Account, Transaction, FixedItem, Goal, Debt } from '@/lib/finance';

export function useFinanceData() {
  const { session } = useAuth();
  const isSupabase = isSupabaseEnabled && !!session;
  
  // React Query hooks (only enabled when Supabase is on)
  const accountsQuery = useAccounts();
  const transactionsQuery = useTransactions();
  const fixedItemsQuery = useFixedItems();
  const goalsQuery = useGoals();
  const debtsQuery = useDebts();
  
  // Zustand store (always available)
  const zustand = useFinance();
  
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
  const isLoading = isSupabase && (
    accountsQuery.isLoading || 
    transactionsQuery.isLoading || 
    fixedItemsQuery.isLoading || 
    goalsQuery.isLoading || 
    debtsQuery.isLoading
  );
  
  const isError = isSupabase && (
    accountsQuery.isError || 
    transactionsQuery.isError || 
    fixedItemsQuery.isError || 
    goalsQuery.isError || 
    debtsQuery.isError
  );
  
  const error = accountsQuery.error || transactionsQuery.error || 
                fixedItemsQuery.error || goalsQuery.error || debtsQuery.error;
  
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