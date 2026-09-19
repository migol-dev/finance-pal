import { useEffect, useMemo, useRef } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { generateSecureId } from '@/lib/sanitizers';
import { useFinance } from '@/store/finance-store';
import type { ExportScopes } from '@/store/finance-store';
import { isSupabaseEnabled } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { useAccountsQuery } from '@/hooks/queries/useAccountsQuery';
import { useTransactionsQuery } from '@/hooks/queries/useTransactionsQuery';
import { useFixedItemsQuery } from '@/hooks/queries/useFixedItemsQuery';
import { useGoalsQuery } from '@/hooks/queries/useGoalsQuery';
import { useGoalFoldersQuery } from '@/hooks/queries/useGoalFoldersQuery';
import { useDebtsQuery } from '@/hooks/queries/useDebtsQuery';
import { useAccountMutations } from '@/hooks/mutations/useAccountMutations';
import { useTransactionMutations } from '@/hooks/mutations/useTransactionMutations';
import { useFixedItemMutations } from '@/hooks/mutations/useFixedItemMutations';
import { useGoalMutations } from '@/hooks/mutations/useGoalMutations';
import { useGoalFolderMutations } from '@/hooks/mutations/useGoalFolderMutations';
import { useDebtMutations } from '@/hooks/mutations/useDebtMutations';
import { useCloudSyncMutations } from '@/hooks/mutations/useCloudSyncMutations';
import { useReceiptMutations } from '@/hooks/mutations/useReceiptMutations';
import type {
  UploadReceiptForTransactionInput,
  DeleteReceiptForTransactionInput,
} from '@/hooks/mutations/useReceiptMutations';
import { fetchUserSettings, upsertUserSettings } from '@/services/settings.service';
import type {
  Account,
  Transaction,
  FixedItem,
  Goal,
  GoalFolder,
  Debt,
  DebtPayment,
  ThemeMode,
  UserProfile,
  ChangeLogEntry,
  AppSettings,
  AccentColor,
} from '@/lib/finance';

// Hook fachada: único punto de entrada para componentes y páginas.
// - Datos de servidor: React Query como fuente de verdad cuando Supabase está habilitado.
// - Mutations: hooks de mutations (optimistic update en Zustand + red + invalidación).
// - Estado UI y operaciones locales: Zustand (nunca toca la red).

