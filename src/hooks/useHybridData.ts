import { useFinance } from '@/store/finance-store';
import { useAccounts, useTransactions, useFixedItems, useGoals, useDebts } from '@/hooks/useSupabaseQueries';
import { isSupabaseEnabled } from '@/lib/supabase';
import { Account, Transaction, FixedItem, Goal, Debt } from '@/lib/finance';

export function useHybridData() {
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

  // Use remote data when Supabase enabled and data loaded, otherwise local
  const accounts = (isSupabaseEnabled && !isLoading && remoteAccounts) ? remoteAccounts : localAccounts;
  const transactions = (isSupabaseEnabled && !isLoading && remoteTransactions) ? remoteTransactions : localTransactions;
  const fixedItems = (isSupabaseEnabled && !isLoading && remoteFixedItems) ? remoteFixedItems : localFixedItems;
  const goals = (isSupabaseEnabled && !isLoading && remoteGoals) ? remoteGoals : localGoals;
  const debts = (isSupabaseEnabled && !isLoading && remoteDebts) ? remoteDebts : localDebts;

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
    addDebt, updateDebt, removeDebt, addDebtPayment, removeDebtPayment,
    
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