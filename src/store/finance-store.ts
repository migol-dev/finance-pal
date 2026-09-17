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
import { supabase, isSupabaseEnabled } from "@/lib/supabase";
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
  loadSettingsFromCloud: () => Promise<void>;
  downloadFromCloud: () => Promise<void>;
  syncAllToCloud: () => Promise<number>;
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

        setProfile: (p) => {
          set((s) => ({ profile: { ...s.profile, ...p } }));
          if (isSupabaseEnabled) {
            supabase.auth.getSession().then(async ({ data: { session: s2 } }) => {
              if (s2?.user?.id) {
                try {
                  await supabase.from('user_settings').upsert(
                    { user_id: s2.user.id, profile: { ...get().profile, ...p } },
                    { onConflict: 'user_id' }
                  );
                } catch { /* ignore */ }
              }
            });
          }
        },

        setTheme: (t) => {
          set({ theme: t });
          if (isSupabaseEnabled) {
            supabase.auth.getSession().then(async ({ data: { session: s2 } }) => {
              if (s2?.user?.id) {
                try {
                  await supabase.from('user_settings').upsert(
                    { user_id: s2.user.id, theme: t },
                    { onConflict: 'user_id' }
                  );
                } catch { /* ignore */ }
              }
            });
          }
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

            get().addTx({ type: txType, category: f.category, concept: f.concept, amount: f.amount, date: occDate.toISOString(), note: undefined, icon: f.icon, paymentMethod: f.paymentMethod, fixedId: f.id });
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

        loadSettingsFromCloud: async () => {
          if (!isSupabaseEnabled) return;
          const { data: { session: s2 } } = await supabase.auth.getSession();
          if (!s2?.user?.id) return;
          const { data } = await supabase
            .from('user_settings')
            .select('theme, profile')
            .eq('user_id', s2.user.id)
            .maybeSingle();
          if (data) {
            if (data.theme === 'dark' || data.theme === 'light' || data.theme === 'system') set({ theme: data.theme });
            if (data.profile && typeof data.profile === 'object') {
              set({ profile: { name: '', currency: 'MXN', ...data.profile } });
            }
          }
        },

        downloadFromCloud: async () => {
          if (!isSupabaseEnabled) return;
          const { data: { session: s2 } } = await supabase.auth.getSession();
          if (!s2?.user?.id) return;
          const userId = s2.user.id;

          try {
            const [accountsRes, txRes, fixedRes, goalsRes, debtsRes, foldersRes] = await Promise.all([
              supabase.from('accounts').select('id, name, type, initial_balance, currency, denominations, clabe, bank, holder_name').eq('user_id', userId).order('created_at', { ascending: true }),
              supabase.from('transactions').select('id, type, category, concept, amount, date, note, icon, payment_method, fixed_id, account_id, transfer_to_account_id, external_payee, receipt').eq('user_id', userId).order('date', { ascending: false }),
              supabase.from('fixed_items').select('id, type, category, concept, amount, frequency, active, note, start_date, end_date, priority, pay_day, pay_week_day, icon, payment_method, account_id').eq('user_id', userId).order('created_at', { ascending: false }),
              supabase.from('goals').select('id, name, target, saved, emoji, color, deadline, icon, purchase_url, contributions, pinned, folder_id, created_at').eq('user_id', userId).order('created_at', { ascending: false }),
              supabase.from('debts').select('id, person, concept, amount, date, due_date, note, icon, account_id, payments:debt_payments(id, amount, date, note, payment_method, account_id)').eq('user_id', userId).order('created_at', { ascending: false }),
              supabase.from('goal_folders').select('*').eq('user_id', userId).order('"order"', { ascending: true }),
            ]);
            set({
              accounts: (accountsRes.data ?? []).map((r: any) => ({ id: r.id, name: r.name, type: r.type, initialBalance: Number(r.initial_balance ?? 0), currency: r.currency, denominations: r.denominations ?? [], clabe: r.clabe, bank: r.bank, holderName: r.holder_name })),
              transactions: (txRes.data ?? []).map((r: any) => ({ id: r.id, type: r.type, category: r.category, concept: r.concept, amount: Number(r.amount), date: r.date, note: r.note, icon: r.icon, paymentMethod: r.payment_method, fixedId: r.fixed_id, accountId: r.account_id, transferToAccountId: r.transfer_to_account_id, externalPayee: r.external_payee, receipt: r.receipt })),
              fixedItems: (fixedRes.data ?? []).map((r: any) => ({ id: r.id, type: r.type, category: r.category, concept: r.concept, amount: Number(r.amount), frequency: r.frequency, active: r.active, note: r.note, startDate: r.start_date, endDate: r.end_date, priority: r.priority, payDay: r.pay_day, payWeekDay: r.pay_week_day, icon: r.icon, paymentMethod: r.payment_method, accountId: r.account_id })),
              goals: (goalsRes.data ?? []).map((r: any) => ({ id: r.id, name: r.name, target: Number(r.target), saved: Number(r.saved ?? 0), emoji: r.emoji, color: r.color, deadline: r.deadline, icon: r.icon, purchaseUrl: r.purchase_url, contributions: r.contributions ?? [], pinned: r.pinned, folderId: r.folder_id, createdAt: r.created_at })),
              goalFolders: (foldersRes.data ?? []).map((r: any) => ({ id: r.id, name: r.name, color: r.color, icon: r.icon, parentId: r.parent_id, order: r.order ?? 0, createdAt: r.created_at })),
              debts: (debtsRes.data ?? []).map((r: any) => ({ id: r.id, person: r.person, concept: r.concept, amount: Number(r.amount), date: r.date, dueDate: r.due_date, note: r.note, icon: r.icon, accountId: r.account_id, payments: (r.payments ?? []).map((p: any) => ({ id: p.id, amount: Number(p.amount), date: p.date, note: p.note, paymentMethod: p.payment_method, accountId: p.account_id })) })),
            });
          } catch (e) {
            console.error("Error downloading from cloud", e);
          }
        },

        syncAllToCloud: async () => {
          if (!isSupabaseEnabled) return 0;
          const { data: { session: s2 } } = await supabase.auth.getSession();
          if (!s2?.user?.id) return 0;
          const userId = s2.user.id;
          const s = get();
          let synced = 0;

          // Accounts
          await supabase.from('accounts').delete().eq('user_id', userId);
          for (const a of s.accounts) {
            const { error } = await supabase.from('accounts').insert({
              id: a.id, user_id: userId, name: a.name, type: a.type,
              initial_balance: a.initialBalance, currency: a.currency,
              clabe: a.clabe, bank: a.bank, holder_name: a.holderName,
              denominations: a.denominations,
            });
            if (!error) synced++;
          }

          // Transactions
          await supabase.from('transactions').delete().eq('user_id', userId);
          for (const tx of s.transactions) {
            const { error } = await supabase.from('transactions').insert({
              id: tx.id, user_id: userId, type: tx.type, category: tx.category,
              concept: tx.concept, amount: tx.amount, date: tx.date,
              note: tx.note, icon: tx.icon, payment_method: tx.paymentMethod,
              fixed_id: tx.fixedId, account_id: tx.accountId,
              transfer_to_account_id: tx.transferToAccountId,
              external_payee: tx.externalPayee, receipt: tx.receipt,
            });
            if (!error) synced++;
          }

          // Fixed Items
          await supabase.from('fixed_items').delete().eq('user_id', userId);
          for (const f of s.fixedItems) {
            const { error } = await supabase.from('fixed_items').insert({
              id: f.id, user_id: userId, type: f.type, category: f.category,
              concept: f.concept, amount: f.amount, frequency: f.frequency,
              active: f.active, note: f.note, start_date: f.startDate,
              end_date: f.endDate, priority: f.priority, pay_day: f.payDay,
              pay_week_day: f.payWeekDay, icon: f.icon,
              payment_method: f.paymentMethod, account_id: f.accountId,
            });
            if (!error) synced++;
          }

          // Goals
          await supabase.from('goals').delete().eq('user_id', userId);
          for (const g of s.goals) {
            const { error } = await supabase.from('goals').insert({
              id: g.id, user_id: userId, name: g.name, target: g.target,
              saved: g.saved, emoji: g.emoji, color: g.color, icon: g.icon,
              deadline: g.deadline, purchase_url: g.purchaseUrl,
              contributions: g.contributions, pinned: g.pinned,
              folder_id: g.folderId,
            });
            if (!error) synced++;
          }

          // Goal Folders
          await supabase.from('goal_folders').delete().eq('user_id', userId);
          for (const f of s.goalFolders) {
            const { error } = await supabase.from('goal_folders').insert({
              id: f.id, user_id: userId, name: f.name, color: f.color,
              icon: f.icon, parent_id: f.parentId, "order": f.order,
            });
            if (!error) synced++;
          }

          // Debts (CASCADE deletes payments)
          await supabase.from('debts').delete().eq('user_id', userId);
          for (const debt of s.debts) {
            const { error: debtErr } = await supabase.from('debts').insert({
              id: debt.id, user_id: userId, person: debt.person,
              concept: debt.concept, amount: debt.amount, date: debt.date,
              due_date: debt.dueDate, note: debt.note, icon: debt.icon,
              account_id: debt.accountId,
            });
            if (!debtErr) {
              synced++;
              for (const p of debt.payments) {
                const pay: Record<string, unknown> = {
                  id: p.id, debt_id: debt.id, user_id: userId,
                  amount: p.amount, date: p.date, note: p.note,
                  payment_method: p.paymentMethod,
                };
                if (p.accountId) pay.account_id = p.accountId;
                if (p.transferToAccountId) pay.transfer_to_account_id = p.transferToAccountId;
                if (p.externalPayee) pay.external_payee = p.externalPayee;
                if (p.receipt && !p.receipt.startsWith('data:')) pay.receipt_url = p.receipt;
                const { error: payErr } = await supabase.from('debt_payments').insert(pay);
                if (!payErr) synced++;
              }
            }
          }

          // Settings (theme + profile)
          await supabase.from('user_settings').upsert(
            { user_id: userId, theme: s.theme, profile: s.profile },
            { onConflict: 'user_id' }
          );

          return synced;
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




