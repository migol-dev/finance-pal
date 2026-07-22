import { create } from "zustand";
import { persist } from "zustand/middleware";
import { FixedItem, Transaction, Goal, Debt, DebtPayment, ChangeLogEntry, ChangeAction, ChangeEntity, IconRef, isFixedActiveInMonth, parseDateLocal, Account, ThemeMode, Currency, UserProfile, AccentColor, AppSettings } from "@/lib/finance";
import { Filesystem, Directory, Encoding } from "@capacitor/filesystem";
import { Capacitor } from "@capacitor/core";
import { supabase, isSupabaseEnabled } from "@/lib/supabase";
import { uploadReceipt, deleteReceipt } from "@/lib/supabase-storage";
import { saveEncryptedState, loadEncryptedState, clearEncryptedState, isEncryptionAvailable, extractReceiptsToIndexedDB, restoreReceiptsFromIndexedDB, saveReceipt as saveReceiptToIndexedDB, deleteReceipt as deleteReceiptFromIndexedDB } from '@/lib/encrypted-storage';
import { sanitizeForLog } from '@/lib/validators';
import { useSyncStore } from '@/store/sync-store';
import { toast } from 'sonner';

/** Current schema version of persisted/exported data. */
export const SCHEMA_VERSION = 5;

interface State {
  fixedItems: FixedItem[];
  transactions: Transaction[];
  goals: Goal[];
  debts: Debt[];
  changeLog: ChangeLogEntry[];
  theme: ThemeMode;
  profile: UserProfile;
  accounts: Account[];
  setProfile: (p: Partial<UserProfile>) => void;
  setTheme: (t: ThemeMode) => void;
  toggleTheme: () => void;
  // Active month/year context (defaults to today on first load)
  activeYear: number;
  activeMonth: number; // 0-11
  setActive: (year: number, month: number) => void;
  resetToToday: () => void;
  ensureScheduledTransactions: () => void;
  // UI preferences
  syncFiltersToURL: boolean;
  setSyncFiltersToURL: (v: boolean) => void;
  // Customization settings
  appSettings: AppSettings;
  setAccentColor: (color: AccentColor) => void;
  setCompactMode: (compact: boolean) => void;
  setGlassEffect: (glass: boolean) => void;
  setConflictResolved: () => void;

  addFixed: (i: Omit<FixedItem, "id">) => void;
  updateFixed: (id: string, p: Partial<FixedItem>) => void;
  removeFixed: (id: string) => void;
  toggleFixed: (id: string) => void;

  addTx: (t: Omit<Transaction, "id">) => Promise<void>;
  updateTx: (id: string, p: Partial<Transaction>) => Promise<void>;
  removeTx: (id: string) => Promise<void>;

  addAccount: (a: Omit<Account, "id">) => void;
  updateAccount: (id: string, p: Partial<Account>) => void;
  removeAccount: (id: string) => void;
  mergeAccounts: (fromIds: string[], intoId: string) => void;

  addGoal: (g: Omit<Goal, "id">) => void;
  updateGoal: (id: string, p: Partial<Goal>) => void;
  removeGoal: (id: string) => void;
  contributeGoal: (id: string, amount: number, date?: string, accountId?: string) => void;

  addDebt: (d: Omit<Debt, "id" | "payments">) => void;
  updateDebt: (id: string, p: Partial<Debt>) => void;
  removeDebt: (id: string) => void;
  addDebtPayment: (debtId: string, p: Omit<DebtPayment, "id">) => void;
  removeDebtPayment: (debtId: string, paymentId: string) => void;

  hasLocalData: () => boolean;
  clearChangeLog: () => void;
  exportData: (scopes?: ExportScopes) => string;
  importData: (json: string, scopes?: ExportScopes) => Promise<{ ok: boolean; error?: string; warnings?: string[] }>;
  migrateReceiptsInPlace: () => Promise<void>;
  saveReceiptFile: (receiptId: string, dataUrl: string) => Promise<string | undefined>;
  deleteReceiptIfExists: (receipt?: string) => Promise<void>;
  cleanupOrphanReceipts: (deleteFiles?: boolean) => Promise<{ orphans: string[]; freedBytes: number }>;

  resetAll: () => void;
  loadSettingsFromCloud: () => Promise<void>;
  syncAllToCloud: () => Promise<number>;
}

/** Selectable data sections for export/import. */
export interface ExportScopes {
  fixedItems?: boolean;
  transactions?: boolean;
  accounts?: boolean;
  goals?: boolean;
  debts?: boolean;
  changeLog?: boolean;
  theme?: boolean;
  profile?: boolean;
}

export const ALL_SCOPES: Required<ExportScopes> = {
  fixedItems: true, transactions: true, goals: true, debts: true,
  changeLog: true, theme: true, profile: true, accounts: true,
};

const now = new Date();

