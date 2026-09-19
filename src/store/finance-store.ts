import { create } from "zustand";
import { createSettingsSlice, SettingsSlice } from "./slices/settings-slice";
import { createAccountSlice, AccountSlice } from "./slices/account-slice";
import { createGoalSlice, GoalSlice } from "./slices/goal-slice";
import { createDebtSlice, DebtSlice } from "./slices/debt-slice";
import { createFixedSlice, FixedSlice } from "./slices/fixed-slice";
import { createTransactionSlice, TransactionSlice } from "./slices/transaction-slice";
import { persist } from "zustand/middleware";
import { FixedItem, Transaction, Goal, Debt, ChangeLogEntry, isFixedActiveInMonth, parseDateLocal, Account, ThemeMode, AccentColor, GoalFolder, NotificationPreferences, DEFAULT_NOTIFICATION_PREFS } from "@/lib/finance";
import { Filesystem, Directory } from "@capacitor/filesystem";
import { Capacitor } from "@capacitor/core";
import { supabase } from "@/lib/supabase";
import { saveEncryptedState, loadEncryptedState, clearEncryptedState, isEncryptionAvailable, extractReceiptsToIndexedDB, restoreReceiptsFromIndexedDB } from '@/lib/encrypted-storage';
import { audit } from '@/lib/audit-logger';
import { migrateData, sanitizeMigratedData } from '@/lib/schema-migrations';
import {
  SCHEMA_VERSION,
  generateSecureId,
  logEntry,
  sanitizeAccountForExport,
  sanitizeTransactionForExport,
  sanitizeDebtPaymentForExport,
  sanitizeProfileForExport,
  migrateImported,
  isObj,
  isStr,
  sanitizeTx,
  sanitizeAccount,
  sanitizeGoal,
  sanitizeGoalFolder,
  sanitizeDebt,
  sanitizeFixed,
  sanitizeProfile
} from "@/lib/sanitizers";
export * from "@/lib/sanitizers";


interface State extends SettingsSlice, AccountSlice, GoalSlice, DebtSlice, FixedSlice, TransactionSlice {
  ensureScheduledTransactions: () => void;

  saveReceiptFile: (receiptId: string, dataUrl: string) => Promise<string | undefined>;

  hasLocalData: () => boolean;
  exportData: (scopes?: ExportScopes) => string;
  importData: (json: string, scopes?: ExportScopes) => Promise<{ ok: boolean; error?: string; warnings?: string[] }>;
  migrateReceiptsInPlace: () => Promise<void>;
  cleanupOrphanReceipts: (deleteFiles?: boolean) => Promise<{ orphans: string[]; freedBytes: number }>;

  resetAll: () => void;
}

/** Selectable data sections for export/import. */
export interface ExportScopes {
  fixedItems?: boolean;
  transactions?: boolean;
  accounts?: boolean;
  goals?: boolean;
  goalFolders?: boolean;
  debts?: boolean;
  changeLog?: boolean;
  theme?: boolean;
  profile?: boolean;
  // PII exclusion options
  excludePII?: boolean;           // Exclude all personally identifiable information
  excludeBankDetails?: boolean;   // Exclude CLABE, bank name, holder name
  excludeEmail?: boolean;         // Exclude email from profile
  excludeReceipts?: boolean;      // Exclude receipt data URLs
}

export const ALL_SCOPES: Required<ExportScopes> = {
  fixedItems: true, transactions: true, goals: true, goalFolders: true, debts: true,
  changeLog: true, theme: true, profile: true, accounts: true,
  excludePII: false, excludeBankDetails: false, excludeEmail: false, excludeReceipts: false,
};

const now = new Date();