type UiSelection = {
  accounts: Account[];
  transactions: Transaction[];
  fixedItems: FixedItem[];
  goals: Goal[];
  goalFolders: GoalFolder[];
  debts: Debt[];
  theme: ThemeMode;
  profile: UserProfile;
  activeYear: number;
  activeMonth: number;
  syncFiltersToURL: boolean;
  changeLog: ChangeLogEntry[];
  appSettings: AppSettings;
  setTheme: (t: ThemeMode) => void;
  toggleTheme: () => void;
  setProfile: (p: Partial<UserProfile>) => void;
  setActive: (year: number, month: number) => void;
  resetToToday: () => void;
  ensureScheduledTransactions: () => void;
  setSyncFiltersToURL: (v: boolean) => void;
  setAccentColor: (color: AccentColor) => void;
  setCompactMode: (compact: boolean) => void;
  setGlassEffect: (glass: boolean) => void;
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
  const userId = session?.user?.id;
  const isSupabase = isSupabaseEnabled && !!session;

  // --- Queries (solo lectura) ---
  const accountsQuery = useAccountsQuery();
  const transactionsQuery = useTransactionsQuery();
  const fixedItemsQuery = useFixedItemsQuery();
  const goalsQuery = useGoalsQuery();
  const goalFoldersQuery = useGoalFoldersQuery();
  const debtsQuery = useDebtsQuery();

  // --- Mutations (escritura) ---
  const accountM = useAccountMutations();
  const txM = useTransactionMutations();
  const fixedM = useFixedItemMutations();
  const goalM = useGoalMutations();
  const folderM = useGoalFolderMutations();
  const debtM = useDebtMutations();
  const cloudSyncM = useCloudSyncMutations();
  const receiptM = useReceiptMutations();

  // --- Estado UI + datos locales (Zustand, sin red) ---
  const ui = useFinance(
    useShallow((state): UiSelection => ({
      accounts: state.accounts,
      transactions: state.transactions,
      fixedItems: state.fixedItems,
      goals: state.goals,
      goalFolders: state.goalFolders,
      debts: state.debts,
      theme: state.theme,
      profile: state.profile,
      activeYear: state.activeYear,
      activeMonth: state.activeMonth,
      syncFiltersToURL: state.syncFiltersToURL,
      changeLog: state.changeLog,
      appSettings: state.appSettings,
      setTheme: state.setTheme,
      toggleTheme: state.toggleTheme,
      setProfile: state.setProfile,
      setActive: state.setActive,
      resetToToday: state.resetToToday,
      ensureScheduledTransactions: state.ensureScheduledTransactions,
      setSyncFiltersToURL: state.setSyncFiltersToURL,
      setAccentColor: state.setAccentColor,
      setCompactMode: state.setCompactMode,
      setGlassEffect: state.setGlassEffect,
      clearChangeLog: state.clearChangeLog,
      exportData: state.exportData,
      importData: state.importData,
      resetAll: state.resetAll,
      migrateReceiptsInPlace: state.migrateReceiptsInPlace,
      cleanupOrphanReceipts: state.cleanupOrphanReceipts,
    })),
  );

  // --- Sincronización de settings con la nube (Fase 8) ---
  // Los slices ya no tocan la red: la carga inicial y el upsert reactivo viven aquí.
  const settingsReadyFor = useRef<string | null>(null);

  // Carga inicial al detectar sesión: aplica theme/profile guardados en la nube.
  useEffect(() => {
    if (!isSupabaseEnabled || !userId) return;
    if (settingsReadyFor.current === userId) return;
    fetchUserSettings(userId)
      .then((remote) => {
        if (!remote) return;
        const store = useFinance.getState();
        store.setTheme(remote.theme);
        store.setProfile(remote.profile);
      })
      .catch(() => {})
      .finally(() => {
        settingsReadyFor.current = userId;
      });
  }, [userId]);

  // Upsert reactivo: cuando theme/profile locales cambian, se suben a user_settings.
  useEffect(() => {
    if (!isSupabaseEnabled || !userId) return;
    if (settingsReadyFor.current !== userId) return; // espera la carga inicial
    upsertUserSettings(userId, { theme: ui.theme, profile: ui.profile }).catch(() => {});
  }, [userId, ui.theme, ui.profile]);

  // --- Datos: React Query es la fuente de verdad cuando hay sesión ---
  const accounts = useMemo((): Account[] => {
    if (isSupabase && accountsQuery.data) return accountsQuery.data;
    return ui.accounts;
  }, [isSupabase, accountsQuery.data, ui.accounts]);

  const transactions = useMemo((): Transaction[] => {
    if (isSupabase && transactionsQuery.data) return transactionsQuery.data;
    return ui.transactions;
  }, [isSupabase, transactionsQuery.data, ui.transactions]);

  const fixedItems = useMemo((): FixedItem[] => {
    if (isSupabase && fixedItemsQuery.data) return fixedItemsQuery.data;
    return ui.fixedItems;
  }, [isSupabase, fixedItemsQuery.data, ui.fixedItems]);

  const goals = useMemo((): Goal[] => {
    if (isSupabase && goalsQuery.data) return goalsQuery.data;
    return ui.goals;
  }, [isSupabase, goalsQuery.data, ui.goals]);

  const goalFolders = useMemo((): GoalFolder[] => {
    if (isSupabase && goalFoldersQuery.data) return goalFoldersQuery.data;
    return ui.goalFolders;
  }, [isSupabase, goalFoldersQuery.data, ui.goalFolders]);

  const debts = useMemo((): Debt[] => {
    if (isSupabase && debtsQuery.data) return debtsQuery.data;
    return ui.debts;
  }, [isSupabase, debtsQuery.data, ui.debts]);

  // --- Estado de carga del servidor ---
  const isLoading =
    isSupabase &&
    (accountsQuery.isLoading ||
      transactionsQuery.isLoading ||
      fixedItemsQuery.isLoading ||
      goalsQuery.isLoading ||
      goalFoldersQuery.isLoading ||
      debtsQuery.isLoading);

  const isError =
    isSupabase &&
    (accountsQuery.isError ||
      transactionsQuery.isError ||
      fixedItemsQuery.isError ||
      goalsQuery.isError ||
      goalFoldersQuery.isError ||
      debtsQuery.isError);

  const error =
    accountsQuery.error ||
    transactionsQuery.error ||
    fixedItemsQuery.error ||
    goalsQuery.error ||
    goalFoldersQuery.error ||
    debtsQuery.error ||
    null;

  const refetchAll = () => {
    accountsQuery.refetch();
    transactionsQuery.refetch();
    fixedItemsQuery.refetch();
    goalsQuery.refetch();
    goalFoldersQuery.refetch();
    debtsQuery.refetch();
  };

  return {
    // --- Datos de servidor (React Query como source of truth) ---
    accounts,
    transactions,
    fixedItems,
    goals,
    goalFolders,
    debts,

    // --- Estado de carga del servidor ---
    isLoading,
    isError,
    error,
    refetchAll,
    refetch: refetchAll,

    // --- Mutations de red (optimistic update + Supabase + invalidación) ---
    addAccount: (a: Omit<Account, 'id'>) => {
      const payload = { ...a, id: generateSecureId() } as Account;
      return accountM.addAccount.mutateAsync(payload);
    },
    updateAccount: (id: string, patch: Partial<Account>) =>
      accountM.updateAccount.mutateAsync({ id, patch }),
    removeAccount: (id: string) => accountM.removeAccount.mutateAsync(id),
    mergeAccounts: (fromIds: string[], intoId: string) =>
      accountM.mergeAccounts.mutateAsync({ fromIds, intoId }),

    // transactions
    addTx: (t: Omit<Transaction, 'id'>) => {
      const payload = { ...t, id: generateSecureId() } as Transaction;
      return txM.addTransaction.mutateAsync(payload);
    },
    updateTx: (id: string, p: Partial<Transaction>) =>
      txM.updateTransaction.mutateAsync({ id, patch: p }),
    removeTx: (id: string) => txM.removeTransaction.mutateAsync(id),

    // fixed items
    addFixed: (i: Omit<FixedItem, 'id'>) => fixedM.addFixedItem.mutateAsync(i),
    updateFixed: (id: string, p: Partial<FixedItem>) =>
      fixedM.updateFixedItem.mutateAsync({ id, patch: p }),
    removeFixed: (id: string) => fixedM.removeFixedItem.mutateAsync(id),
    toggleFixed: (id: string) => fixedM.toggleFixedItem.mutateAsync(id),

    // goals
    addGoal: (g: Omit<Goal, 'id'>) => goalM.addGoal.mutateAsync(g),
    updateGoal: (id: string, p: Partial<Goal>) => goalM.updateGoal.mutateAsync({ id, patch: p }),
    removeGoal: (id: string) => goalM.removeGoal.mutateAsync(id),
    contributeGoal: (id: string, amount: number, date?: string, accountId?: string) =>
      goalM.contributeToGoal.mutateAsync({ id, amount, date, accountId }),

    // goal folders
    addGoalFolder: (f: Omit<GoalFolder, 'id'>) => folderM.addGoalFolder.mutateAsync(f),
    updateGoalFolder: (id: string, p: Partial<GoalFolder>) =>
      folderM.updateGoalFolder.mutateAsync({ id, patch: p }),
    removeGoalFolder: (id: string) => folderM.removeGoalFolder.mutateAsync(id),
    reorderGoalFolders: (folders: GoalFolder[]) => folderM.reorderGoalFolders.mutateAsync(folders),

    // debts
    addDebt: (d: Omit<Debt, 'id' | 'payments'>) => debtM.addDebt.mutateAsync(d),
    updateDebt: (id: string, p: Partial<Debt>) => debtM.updateDebt.mutateAsync({ id, patch: p }),
    removeDebt: (id: string) => debtM.removeDebt.mutateAsync(id),
    addDebtPayment: (debtId: string, p: Omit<DebtPayment, 'id'>) =>
      debtM.addDebtPayment.mutateAsync({ debtId, payment: p }),
    removeDebtPayment: (debtId: string, paymentId: string) =>
      debtM.removeDebtPayment.mutateAsync({ debtId, paymentId }),

    // --- Estado de UI (Zustand — NO toca la red) ---
    theme: ui.theme,
    setTheme: ui.setTheme,
    toggleTheme: ui.toggleTheme,
    profile: ui.profile,
    setProfile: ui.setProfile,
    activeYear: ui.activeYear,
    activeMonth: ui.activeMonth,
    setActive: ui.setActive,
    resetToToday: ui.resetToToday,
    syncFiltersToURL: ui.syncFiltersToURL,
    setSyncFiltersToURL: ui.setSyncFiltersToURL,
    changeLog: ui.changeLog,
    clearChangeLog: ui.clearChangeLog,
    appSettings: ui.appSettings,
    setAccentColor: ui.setAccentColor,
    setCompactMode: ui.setCompactMode,
    setGlassEffect: ui.setGlassEffect,

    // --- Operaciones de datos locales (Zustand) ---
    ensureScheduledTransactions: ui.ensureScheduledTransactions,
    exportData: ui.exportData,
    importData: ui.importData,
    resetAll: ui.resetAll,
    migrateReceiptsInPlace: ui.migrateReceiptsInPlace,
    cleanupOrphanReceipts: ui.cleanupOrphanReceipts,
    // --- Operaciones en lote (React Query mutations — ya no viven en Zustand) ---
    downloadFromCloud: () => cloudSyncM.downloadFromCloud.mutateAsync(),
    syncAllToCloud: () =>
      cloudSyncM.syncAllToCloud.mutateAsync().then((r) => r.syncedCount),
    loadSettingsFromCloud: () => cloudSyncM.loadSettingsFromCloud.mutateAsync(),
    isSyncingToCloud: cloudSyncM.syncAllToCloud.isPending,
    isDownloadingFromCloud: cloudSyncM.downloadFromCloud.isPending,

    // --- Recibos fotográficos (Supabase Storage) ---
    uploadReceipt: (input: UploadReceiptForTransactionInput) =>
      receiptM.uploadReceiptForTransaction.mutateAsync(input),
    deleteReceipt: (input: DeleteReceiptForTransactionInput) =>
      receiptM.deleteReceiptForTransaction.mutateAsync(input),
  };
}