function generateSecureId(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  // Fallback for environments without crypto.randomUUID
  const array = new Uint8Array(16);
  crypto.getRandomValues(array);
  array[6] = (array[6] & 0x0f) | 0x40; // version 4
  array[8] = (array[8] & 0x3f) | 0x80; // variant 10
  const hex = Array.from(array, b => b.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0,8)}-${hex.slice(8,12)}-${hex.slice(12,16)}-${hex.slice(16,20)}-${hex.slice(20)}`;
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
function isValidUUID(s: string): boolean {
  return UUID_RE.test(s);
}

function diffFields<T extends Record<string, any>>(prev: T, next: Partial<T>) {
  const out: { field: string; from?: unknown; to?: unknown }[] = [];
  for (const k of Object.keys(next)) {
    if (k === "id") continue;
    const a = (prev as any)[k]; const b = (next as any)[k];
    if (JSON.stringify(a) !== JSON.stringify(b)) out.push({ field: k, from: a, to: b });
  }
  return out;
}

function logEntry(entity: ChangeEntity, entityId: string, action: ChangeAction, label: string, changes?: { field: string; from?: unknown; to?: unknown }[]): ChangeLogEntry {
  return { id: generateSecureId(), at: new Date().toISOString(), entity, entityId, action, label, changes };
}

/* ─────────────────────────────  Schema validation  ───────────────────────────── */

const isStr = (v: unknown): v is string => typeof v === "string";
const isNum = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v);
const isBool = (v: unknown): v is boolean => typeof v === "boolean";
const isObj = (v: unknown): v is Record<string, unknown> => !!v && typeof v === "object" && !Array.isArray(v);

function sanitizeIcon(v: unknown): IconRef | undefined {
  if (!isObj(v)) return undefined;
  const kind = v.kind === "image" ? "image" : v.kind === "emoji" ? "emoji" : null;
  if (!kind || !isStr(v.value)) return undefined;
  return { kind, value: v.value };
}

function inSet<T extends string>(set: readonly T[], v: unknown): v is T {
  return typeof v === "string" && (set as readonly string[]).includes(v);
}

function sanitizeFixed(raw: any): FixedItem | null {
  if (!isObj(raw) || !isStr(raw.concept) || !isNum(raw.amount)) return null;
  const types = ["income_fixed","expense_fixed","expense_variable","saving_fixed"] as const;
  const freqs = ["monthly","weekly","yearly","one_time","bimonthly","quarterly","fourmonthly","biannual"] as const;
  const prios = ["low","medium","high"] as const;
  const pays = ["cash","transfer","card","other"] as const;
  return {
    id: isStr(raw.id) && isValidUUID(raw.id) ? raw.id : generateSecureId(),
    type: inSet(types, raw.type) ? raw.type : "expense_fixed",
    category: isStr(raw.category) ? raw.category : "Otros",
    concept: raw.concept,
    amount: raw.amount,
    frequency: inSet(freqs, raw.frequency) ? raw.frequency : "monthly",
    active: isBool(raw.active) ? raw.active : true,
    note: isStr(raw.note) ? raw.note : undefined,
    startDate: isStr(raw.startDate) ? raw.startDate : new Date().toISOString(),
    endDate: isStr(raw.endDate) ? raw.endDate : `${new Date().getFullYear() + 5}-12-31T00:00:00.000Z`,
    priority: inSet(prios, raw.priority) ? raw.priority : "medium",
    payDay: isNum(raw.payDay) ? raw.payDay : undefined,
    payWeekDay: isNum(raw.payWeekDay) ? raw.payWeekDay : undefined,
    icon: sanitizeIcon(raw.icon),
    paymentMethod: inSet(pays, raw.paymentMethod) ? raw.paymentMethod : undefined,
    accountId: isStr(raw.accountId) && isValidUUID(raw.accountId) ? raw.accountId : undefined,
  };
}

function sanitizeTx(raw: any): Transaction | null {
  if (!isObj(raw) || !isStr(raw.concept) || !isNum(raw.amount)) return null;
  const types = ["income","expense","saving","transfer"] as const;
  const pays = ["cash","transfer","card","other"] as const;
  return {
    id: isStr(raw.id) && isValidUUID(raw.id) ? raw.id : generateSecureId(),
    type: inSet(types, raw.type) ? raw.type : "expense",
    category: isStr(raw.category) ? raw.category : "Otros",
    concept: raw.concept,
    amount: raw.amount,
    date: isStr(raw.date) ? raw.date : new Date().toISOString(),
    note: isStr(raw.note) ? raw.note : undefined,
    icon: sanitizeIcon(raw.icon),
    paymentMethod: inSet(pays, raw.paymentMethod) ? raw.paymentMethod : undefined,
    fixedId: isStr(raw.fixedId) && isValidUUID(raw.fixedId) ? raw.fixedId : undefined,
    accountId: isStr(raw.accountId) && isValidUUID(raw.accountId) ? raw.accountId : undefined,
    transferToAccountId: isStr(raw.transferToAccountId) && isValidUUID(raw.transferToAccountId) ? raw.transferToAccountId : undefined,
    externalPayee: isObj(raw.externalPayee) ? { clabe: isStr(raw.externalPayee.clabe) ? raw.externalPayee.clabe : undefined, bank: isStr(raw.externalPayee.bank) ? raw.externalPayee.bank : undefined, name: isStr(raw.externalPayee.name) ? raw.externalPayee.name : undefined } : undefined,
    receipt: isStr(raw.receipt) ? raw.receipt : undefined,
  };
}

function sanitizeGoal(raw: any): Goal | null {
  if (!isObj(raw) || !isStr(raw.name) || !isNum(raw.target)) return null;
  const contributions = Array.isArray(raw.contributions)
    ? (raw.contributions as any[])
      .filter((c) => isObj(c) && isNum(c.amount) && isStr(c.date))
      .map((c) => ({ id: isStr(c.id) && isValidUUID(c.id) ? c.id : generateSecureId(), date: c.date as string, amount: c.amount as number }))
    : undefined;
  return {
    id: isStr(raw.id) && isValidUUID(raw.id) ? raw.id : generateSecureId(),
    name: raw.name,
    target: raw.target,
    saved: isNum(raw.saved) ? raw.saved : 0,
    emoji: isStr(raw.emoji) ? raw.emoji : "🎯",
    color: isStr(raw.color) ? raw.color : "gradient-primary",
    deadline: isStr(raw.deadline) ? raw.deadline : undefined,
    icon: sanitizeIcon(raw.icon),
    purchaseUrl: isStr(raw.purchaseUrl) ? raw.purchaseUrl : undefined,
    contributions,
    createdAt: isStr(raw.createdAt) ? raw.createdAt : undefined,
    pinned: isBool(raw.pinned) ? raw.pinned : undefined,
  } as Goal;
}

function sanitizeDebt(raw: any): Debt | null {
  if (!isObj(raw) || !isStr(raw.person) || !isNum(raw.amount)) return null;
  const pays = ["cash","transfer","card","other"] as const;
  const payments: DebtPayment[] = Array.isArray(raw.payments)
    ? (raw.payments as any[])
      .filter((p) => isObj(p) && isNum(p.amount))
      .map((p) => ({
        id: isStr(p.id) && isValidUUID(p.id) ? p.id : generateSecureId(),
        amount: p.amount as number,
        date: isStr(p.date) ? p.date : new Date().toISOString(),
        note: isStr(p.note) ? p.note : undefined,
        paymentMethod: inSet(pays, p.paymentMethod) ? p.paymentMethod : undefined,
        accountId: isStr(p.accountId) && isValidUUID(p.accountId) ? p.accountId : undefined,
        transferToAccountId: isStr(p.transferToAccountId) && isValidUUID(p.transferToAccountId) ? p.transferToAccountId : undefined,
        externalPayee: isObj(p.externalPayee) ? { clabe: isStr(p.externalPayee.clabe) ? p.externalPayee.clabe : undefined, bank: isStr(p.externalPayee.bank) ? p.externalPayee.bank : undefined, name: isStr(p.externalPayee.name) ? p.externalPayee.name : undefined } : undefined,
        receipt: isStr(p.receipt) ? p.receipt : undefined,
      }))
    : [];
  return {
    id: isStr(raw.id) && isValidUUID(raw.id) ? raw.id : generateSecureId(),
    person: raw.person,
    concept: isStr(raw.concept) ? raw.concept : "Préstamo",
    amount: raw.amount,
    date: isStr(raw.date) ? raw.date : new Date().toISOString(),
    dueDate: isStr(raw.dueDate) ? raw.dueDate : undefined,
    note: isStr(raw.note) ? raw.note : undefined,
    icon: sanitizeIcon(raw.icon),
    payments,
    accountId: isStr(raw.accountId) && isValidUUID(raw.accountId) ? raw.accountId : undefined,
  } as Debt;
}

function sanitizeAccount(raw: any): Account | null {
  if (!isObj(raw) || !isStr(raw.name)) return null;
  const types = ["bank","cash","other"] as const;
  const denoms = Array.isArray(raw.denominations)
    ? (raw.denominations as any[])
      .filter((d) => isObj(d) && isNum(d.value) && isNum(d.count))
      .map((d) => ({ value: d.value as number, count: d.count as number, kind: d.kind === "coin" ? "coin" : "bill" }))
    : undefined;
  return {
    id: isStr(raw.id) && isValidUUID(raw.id) ? raw.id : generateSecureId(),
    name: raw.name,
    type: inSet(types, raw.type) ? raw.type : "bank",
    initialBalance: isNum(raw.initialBalance) ? raw.initialBalance : 0,
    currency: isStr(raw.currency) ? raw.currency : undefined,
    denominations: denoms,
    clabe: isStr(raw.clabe) ? raw.clabe : undefined,
    bank: isStr(raw.bank) ? raw.bank : undefined,
    holderName: isStr(raw.holderName) ? raw.holderName : undefined,
  } as Account;
}

function sanitizeProfile(raw: any): UserProfile {
  const currencies: Currency[] = ["MXN","USD","EUR","COP","ARS","CLP","PEN","BRL"];
  if (!isObj(raw)) return { name: "", currency: "MXN" };
  return {
    name: isStr(raw.name) ? raw.name : "",
    email: isStr(raw.email) ? raw.email : undefined,
    currency: currencies.includes(raw.currency as Currency) ? (raw.currency as Currency) : "MXN",
    avatar: sanitizeIcon(raw.avatar),
  };
}

/** Normalize keys from old app: Spanish → English, snake_case → camelCase, and coerce string numbers */
export function normalizeImportKeys(obj: any): any {
  if (!obj || typeof obj !== "object") return obj;
  if (Array.isArray(obj)) return obj.map(normalizeImportKeys);
  const keyMap: Record<string, string> = {
    cuentas: "accounts", movimientos: "transactions", metas: "goals",
    deudas: "debts", fijos: "fixedItems", conceptos: "fixedItems",
    historial: "changeLog", perfil: "profile", tema: "theme",
    initial_balance: "initialBalance", holder_name: "holderName",
    account_id: "accountId", fixed_id: "fixedId",
    payment_method: "paymentMethod", transfer_to_account_id: "transferToAccountId",
    external_payee: "externalPayee", due_date: "dueDate", purchase_url: "purchaseUrl",
    created_at: "createdAt", start_date: "startDate", end_date: "endDate",
    pay_day: "payDay", pay_week_day: "payWeekDay", user_id: "userId",
  };
  // Fields that should be coerced from string to number
  const numericFields = new Set(["amount", "target", "saved", "initialBalance", "value", "count"]);
  const out: any = {};
  for (const [k, v] of Object.entries(obj)) {
    const camel = k.replace(/_([a-z])/g, (_, c) => c.toUpperCase());
    const mapped = keyMap[camel] ?? keyMap[k] ?? camel;
    let val = normalizeImportKeys(v);
    // Coerce string numbers to actual numbers for known numeric fields
    if (numericFields.has(mapped) && typeof val === "string") {
      const n = Number(val);
      if (!isNaN(n) && isFinite(n)) val = n;
    }
    out[mapped] = val;
  }
  return out;
}

/** Upgrade an older payload to current schema. Pure: returns sanitized data. */
function migrateImported(payload: any): { data: any; warnings: string[] } {
  const warnings: string[] = [];
  const version: number = isNum(payload?.version) ? payload.version : 1;
  const raw = payload?.data ?? payload ?? {};
  if (version > SCHEMA_VERSION) warnings.push(`Importando datos de una versión más nueva (${version}). Algunos campos podrían ignorarse.`);
  if (version < SCHEMA_VERSION) warnings.push(`Migrando datos de versión ${version} a ${SCHEMA_VERSION}.`);
  // Always normalize keys (Spanish → English, snake_case → camelCase)
  const d = normalizeImportKeys(raw);
  return { data: d, warnings };
}

/* ─────────────────────────────  Supabase Sync Helpers  ───────────────────────────── */

function isOnline(): boolean {
  return navigator.onLine;
}

function queueMutation(table: string, action: 'INSERT' | 'UPDATE' | 'DELETE', recordId: string, payload?: any) {
  if (!isSupabaseEnabled) return;
  useSyncStore.getState().addMutation({ table, action, recordId, payload });
}

export const useFinance = create<State>()(
  persist(
    (set, get) => ({
      fixedItems: [],
      transactions: [],
      accounts: [
        { id: generateSecureId(), name: "Efectivo", type: "cash", initialBalance: 0, denominations: [] },
        { id: generateSecureId(), name: "Cuenta 1", type: "bank", initialBalance: 0 },
      ],
      goals: [],
      debts: [],
      changeLog: [],
      theme: "light",
      profile: { name: "", currency: "MXN" },
      // whether to mirror filter state to URL query params
      syncFiltersToURL: false,
      setSyncFiltersToURL: (v: boolean) => set({ syncFiltersToURL: v }),
      appSettings: { accentColor: "blue", compactMode: false, glassEffect: true, conflictResolved: false },
      setAccentColor: (color: AccentColor) => {
        set((s) => ({ appSettings: { ...s.appSettings, accentColor: color } }));
      },
      setCompactMode: (compact: boolean) => {
        set((s) => ({ appSettings: { ...s.appSettings, compactMode: compact } }));
      },
      setGlassEffect: (glass: boolean) => {
        set((s) => ({ appSettings: { ...s.appSettings, glassEffect: glass } }));
      },
      setConflictResolved: () => {
        set((s) => ({ appSettings: { ...s.appSettings, conflictResolved: true } }));
      },
      activeYear: now.getFullYear(),
      activeMonth: now.getMonth(),

      hasLocalData: () => {
        const s = get();
        if (!s) return false;
        return ((s.transactions?.length ?? 0) + (s.fixedItems?.length ?? 0) + (s.goals?.length ?? 0) + (s.debts?.length ?? 0)) > 0;
      },

      setProfile: (p) => {
        set((s) => ({ profile: { ...s.profile, ...p } }));
        if (isSupabaseEnabled) {
          supabase.auth.getSession().then(async ({ data: { session: s2 } }) => {
            if (s2?.user?.id) {
              try { await supabase.from('user_settings').upsert(
                { user_id: s2.user.id, profile: { ...get().profile, ...p } },
                { onConflict: 'user_id' }
              ); } catch (e) { /* ignore */ }
            }
          });
        }
      },

      setTheme: (t) => {
        set({ theme: t });
        if (isSupabaseEnabled) {
          supabase.auth.getSession().then(async ({ data: { session: s2 } }) => {
            if (s2?.user?.id) {
              try { await supabase.from('user_settings').upsert(
                { user_id: s2.user.id, theme: t },
                { onConflict: 'user_id' }
              ); } catch (e) { /* ignore */ }
            }
          });
        }
      },
      toggleTheme: () => {
        const next = get().theme === "light" ? "dark" : "light";
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
          } else if (["monthly","bimonthly","quarterly","fourmonthly","biannual"].includes(f.frequency)) {
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

      addFixed: async (i) => {
        const nv = { ...i, id: generateSecureId() } as FixedItem;
        set((s) => ({ fixedItems: [nv, ...s.fixedItems], changeLog: [logEntry("fixed", nv.id, "create", `Creó concepto fijo "${nv.concept}"`), ...s.changeLog].slice(0, 500) }));

        // Sync to Supabase
        if (isSupabaseEnabled) {
          const user = (await supabase.auth.getUser()).data.user;
          if (user) {
            const payload = {
              id: nv.id,
              user_id: user.id,
              type: nv.type,
              category: nv.category,
              concept: nv.concept,
              amount: nv.amount,
              frequency: nv.frequency,
              active: nv.active,
              note: nv.note,
              start_date: nv.startDate,
              end_date: nv.endDate,
              priority: nv.priority,
              pay_day: nv.payDay,
              pay_week_day: nv.payWeekDay,
              icon: nv.icon,
              payment_method: nv.paymentMethod,
              account_id: nv.accountId,
            };
            if (isOnline()) {
              const { error } = await supabase.from('fixed_items').insert(payload);
              if (error) console.error('Supabase insert error (fixed_items):', sanitizeForLog(error));
            } else {
              queueMutation('fixed_items', 'INSERT', nv.id, payload);
            }
          }
        }
      },
      updateFixed: async (idv, p) => {
        const s = get();
        const prev = s.fixedItems.find((x) => x.id === idv); if (!prev) return;
        const ch = diffFields(prev, p);
        set((s) => ({ fixedItems: s.fixedItems.map((x) => x.id === idv ? { ...x, ...p } : x), changeLog: [logEntry("fixed", idv, "update", `Editó "${prev.concept}"`, ch), ...s.changeLog].slice(0, 500) }));

        // Sync to Supabase
        if (isSupabaseEnabled) {
          const user = (await supabase.auth.getUser()).data.user;
          if (user) {
            const payload = {
              type: p.type,
              category: p.category,
              concept: p.concept,
              amount: p.amount,
              frequency: p.frequency,
              active: p.active,
              note: p.note,
              start_date: p.startDate,
              end_date: p.endDate,
              priority: p.priority,
              pay_day: p.payDay,
              pay_week_day: p.payWeekDay,
              icon: p.icon,
              payment_method: p.paymentMethod,
              account_id: p.accountId,
            };
            if (isOnline()) {
              const { error } = await supabase.from('fixed_items').update(payload).eq('id', idv);
              if (error) console.error('Supabase update error (fixed_items):', sanitizeForLog(error));
            } else {
              queueMutation('fixed_items', 'UPDATE', idv, payload);
            }
          }
        }
      },
      removeFixed: async (idv) => {
        const s = get();
        const prev = s.fixedItems.find((x) => x.id === idv);
        // Also remove today's automatically created transaction for this fixed item (but keep historical ones)
        const pad = (n: number) => String(n).padStart(2, "0");
        const today = new Date();
        const todayISO = `${today.getFullYear()}-${pad(today.getMonth() + 1)}-${pad(today.getDate())}`;
        const remainingTx = s.transactions.filter((t) => {
          if (t.fixedId !== idv) return true;
          const td = parseDateLocal(t.date ?? "");
          const tISO = `${td.getFullYear()}-${pad(td.getMonth() + 1)}-${pad(td.getDate())}`;
          // keep transaction unless it's for today
          return tISO !== todayISO;
        });
        set({ fixedItems: s.fixedItems.filter((x) => x.id !== idv), transactions: remainingTx, changeLog: [logEntry("fixed", idv, "delete", `Eliminó "${prev?.concept ?? "concepto"}"`), ...s.changeLog].slice(0, 500) });

        // Sync to Supabase
        if (isSupabaseEnabled) {
          const user = (await supabase.auth.getUser()).data.user;
          if (user) {
            if (isOnline()) {
              const { error } = await supabase.from('fixed_items').delete().eq('id', idv);
              if (error) console.error('Supabase delete error (fixed_items):', sanitizeForLog(error));
            } else {
              queueMutation('fixed_items', 'DELETE', idv);
            }
          }
        }
      },
      toggleFixed: async (idv) => {
        const s = get();
        const prev = s.fixedItems.find((x) => x.id === idv); if (!prev) return;
        set((s) => ({ fixedItems: s.fixedItems.map((x) => x.id === idv ? { ...x, active: !x.active } : x), changeLog: [logEntry("fixed", idv, "update", `${prev.active ? "Pausó" : "Activó"} "${prev.concept}"`, [{ field: "active", from: prev.active, to: !prev.active }]), ...s.changeLog].slice(0, 500) }));

        // Sync to Supabase
        if (isSupabaseEnabled) {
          const user = (await supabase.auth.getUser()).data.user;
          if (user) {
            const payload = { active: !prev.active };
            if (isOnline()) {
              const { error } = await supabase.from('fixed_items').update(payload).eq('id', idv);
              if (error) console.error('Supabase update error (fixed_items):', sanitizeForLog(error));
            } else {
              queueMutation('fixed_items', 'UPDATE', idv, payload);
            }
          }
        }
      },

      // Helper: save a dataURL receipt to Supabase Storage or filesystem and return stored path/URL
      async saveReceiptFile(receiptId: string, dataUrl: string) {
        // Try Supabase Storage first if enabled and user logged in
        if (isSupabaseEnabled) {
          const user = (await supabase.auth.getUser()).data.user;
          if (user) {
            const url = await uploadReceipt(user.id, receiptId, dataUrl);
            if (url) return url;
          }
        }
        
        // Fallback to local filesystem
        try {
          if (typeof Filesystem?.writeFile === 'function') {
            const m = dataUrl.match(/^data:(image\/[^;]+);base64,(.*)$/);
            const base64 = m ? m[2] : dataUrl.split(",")[1];
            const mime = m ? m[1] : "image/png";
            const ext = mime.split("/")[1] || "png";
            const fname = `receipt-${receiptId}-${Date.now()}.${ext}`;
            const rel = `receipts/${fname}`;
            await Filesystem.writeFile({ path: rel, data: base64, directory: Directory.Data, encoding: Encoding.UTF8 });
            return rel;
          }
          return undefined;
        } catch (e) {
          return undefined;
        }
      },

      async deleteReceiptIfExists(receipt?: string) {
        if (!receipt) return;
        
        // Try Supabase Storage first if it's a Supabase URL
        if (isSupabaseEnabled && receipt.startsWith('http')) {
          const user = (await supabase.auth.getUser()).data.user;
          if (user) {
            const deleted = await deleteReceipt(user.id, receipt);
            if (deleted) return;
          }
        }
        
        // Fallback to local filesystem
        try {
          if (typeof Filesystem?.deleteFile === 'function') {
            let fname = receipt;
            if (receipt.includes("/")) fname = receipt.split("/").pop() as string;
            await Filesystem.deleteFile({ path: `receipts/${fname}`, directory: Directory.Data });
          }
        } catch (e) {
          // ignore
        }
      },

      addTx: async (t) => {
        // Prevent accidental duplicates for transactions created from a fixed item
        const s = get();
        if (t.fixedId) {
          const pad = (n: number) => String(n).padStart(2, "0");
          const td = t.date ? parseDateLocal(t.date) : new Date();
          const tDateISO = `${td.getFullYear()}-${pad(td.getMonth() + 1)}-${pad(td.getDate())}`;
          const exists = s.transactions.some((x) => {
            if (x.fixedId !== t.fixedId) return false;
            const xd = parseDateLocal(x.date ?? "");
            const xISO = `${xd.getFullYear()}-${pad(xd.getMonth() + 1)}-${pad(xd.getDate())}`;
            return xISO === tDateISO;
          });
          if (exists) return;
        }
        const nv = { ...t, id: generateSecureId() } as Transaction;

        // Enforce cash account if paymentMethod is cash
        if (nv.paymentMethod === "cash") {
          const cashAcc = s.accounts.find(a => a.type === "cash");
          if (cashAcc) nv.accountId = cashAcc.id;
        }

        // If receipt is a data URL, persist original to IndexedDB then upload compressed
        if (typeof nv.receipt === "string" && nv.receipt.startsWith("data:")) {
          // Save original to IndexedDB first (before compression replaces it)
          saveReceiptToIndexedDB(`tx:${nv.id}`, nv.receipt).catch(() => {});
          if (Capacitor.isNativePlatform()) {
            const saved = await get().saveReceiptFile(nv.id, nv.receipt);
            if (saved) nv.receipt = saved;
          }
        }
        set((s2) => ({ transactions: [nv, ...s2.transactions], changeLog: [logEntry("transaction", nv.id, "create", `Agregó ${nv.type === "income" ? "ingreso" : nv.type === "saving" ? "ahorro" : "gasto"} "${nv.concept}"`), ...s2.changeLog].slice(0, 500) }));

        // Sync to Supabase
        if (isSupabaseEnabled) {
          const user = (await supabase.auth.getUser()).data.user;
          if (user) {
            const payload = {
              id: nv.id,
              user_id: user.id,
              type: nv.type,
              category: nv.category,
              concept: nv.concept,
              amount: nv.amount,
              date: nv.date,
              note: nv.note,
              icon: nv.icon,
              payment_method: nv.paymentMethod,
              fixed_id: nv.fixedId,
              account_id: nv.accountId,
              transfer_to_account_id: nv.transferToAccountId,
              external_payee: nv.externalPayee,
              receipt: nv.receipt,
            };
            if (isOnline()) {
              const { error } = await supabase.from('transactions').insert(payload);
              if (error) console.error('Supabase insert error (transactions):', sanitizeForLog(error));
            } else {
              queueMutation('transactions', 'INSERT', nv.id, payload);
            }
          }
        }
      },
      updateTx: async (idv, p) => {
        const s = get();
        const prev = s.transactions.find((x) => x.id === idv); if (!prev) return;
        const patch = { ...p } as Partial<Transaction>;

        // Enforce cash account if paymentMethod is cash
        if (patch.paymentMethod === "cash") {
          const cashAcc = s.accounts.find(a => a.type === "cash");
          if (cashAcc) patch.accountId = cashAcc.id;
        }

        // If new receipt is a data URL, persist it then delete old
        if (typeof p.receipt === "string" && p.receipt.startsWith("data:") && Capacitor.isNativePlatform()) {
          const saved = await get().saveReceiptFile(idv, p.receipt as string);
          if (saved) {
            patch.receipt = saved;
            await get().deleteReceiptIfExists(prev.receipt);
          }
        }
        set((s2) => ({ transactions: s2.transactions.map((x) => x.id === idv ? { ...x, ...patch } : x), changeLog: [logEntry("transaction", idv, "update", `Editó "${prev.concept}"`, diffFields(prev, patch)), ...s2.changeLog].slice(0, 500) }));

        // Sync to Supabase
        if (isSupabaseEnabled) {
          const user = (await supabase.auth.getUser()).data.user;
          if (user) {
            const payload = {
              type: patch.type,
              category: patch.category,
              concept: patch.concept,
              amount: patch.amount,
              date: patch.date,
              note: patch.note,
              icon: patch.icon,
              payment_method: patch.paymentMethod,
              fixed_id: patch.fixedId,
              account_id: patch.accountId,
              transfer_to_account_id: patch.transferToAccountId,
              external_payee: patch.externalPayee,
              receipt: patch.receipt,
            };
            if (isOnline()) {
              const { error } = await supabase.from('transactions').update(payload).eq('id', idv);
              if (error) console.error('Supabase update error (transactions):', sanitizeForLog(error));
            } else {
              queueMutation('transactions', 'UPDATE', idv, payload);
            }
          }
        }
      },
      removeTx: async (idv) => {
        const s = get();
        const prev = s.transactions.find((x) => x.id === idv);
        if (prev?.receipt) await get().deleteReceiptIfExists(prev.receipt);
        set((s2) => ({ transactions: s2.transactions.filter((x) => x.id !== idv), changeLog: [logEntry("transaction", idv, "delete", `Eliminó "${prev?.concept ?? "movimiento"}"`), ...s2.changeLog].slice(0, 500) }));

        // Sync to Supabase
        if (isSupabaseEnabled) {
          const user = (await supabase.auth.getUser()).data.user;
          if (user) {
            if (isOnline()) {
              const { error } = await supabase.from('transactions').delete().eq('id', idv);
              if (error) console.error('Supabase delete error (transactions):', sanitizeForLog(error));
            } else {
              queueMutation('transactions', 'DELETE', idv);
            }
          }
        }
      },

      addAccount: async (a) => {
        const s = get();
        if (a.type === "cash" && s.accounts.some(x => x.type === "cash")) {
          return {};
        }
        const nv = { ...a, id: generateSecureId() } as Account;
        set((s) => ({ accounts: [nv, ...s.accounts] }));

        // Sync to Supabase
        if (isSupabaseEnabled) {
          const user = (await supabase.auth.getUser()).data.user;
          if (user) {
            const payload = {
              id: nv.id,
              user_id: user.id,
              name: nv.name,
              type: nv.type,
              initial_balance: nv.initialBalance,
              currency: nv.currency,
              clabe: nv.clabe,
              bank: nv.bank,
              holder_name: nv.holderName,
              denominations: nv.denominations,
            };
            if (isOnline()) {
              const { error } = await supabase.from('accounts').insert(payload);
              if (error) console.error('Supabase insert error (accounts):', sanitizeForLog(error));
            } else {
              queueMutation('accounts', 'INSERT', nv.id, payload);
            }
          }
        }
      },
      updateAccount: async (idv, p) => {
        const s = get();
        const prev = s.accounts.find((x) => x.id === idv);
        set((s) => ({ accounts: s.accounts.map((x) => x.id === idv ? { ...x, ...p } : x) }));

        // Sync to Supabase
        if (isSupabaseEnabled && prev) {
          const user = (await supabase.auth.getUser()).data.user;
          if (user) {
            const payload = { ...prev, ...p };
            if (isOnline()) {
              const { error } = await supabase.from('accounts').update(payload).eq('id', idv);
              if (error) console.error('Supabase update error (accounts):', sanitizeForLog(error));
            } else {
              queueMutation('accounts', 'UPDATE', idv, payload);
            }
          }
        }
      },
      removeAccount: async (idv) => {
        set((s) => ({
          accounts: s.accounts.filter((x) => x.id !== idv),
          transactions: s.transactions.map((t) => t.accountId === idv ? { ...t, accountId: undefined } : t),
        }));

        // Sync to Supabase
        if (isSupabaseEnabled) {
          const user = (await supabase.auth.getUser()).data.user;
          if (user) {
            if (isOnline()) {
              const { error } = await supabase.from('accounts').delete().eq('id', idv);
              if (error) console.error('Supabase delete error (accounts):', sanitizeForLog(error));
            } else {
              queueMutation('accounts', 'DELETE', idv);
            }
          }
        }
      },
      mergeAccounts: (fromIds, intoId) => set((s) => ({
        transactions: s.transactions.map((t) => fromIds.includes(t.accountId ?? "") ? { ...t, accountId: intoId } : t),
        accounts: s.accounts.filter((a) => !fromIds.includes(a.id) || a.id === intoId),
      })),

      addGoal: async (g) => {
        const s = get();
        const nv = {
          ...g,
          id: generateSecureId(),
          createdAt: g.createdAt ?? new Date().toISOString(),
          contributions: g.contributions ?? (g.saved > 0
            ? [{ id: generateSecureId(), date: new Date().toISOString(), amount: g.saved }]
            : []),
        } as Goal;
        const nextGoals = nv.pinned ? [nv, ...s.goals.map((x: Goal) => ({ ...x, pinned: false }))] : [nv, ...s.goals];
        const state = { goals: nextGoals, changeLog: [logEntry("goal", nv.id, "create", `Creó meta "${nv.name}"`), ...s.changeLog].slice(0, 500) };
        set(state);

        // Sync to Supabase
        if (isSupabaseEnabled) {
          const user = (await supabase.auth.getUser()).data.user;
          if (user) {
            const payload = {
              id: nv.id,
              user_id: user.id,
              name: nv.name,
              target: nv.target,
              saved: nv.saved,
              emoji: nv.emoji,
              color: nv.color,
              deadline: nv.deadline,
              icon: nv.icon,
              purchase_url: nv.purchaseUrl,
              contributions: nv.contributions,
              pinned: nv.pinned,
            };
            if (isOnline()) {
              const { error } = await supabase.from('goals').insert(payload);
              if (error) console.error('Supabase insert error (goals):', sanitizeForLog(error));
            } else {
              queueMutation('goals', 'INSERT', nv.id, payload);
            }
          }
        }
      },
      updateGoal: async (idv, p) => {
        const s = get();
        const prev = s.goals.find((x) => x.id === idv); if (!prev) return;
        const ch = diffFields(prev, p);
        let nextGoals = s.goals.map((x) => x.id === idv ? { ...x, ...p } : x);
        // If pinning this goal, unpin others
        if ((p as any).pinned === true) {
          nextGoals = nextGoals.map((x) => x.id === idv ? { ...x, pinned: true } : { ...x, pinned: false });
        }
        set({ goals: nextGoals, changeLog: [logEntry("goal", idv, "update", `Editó meta "${prev.name}"`, ch), ...s.changeLog].slice(0, 500) });

        // Sync to Supabase
        if (isSupabaseEnabled) {
          const user = (await supabase.auth.getUser()).data.user;
          if (user) {
            const payload = {
              name: p.name,
              target: p.target,
              saved: p.saved,
              emoji: p.emoji,
              color: p.color,
              deadline: p.deadline,
              icon: p.icon,
              purchase_url: p.purchaseUrl,
              contributions: p.contributions,
              pinned: p.pinned,
            };
            if (isOnline()) {
              const { error } = await supabase.from('goals').update(payload).eq('id', idv);
              if (error) console.error('Supabase update error (goals):', sanitizeForLog(error));
            } else {
              queueMutation('goals', 'UPDATE', idv, payload);
            }
          }
        }
      },
      removeGoal: async (idv) => {
        const s = get();
        const prev = s.goals.find((x) => x.id === idv);
        set({ goals: s.goals.filter((x) => x.id !== idv), changeLog: [logEntry("goal", idv, "delete", `Eliminó meta "${prev?.name ?? ""}"`), ...s.changeLog].slice(0, 500) });

        // Sync to Supabase
        if (isSupabaseEnabled) {
          const user = (await supabase.auth.getUser()).data.user;
          if (user) {
            if (isOnline()) {
              const { error } = await supabase.from('goals').delete().eq('id', idv);
              if (error) console.error('Supabase delete error (goals):', sanitizeForLog(error));
            } else {
              queueMutation('goals', 'DELETE', idv);
            }
          }
        }
      },
      contributeGoal: (idv, amount, date, accountId) => set((s) => {
        const g = s.goals.find((x) => x.id === idv);
        const txId = generateSecureId();
        const when = date ?? new Date().toISOString();
        const entry = { id: generateSecureId(), date: when, amount };
        const method = s.accounts.find(a => a.id === accountId)?.type === "bank" ? "transfer" : "cash";

        return {
          goals: s.goals.map((x) => x.id === idv ? {
            ...x,
            saved: Math.max(0, x.saved + amount),
            contributions: [...(x.contributions ?? []), entry],
          } : x),
          transactions: [{ id: txId, type: amount >= 0 ? "saving" : "income", category: "Meta", concept: `${amount >= 0 ? "Aporte" : "Retiro"} ${g?.name ?? "Meta"}`, amount: Math.abs(amount), date: when, accountId, paymentMethod: method }, ...s.transactions],
          changeLog: [logEntry("goal", idv, "update", `${amount >= 0 ? "Aportó" : "Retiró"} ${Math.abs(amount)} a "${g?.name ?? ""}"`, [{ field: "saved", from: g?.saved, to: (g?.saved ?? 0) + amount }]), ...s.changeLog].slice(0, 500),
        };
      }),

      addDebt: async (d) => {
        const nv: Debt = { ...d, id: generateSecureId(), payments: [] };
        set((s) => ({ debts: [nv, ...s.debts], changeLog: [logEntry("debt", nv.id, "create", `Registró deuda de ${nv.person} por ${nv.amount}`), ...s.changeLog].slice(0, 500) }));

        // Sync to Supabase
        if (isSupabaseEnabled) {
          const user = (await supabase.auth.getUser()).data.user;
          if (user) {
            const payload: Record<string, unknown> = {
              id: nv.id,
              user_id: user.id,
              person: nv.person,
              concept: nv.concept,
              amount: nv.amount,
              date: nv.date,
              due_date: nv.dueDate,
              note: nv.note,
              icon: nv.icon,
            };
            if (nv.accountId && isValidUUID(nv.accountId)) payload.account_id = nv.accountId;
            if (isOnline()) {
              const { error } = await supabase.from('debts').insert(payload);
              if (error) {
                console.error('Supabase insert error (debts):', sanitizeForLog(error));
                toast.error('Error al guardar deuda en la nube: ' + error.message);
              }
            } else {
              queueMutation('debts', 'INSERT', nv.id, payload);
            }
          }
        }
      },
      updateDebt: async (idv, p) => {
        const s = get();
        const prev = s.debts.find((x) => x.id === idv); if (!prev) return;
        const ch = diffFields(prev, p);
        set({ debts: s.debts.map((x) => x.id === idv ? { ...x, ...p } : x), changeLog: [logEntry("debt", idv, "update", `Editó deuda de "${prev.person}"`, ch), ...s.changeLog].slice(0, 500) });

        // Sync to Supabase
        if (isSupabaseEnabled) {
          const user = (await supabase.auth.getUser()).data.user;
          if (user) {
            const payload: Record<string, unknown> = {
              person: p.person,
              concept: p.concept,
              amount: p.amount,
              date: p.date,
              due_date: p.dueDate,
              note: p.note,
              icon: p.icon,
            };
            if (p.accountId && isValidUUID(p.accountId)) payload.account_id = p.accountId;
            if (isOnline()) {
              const { error } = await supabase.from('debts').update(payload).eq('id', idv);
              if (error) {
                console.error('Supabase update error (debts):', sanitizeForLog(error));
                toast.error('Error al actualizar deuda en la nube: ' + error.message);
              }
            } else {
              queueMutation('debts', 'UPDATE', idv, payload);
            }
          }
        }
      },
      removeDebt: async (idv) => {
        const s = get();
        const prev = s.debts.find((x) => x.id === idv);
        set({ debts: s.debts.filter((x) => x.id !== idv), changeLog: [logEntry("debt", idv, "delete", `Eliminó deuda de "${prev?.person ?? ""}"`), ...s.changeLog].slice(0, 500) });

        // Sync to Supabase
        if (isSupabaseEnabled) {
          const user = (await supabase.auth.getUser()).data.user;
          if (user) {
            if (isOnline()) {
              const { error } = await supabase.from('debts').delete().eq('id', idv);
              if (error) console.error('Supabase delete error (debts):', sanitizeForLog(error));
            } else {
              queueMutation('debts', 'DELETE', idv);
            }
          }
        }
      },
      addDebtPayment: async (debtId, p) => {
        const s = get();
        const debt = s.debts.find((x) => x.id === debtId); if (!debt) return;

        // Enforce cash account if paymentMethod is cash
        const enriched = { ...p };
        if (enriched.paymentMethod === "cash") {
          const cashAcc = s.accounts.find(a => a.type === "cash");
          if (cashAcc) enriched.accountId = cashAcc.id;
        }
        const payment: DebtPayment = { ...enriched, id: generateSecureId() };

        // Add payment to store IMMEDIATELY before any async operations
        // to prevent stale state in React renders / merge logic.
        set((s) => ({
          debts: s.debts.map((x) => x.id === debtId ? { ...x, payments: [payment, ...x.payments] } : x),
          changeLog: [logEntry("debt", debtId, "update", `Abono de ${payment.amount} a deuda de "${debt.person}"`), ...s.changeLog].slice(0, 500),
        }));

        // Receipt: save original to IndexedDB, upload compressed to Supabase Storage
        if (payment.receipt && payment.receipt.startsWith('data:')) {
          saveReceiptToIndexedDB(`pay:${payment.id}`, payment.receipt).catch(() => {});
          if (isSupabaseEnabled) {
            const url = await get().saveReceiptFile(payment.id, payment.receipt);
            if (url) {
              payment.receipt = url;
              // Update receipt URL in store after upload
              set((s) => ({
                debts: s.debts.map((x) => x.id === debtId ? { ...x, payments: x.payments.map((p) => p.id === payment.id ? { ...p, receipt: url } : p) } : x),
              }));
            }
          }
        }

        // Resolve the debt's UUID for Supabase
        let resolvedDebtId = debtId;
        if (isSupabaseEnabled && !isValidUUID(debtId)) {
          const user = (await supabase.auth.getUser()).data.user;
          if (user) {
            // First try to find existing debt in Supabase by person+amount+concept
            const { data: existing } = await supabase
              .from('debts')
              .select('id')
              .eq('user_id', user.id)
              .eq('person', debt.person)
              .eq('amount', debt.amount)
              .eq('concept', debt.concept)
              .maybeSingle();
            if (existing) {
              resolvedDebtId = existing.id;
            } else {
              const newId = generateSecureId();
              const debtPayload: Record<string, unknown> = {
                id: newId,
                user_id: user.id,
                person: debt.person,
                concept: debt.concept,
                amount: debt.amount,
                date: debt.date,
                due_date: debt.dueDate,
                note: debt.note,
                icon: debt.icon,
              };
              if (debt.accountId && isValidUUID(debt.accountId)) {
                debtPayload.account_id = debt.accountId;
              }
              if (isOnline()) {
                const { error: debtErr } = await supabase.from('debts').upsert(debtPayload, { onConflict: 'id' });
                if (debtErr) {
                  console.error('Supabase upsert error (debts):', sanitizeForLog(debtErr));
                  toast.error('Error al sincronizar deuda: ' + debtErr.message);
                } else {
                  resolvedDebtId = newId;
                }
              } else {
                queueMutation('debts', 'INSERT', newId, debtPayload);
                resolvedDebtId = newId;
              }
            }
          }
        }

        // Sync payment to Supabase (include ALL fields for cross-device view)
        if (isSupabaseEnabled && isValidUUID(resolvedDebtId)) {
          const user = (await supabase.auth.getUser()).data.user;
          if (user) {
            const payload: Record<string, unknown> = {
              id: payment.id,
              user_id: user.id,
              debt_id: resolvedDebtId,
              amount: payment.amount,
              date: payment.date,
              note: payment.note,
              payment_method: payment.paymentMethod,
            };
            if (payment.accountId && isValidUUID(payment.accountId)) {
              payload.account_id = payment.accountId;
            }
            if (payment.transferToAccountId && isValidUUID(payment.transferToAccountId)) {
              payload.transfer_to_account_id = payment.transferToAccountId;
            }
            if (payment.externalPayee) {
              payload.external_payee = payment.externalPayee;
            }
            if (payment.receipt && !payment.receipt.startsWith('data:')) {
              // Only sync remote URLs (data URIs stay local)
              payload.receipt_url = payment.receipt;
            }
            if (isOnline()) {
              const { error } = await supabase.from('debt_payments').insert(payload);
              if (error) {
                // If FK violation on account_id, retry without account-dependent fields
                if (error.code === '23503') {
                  delete payload.account_id;
                  delete payload.transfer_to_account_id;
                  const { error: retryErr } = await supabase.from('debt_payments').insert(payload);
                  if (retryErr) toast.error('Error al sincronizar abono: ' + retryErr.message);
                } else {
                  toast.error('Error al sincronizar abono: ' + error.message);
                }
              }
            } else {
              queueMutation('debt_payments', 'INSERT', payment.id, payload);
            }
          }
        }
      },
      removeDebtPayment: async (debtId, paymentId) => {
        // Cleanup receipt from IndexedDB if present
        const prev = get().debts.find((x) => x.id === debtId);
        const removedPayment = prev?.payments.find((p) => p.id === paymentId);
        if (removedPayment?.receipt && removedPayment.receipt.startsWith('data:')) {
          deleteReceiptFromIndexedDB(`pay:${paymentId}`).catch(() => {});
        }
        set((s) => ({
          debts: s.debts.map((x) => x.id === debtId ? { ...x, payments: x.payments.filter((p) => p.id !== paymentId) } : x),
          changeLog: [logEntry("debt", debtId, "update", `Eliminó un abono`), ...s.changeLog].slice(0, 500),
        }));

        // Sync to Supabase
        if (isSupabaseEnabled) {
          const user = (await supabase.auth.getUser()).data.user;
          if (user) {
            if (isOnline()) {
              const { error } = await supabase.from('debt_payments').delete().eq('id', paymentId);
              if (error) console.error('Supabase delete error (debt_payments):', sanitizeForLog(error));
            } else {
              queueMutation('debt_payments', 'DELETE', paymentId);
            }
          }
        }
      },

      clearChangeLog: () => set({ changeLog: [] }),

      exportData: (scopes) => {
        const s = get();
        const sc = { ...ALL_SCOPES, ...(scopes ?? {}) };
        const data: Record<string, unknown> = {};
        if (sc.fixedItems) data.fixedItems = s.fixedItems;
        if (sc.transactions) data.transactions = s.transactions;
        if (sc.accounts) data.accounts = s.accounts;
        if (sc.goals) data.goals = s.goals;
        if (sc.debts) data.debts = s.debts;
        if (sc.changeLog) data.changeLog = s.changeLog;
        if (sc.theme) data.theme = s.theme;
        if (sc.profile) data.profile = s.profile;
        const payload = {
          app: "finance-pal",
          version: SCHEMA_VERSION,
          exportedAt: new Date().toISOString(),
          scopes: sc,
          data,
        };
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
          const { data, warnings } = migrateImported(parsed);
          const sc = { ...ALL_SCOPES, ...(scopes ?? {}) };
          const cur = get();

          const fixedItems = sc.fixedItems && Array.isArray(data.fixedItems)
            ? (data.fixedItems as any[]).map(sanitizeFixed).filter((x): x is FixedItem => !!x)
            : cur.fixedItems;
          const transactions = sc.transactions && Array.isArray(data.transactions)
            ? (data.transactions as any[]).map(sanitizeTx).filter((x): x is Transaction => !!x)
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
            ? (data.accounts as any[]).map(sanitizeAccount).filter((x): x is Account => !!x)
            : cur.accounts;
          const goals = sc.goals && Array.isArray(data.goals)
            ? (data.goals as any[]).map(sanitizeGoal).filter((x): x is Goal => !!x)
            : cur.goals;
          const debts = sc.debts && Array.isArray(data.debts)
            ? (data.debts as any[]).map(sanitizeDebt).filter((x): x is Debt => !!x)
            : cur.debts;
          const changeLog: ChangeLogEntry[] = sc.changeLog && Array.isArray(data.changeLog)
            ? (data.changeLog as any[]).filter((e) => isObj(e) && isStr(e.id) && isStr(e.label)).slice(0, 500) as ChangeLogEntry[]
            : cur.changeLog;
          const theme: ThemeMode = sc.theme && (data.theme === "dark" || data.theme === "light")
            ? (data.theme as ThemeMode)
            : cur.theme;
          const profile = sc.profile && data.profile != null
            ? sanitizeProfile(data.profile)
            : cur.profile;

          set({ fixedItems, transactions, accounts, goals, debts, changeLog, theme, profile });
          // After importing, also migrate any in-place dataURL receipts from existing state
          try { await get().migrateReceiptsInPlace(); } catch (e) { /* ignore */ }
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
                } catch (_) { sizes[o] = 0; }
              }
              const totalBytes = Object.values(sizes).reduce((a, b) => a + b, 0);
              if (deleteFiles && orphans.length > 0) {
                for (const o of orphans) {
                  try {
                    await Filesystem.deleteFile({ path: `receipts/${o}`, directory: Directory.Data });
                    freed += sizes[o] || 0;
                  } catch (e) { /* ignore */ }
                }
                // record changeLog entry
                set((s2) => ({ changeLog: [logEntry("transaction", generateSecureId(), "update", `Eliminó ${orphans.length} recibos huérfanos, liberó ${(freed / 1024).toFixed(1)} KB`), ...s2.changeLog].slice(0, 500) }));
              }
              return { orphans, freedBytes: deleteFiles ? freed : totalBytes };
            } catch (e) {
              return { orphans: [], freedBytes: 0 };
            }
          },

      resetAll: () => {
        const d = new Date();
        set({ fixedItems: [], transactions: [], goals: [], debts: [], changeLog: [], activeYear: d.getFullYear(), activeMonth: d.getMonth(), appSettings: { accentColor: "blue", compactMode: false, glassEffect: true, conflictResolved: false } });
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
          if (data.theme === 'dark' || data.theme === 'light') set({ theme: data.theme });
          if (data.profile && typeof data.profile === 'object') {
            set({ profile: { name: '', currency: 'MXN', ...data.profile } });
          }
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
    }),
    {
      name: "migol-finanzas-v2",
      version: SCHEMA_VERSION,
      storage: {
        getItem: async (name: string) => {
          let data: any = null;
          // Always try localStorage first (most reliable)
          const item = localStorage.getItem(name);
          if (item) {
            try { data = JSON.parse(item); } catch (e) { /* ignore */ }
          }
          // Fallback to encrypted storage
          if (!data && isEncryptionAvailable()) {
            const decrypted = await loadEncryptedState();
            if (decrypted) {
              try { data = JSON.parse(decrypted); } catch (e) { /* ignore */ }
            }
          }
          // Restore receipts from IndexedDB
          if (data?.state) await restoreReceiptsFromIndexedDB(data.state);
          return data;
        },
        setItem: async (name: string, value: any) => {
          try {
            if (value?.state) await extractReceiptsToIndexedDB(value.state);
          } catch (e) { /* ignore receipt extraction errors */ }
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
      migrate: (state: any, fromVersion: number) => {
        if (!state) return state;
        // Add new fields with defaults — never lose existing user data.
        const next = {
          debts: [],
          changeLog: [],
          theme: "light" as ThemeMode,
          profile: { name: "", currency: "MXN" } as UserProfile,
          appSettings: { accentColor: "blue", compactMode: false, glassEffect: true, conflictResolved: false },
          ...state,
        };
        // Re-sanitize collections from older versions to drop malformed entries.
        if (fromVersion < SCHEMA_VERSION) {
          next.fixedItems = (Array.isArray(next.fixedItems) ? next.fixedItems : [])
            .map(sanitizeFixed).filter(Boolean);
          next.transactions = (Array.isArray(next.transactions) ? next.transactions : [])
            .map(sanitizeTx).filter(Boolean);
          next.accounts = (Array.isArray(next.accounts) ? next.accounts : [])
            .map(sanitizeAccount).filter(Boolean);
          next.goals = (Array.isArray(next.goals) ? next.goals : [])
            .map(sanitizeGoal).filter(Boolean);
          next.debts = (Array.isArray(next.debts) ? next.debts : [])
            .map(sanitizeDebt).filter(Boolean);
          next.profile = sanitizeProfile(next.profile);
        }
        return next;
      },
    }
  )
);