export const useFinance = create<State>()(
  persist(
    (...a) => {
      const [set, get] = a;
      return {
        ...createSettingsSlice(...a),
        ...createAccountSlice(...a),
        ...createGoalSlice(...a),
        ...createDebtSlice(...a),
        ...createFixedSlice(...a),
        ...createTransactionSlice(...a),
        accounts: [
          { id: generateSecureId(), name: "Efectivo", type: "cash", initialBalance: 0, denominations: [] },
          { id: generateSecureId(), name: "Cuenta 1", type: "bank", initialBalance: 0 },
        ],
        changeLog: [],
        theme: "system",
        profile: { name: "", currency: "MXN" },
        // whether to mirror filter state to URL query params
        syncFiltersToURL: false,
        setSyncFiltersToURL: (v: boolean) => set({ syncFiltersToURL: v }),
        appSettings: { accentColor: "blue", compactMode: false, glassEffect: true, conflictResolved: false, notifications: DEFAULT_NOTIFICATION_PREFS },
        setAccentColor: (color: AccentColor) => {
          set((s) => ({ appSettings: { ...s.appSettings, accentColor: color } }));
        },
        setCompactMode: (compact: boolean) => {
          set((s) => ({ appSettings: { ...s.appSettings, compactMode: compact } }));
        },
        setGlassEffect: (glass: boolean) => {
          set((s) => ({ appSettings: { ...s.appSettings, glassEffect: glass } }));
        },
        setNotificationPrefs: (prefs: Partial<NotificationPreferences>) => {
          set((s) => ({ appSettings: { ...s.appSettings, notifications: { ...s.appSettings.notifications, ...prefs } } }));
        },
        setConflictResolved: () => {
          set((s) => ({ appSettings: { ...s.appSettings, conflictResolved: true } }));
        },
        activeYear: now.getFullYear(),
        activeMonth: now.getMonth(),

        hasLocalData: () => {
          const s = get();
          if (!s) return false;
          return ((s.transactions?.length ?? 0) + (s.fixedItems?.length ?? 0) + (s.goals?.length ?? 0) + (s.debts?.length ?? 0) + (s.goalFolders?.length ?? 0)) > 0;
        },

        // Solo estado local. La sincronización a la nube (user_settings)
        // se gestiona fuera del store vía settings.service + useFinanceData.
        setProfile: (p) => {
          set((s) => ({ profile: { ...s.profile, ...p } }));
        },

        setTheme: (t) => {
          set({ theme: t });
        },
        toggleTheme: () => {
          const current = get().theme;
          const next = current === "system" ? "light" : current === "light" ? "dark" : "system";
          get().setTheme(next);
        },

        setActive: (y, m) => set({ activeYear: y, activeMonth: m }),
        resetToToday: () => { const d = new Date(); set({ activeYear: d.getFullYear(), activeMonth: d.getMonth() }); },

        ensureScheduledTransactions: () => {
          const s = get();
          const today = new Date();
          const pad = (n: number) => String(n).padStart(2, "0");
          const todayISO = `${today.getFullYear()}-${pad(today.getMonth() + 1)}-${pad(today.getDate())}`;
          for (const f of s.fixedItems) {
            if (!f.active) continue;
            const start = parseDateLocal(f.startDate);
            const end = parseDateLocal(f.endDate);
            const startISO = `${start.getFullYear()}-${pad(start.getMonth() + 1)}-${pad(start.getDate())}`;
            const endISO = `${end.getFullYear()}-${pad(end.getMonth() + 1)}-${pad(end.getDate())}`;
            // only consider items whose range includes today (compare date-only strings to avoid timezone issues)
            if (todayISO < startISO || todayISO > endISO) continue;

            let shouldCreate = false;
            let occDate: Date | null = null;

            if (f.frequency === "weekly" && typeof f.payWeekDay === "number") {
              if (today.getDay() === f.payWeekDay) { occDate = new Date(today.getFullYear(), today.getMonth(), today.getDate()); shouldCreate = true; }
            } else if (["monthly", "bimonthly", "quarterly", "fourmonthly", "biannual"].includes(f.frequency)) {
              if (typeof f.payDay === "number") {
                if (today.getDate() === f.payDay && isFixedActiveInMonth(f, today.getFullYear(), today.getMonth())) {
                  occDate = new Date(today.getFullYear(), today.getMonth(), f.payDay);
                  shouldCreate = true;
                }
              }
            } else if (f.frequency === "one_time") {
              const sd = parseDateLocal(f.startDate);
              if (sd.getFullYear() === today.getFullYear() && sd.getMonth() === today.getMonth() && sd.getDate() === today.getDate()) {
                occDate = sd; shouldCreate = true;
              }
            } else if (f.frequency === "yearly") {
              const sd = parseDateLocal(f.startDate);
              if (sd.getDate() === today.getDate() && sd.getMonth() === today.getMonth()) { occDate = new Date(today.getFullYear(), today.getMonth(), today.getDate()); shouldCreate = true; }
            }

            if (!shouldCreate || !occDate) continue;
            const occISO = `${occDate.getFullYear()}-${pad(occDate.getMonth() + 1)}-${pad(occDate.getDate())}`;
            if (occISO < startISO || occISO > endISO) continue;

            const already = s.transactions.some((t) => {
              if (t.fixedId !== f.id) return false;
              const td = parseDateLocal(t.date ?? "");
              const tISO = `${td.getFullYear()}-${pad(td.getMonth() + 1)}-${pad(td.getDate())}`;
              return tISO === occISO;
            });
            if (already) continue;

            // Map fixed type to transaction type
            let txType: Transaction["type"] = "expense";
            if (f.type === "income_fixed") txType = "income";
            else if (f.type === "saving_fixed") txType = "saving";

            get().addTx({ id: generateSecureId(), type: txType, category: f.category, concept: f.concept, amount: f.amount, date: occDate.toISOString(), note: undefined, icon: f.icon, paymentMethod: f.paymentMethod, fixedId: f.id });
          }
        },

        clearChangeLog: () => set({ changeLog: [] }),

        exportData: (scopes) => {
          const s = get();
          const sc = { ...ALL_SCOPES, ...(scopes ?? {}) };
          const data: Record<string, unknown> = {};

          const piiOpts = {
            excludeBankDetails: sc.excludeBankDetails ?? sc.excludePII,
            excludeEmail: sc.excludeEmail ?? sc.excludePII,
            excludeReceipts: sc.excludeReceipts ?? sc.excludePII,
          };

          if (sc.fixedItems) data.fixedItems = s.fixedItems;
          if (sc.transactions) data.transactions = s.transactions.map(tx => sanitizeTransactionForExport(tx, piiOpts));
          if (sc.accounts) data.accounts = s.accounts.map(acc => sanitizeAccountForExport(acc, piiOpts));
          if (sc.goals) data.goals = s.goals;
          if (sc.goalFolders) data.goalFolders = s.goalFolders;
          if (sc.debts) data.debts = s.debts.map(debt => ({
            ...debt,
            payments: debt.payments.map(p => sanitizeDebtPaymentForExport(p, piiOpts)),
          }));
          if (sc.changeLog) data.changeLog = s.changeLog;
          if (sc.theme) data.theme = s.theme;
          if (sc.profile) data.profile = sanitizeProfileForExport(s.profile, piiOpts);

          const payload = {
            app: "finance-pal",
            version: SCHEMA_VERSION,
            exportedAt: new Date().toISOString(),
            scopes: sc,
            data,
          };
          // Audit log: data exported
          supabase.auth.getUser().then(({ data: authData }) => {
            const userId = authData?.user?.id;
            if (userId) {
              audit.dataExported(userId, Object.keys(sc).filter(k => sc[k as keyof typeof sc]));
            }
          }).catch(console.error);

          return JSON.stringify(payload, null, 2);
        },

        importData: async (json, scopes) => {
          try {
            const parsed = JSON.parse(json);
            if (!isObj(parsed) && !isObj(parsed?.data)) {
              return { ok: false, error: "Formato inválido: se esperaba un objeto JSON" };
            }
            if (parsed?.app && parsed.app !== "finance-pal" && parsed.app !== "migol-finanzas") {
              return { ok: false, error: `Este archivo no pertenece a Finance Pal (app="${parsed.app}")` };
            }
            const { data: rawData, warnings } = migrateImported(parsed);
            const data = rawData as Record<string, unknown>;
            const sc = { ...ALL_SCOPES, ...(scopes ?? {}) };
            const cur = get();
            // Audit log: data imported
            const userId = (await supabase.auth.getUser()).data?.user?.id;
            if (userId) {
              audit.dataImported(userId, Object.keys(sc).filter(k => sc[k as keyof typeof sc]));
            }

            const fixedItems = sc.fixedItems && Array.isArray(data.fixedItems)
              ? (data.fixedItems as any[]).map((item: any) => sanitizeFixed(item)).filter((x): x is FixedItem => !!x)
              : cur.fixedItems;
            const transactions = sc.transactions && Array.isArray(data.transactions)
              ? (data.transactions as any[]).map((item: any) => sanitizeTx(item)).filter((x): x is Transaction => !!x)
              : cur.transactions;

            // If native, persist any embedded dataURL receipts and replace with saved path
            if (Capacitor.isNativePlatform() && Array.isArray(transactions)) {
              for (const tx of transactions) {
                if (typeof tx.receipt === "string" && tx.receipt.startsWith("data:")) {
                  const saved = await get().saveReceiptFile(tx.id, tx.receipt);
                  if (saved) tx.receipt = saved;
                }
              }
            }
            const accounts = sc.accounts && Array.isArray(data.accounts)
              ? (data.accounts as any[]).map((item: any) => sanitizeAccount(item)).filter((x): x is Account => !!x)
              : cur.accounts;
            const goals = sc.goals && Array.isArray(data.goals)
              ? (data.goals as any[]).map((item: any) => sanitizeGoal(item)).filter((x): x is Goal => !!x)
              : cur.goals;
            const goalFolders = sc.goalFolders && Array.isArray(data.goalFolders)
              ? (data.goalFolders as any[]).map((item: any) => sanitizeGoalFolder(item)).filter((x): x is GoalFolder => !!x)
              : cur.goalFolders;
            const debts = sc.debts && Array.isArray(data.debts)
              ? (data.debts as any[]).map((item: any) => sanitizeDebt(item)).filter((x): x is Debt => !!x)
              : cur.debts;
            const changeLog: ChangeLogEntry[] = sc.changeLog && Array.isArray(data.changeLog)
              ? (data.changeLog as any[]).filter((e) => isObj(e) && isStr(e.id) && isStr(e.label)).slice(0, 500) as ChangeLogEntry[]
              : cur.changeLog;
            const theme: ThemeMode = sc.theme && (data.theme === "dark" || data.theme === "light" || data.theme === "system")
              ? (data.theme as ThemeMode)
              : cur.theme;
            const profile = sc.profile && data.profile != null
              ? sanitizeProfile(data.profile)
              : cur.profile;

            set({ fixedItems, transactions, accounts, goals, goalFolders, debts, changeLog, theme, profile });
            // After importing, also migrate any in-place dataURL receipts from existing state
            try { await get().migrateReceiptsInPlace(); } catch { /* ignore */ }
            return { ok: true, warnings };
          } catch (e: any) {
            return { ok: false, error: e?.message ?? "JSON inválido" };
          }
        },

        migrateReceiptsInPlace: async () => {
          if (!Capacitor.isNativePlatform()) return;
          const s = get();
          const txs = s.transactions.slice();
          let changed = false;
          for (const tx of txs) {
            if (typeof tx.receipt === "string" && tx.receipt.startsWith("data:")) {
              const saved = await get().saveReceiptFile(tx.id, tx.receipt);
              if (saved) {
                tx.receipt = saved;
                changed = true;
              }
            }
          }
          if (changed) set(() => ({ transactions: txs }));
        },

        cleanupOrphanReceipts: async (deleteFiles = false) => {
          if (!Capacitor.isNativePlatform() || typeof Filesystem?.readdir !== 'function') return { orphans: [], freedBytes: 0 };
          try {
            const res = await Filesystem.readdir({ path: 'receipts', directory: Directory.Data });
            const files: string[] = Array.isArray((res as any).files) ? (res as any).files : (Array.isArray(res) ? res as any : []);
            const refs = new Set<string>();
            const s = get();
            for (const t of s.transactions) {
              if (typeof t.receipt === 'string') {
                const bn = t.receipt.includes('/') ? t.receipt.split('/').pop() as string : t.receipt;
                refs.add(bn);
              }
            }
            const orphans = files.filter((f) => !refs.has(f));
            let freed = 0;
            // gather sizes
            const sizes: Record<string, number> = {};
            for (const o of orphans) {
              try {
                const st = await Filesystem.stat({ path: `receipts/${o}`, directory: Directory.Data });
                const sz = typeof (st as any).size === 'number' ? (st as any).size : Number((st as any).size) || 0;
                sizes[o] = sz;
              } catch { sizes[o] = 0; }
            }
            const totalBytes = Object.values(sizes).reduce((a, b) => a + b, 0);
            if (deleteFiles && orphans.length > 0) {
              for (const o of orphans) {
                try {
                  await Filesystem.deleteFile({ path: `receipts/${o}`, directory: Directory.Data });
                  freed += sizes[o] || 0;
                } catch { /* ignore */ }
              }
              // record changeLog entry
              set((s2) => ({ changeLog: [logEntry("transaction", generateSecureId(), "update", `Eliminó ${orphans.length} recibos huérfanos, liberó ${(freed / 1024).toFixed(1)} KB`), ...s2.changeLog].slice(0, 500) }));
            }
            return { orphans, freedBytes: deleteFiles ? freed : totalBytes };
          } catch {
            return { orphans: [], freedBytes: 0 };
          }
        },

        resetAll: () => {
          const d = new Date();
          set({ fixedItems: [], transactions: [], goals: [], debts: [], changeLog: [], activeYear: d.getFullYear(), activeMonth: d.getMonth(), appSettings: { accentColor: "blue", compactMode: false, glassEffect: true, conflictResolved: false, notifications: DEFAULT_NOTIFICATION_PREFS } });
          // Audit log: all data deleted
          supabase.auth.getUser().then(({ data: authData }) => {
            const userId = authData?.user?.id;
            if (userId) {
              audit.dataDeleted(userId);
            }
          }).catch(console.error);
        },
      };
    },
    {
      name: "migol-finanzas-v2",
      version: SCHEMA_VERSION,
      storage: {
        getItem: async (name: string) => {
          let data: any = null;
          // Always try localStorage first (most reliable)
          const item = localStorage.getItem(name);
          if (item) {
            try { data = JSON.parse(item); } catch { /* ignore */ }
          }
          // Fallback to encrypted storage
          if (!data && isEncryptionAvailable()) {
            const decrypted = await loadEncryptedState();
            if (decrypted) {
              try { data = JSON.parse(decrypted); } catch { /* ignore */ }
            }
          }
          // Restore receipts from IndexedDB
          if (data?.state) await restoreReceiptsFromIndexedDB(data.state);
          return data;
        },
        setItem: async (name: string, value: any) => {
          try {
            if (value?.state) await extractReceiptsToIndexedDB(value.state);
          } catch { /* ignore receipt extraction errors */ }
          const serialized = JSON.stringify(value);
          // Always save to localStorage (reliable fallback)
          try {
            localStorage.setItem(name, serialized);
          } catch (e) {
            console.error('localStorage setItem failed:', e);
          }
          // Also save encrypted (if available) — best-effort
          if (isEncryptionAvailable()) {
            try {
              await saveEncryptedState(serialized);
            } catch (e) {
              console.warn('Encrypted save failed, localStorage copy exists:', e);
            }
          }
        },
        removeItem: async (name: string) => {
          localStorage.removeItem(name);
          if (isEncryptionAvailable()) {
            await clearEncryptedState();
          }
        },
      } as any,
      migrate: async (state: any, fromVersion: number) => {
        if (!state) return state;

        // Run our comprehensive migration system
        const { data: migratedData, result } = await migrateData(
          { ...state, _meta: { schemaVersion: fromVersion } },
          {
            isNative: Capacitor.isNativePlatform(),
            timestamp: new Date().toISOString()
          }
        );

        // Log migration result
        if (result.migrated) {
          console.log(`[Migration] ${result.fromVersion} -> ${result.toVersion}:`, result.warnings);
          if (result.errors.length > 0) {
            console.error('[Migration] Errors:', result.errors);
          }
        }

        // Sanitize and validate against current schemas
        const sanitized = sanitizeMigratedData(migratedData);

        // Ensure all required fields exist with defaults
        const next = {
          fixedItems: [],
          transactions: [],
          goals: [],
          debts: [],
          goalFolders: [],

          ...sanitized,
        };

        return next;
      },
    }
  )
);




