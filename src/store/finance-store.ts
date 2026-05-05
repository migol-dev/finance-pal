import { create } from "zustand";
import { persist } from "zustand/middleware";
import { FixedItem, Transaction, Goal, Debt, DebtPayment, ChangeLogEntry, ChangeAction, ChangeEntity, IconRef } from "@/lib/finance";

export type ThemeMode = "light" | "dark";
export type Currency = "MXN" | "USD" | "EUR" | "COP" | "ARS" | "CLP" | "PEN" | "BRL";

export interface UserProfile {
  name: string;
  email?: string;
  currency: Currency;
  avatar?: IconRef;
}

/** Current schema version of persisted/exported data. */
export const SCHEMA_VERSION = 4;

interface State {
  fixedItems: FixedItem[];
  transactions: Transaction[];
  goals: Goal[];
  debts: Debt[];
  changeLog: ChangeLogEntry[];
  theme: ThemeMode;
  profile: UserProfile;
  setProfile: (p: Partial<UserProfile>) => void;
  setTheme: (t: ThemeMode) => void;
  toggleTheme: () => void;
  // Active month/year context (defaults to today on first load)
  activeYear: number;
  activeMonth: number; // 0-11
  setActive: (year: number, month: number) => void;
  resetToToday: () => void;

  addFixed: (i: Omit<FixedItem, "id">) => void;
  updateFixed: (id: string, p: Partial<FixedItem>) => void;
  removeFixed: (id: string) => void;
  toggleFixed: (id: string) => void;

  addTx: (t: Omit<Transaction, "id">) => void;
  updateTx: (id: string, p: Partial<Transaction>) => void;
  removeTx: (id: string) => void;

  addGoal: (g: Omit<Goal, "id">) => void;
  updateGoal: (id: string, p: Partial<Goal>) => void;
  removeGoal: (id: string) => void;
  contributeGoal: (id: string, amount: number) => void;

  addDebt: (d: Omit<Debt, "id" | "payments">) => void;
  updateDebt: (id: string, p: Partial<Debt>) => void;
  removeDebt: (id: string) => void;
  addDebtPayment: (debtId: string, p: Omit<DebtPayment, "id">) => void;
  removeDebtPayment: (debtId: string, paymentId: string) => void;

  clearChangeLog: () => void;
  exportData: () => string;
  importData: (json: string) => { ok: boolean; error?: string; warnings?: string[] };

  resetAll: () => void;
}

const id = () => Math.random().toString(36).slice(2, 10);
const now = new Date();

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
  return { id: id(), at: new Date().toISOString(), entity, entityId, action, label, changes };
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
    id: isStr(raw.id) ? raw.id : id(),
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
    icon: sanitizeIcon(raw.icon),
    paymentMethod: inSet(pays, raw.paymentMethod) ? raw.paymentMethod : undefined,
  };
}

function sanitizeTx(raw: any): Transaction | null {
  if (!isObj(raw) || !isStr(raw.concept) || !isNum(raw.amount)) return null;
  const types = ["income","expense","saving"] as const;
  const pays = ["cash","transfer","card","other"] as const;
  return {
    id: isStr(raw.id) ? raw.id : id(),
    type: inSet(types, raw.type) ? raw.type : "expense",
    category: isStr(raw.category) ? raw.category : "Otros",
    concept: raw.concept,
    amount: raw.amount,
    date: isStr(raw.date) ? raw.date : new Date().toISOString(),
    note: isStr(raw.note) ? raw.note : undefined,
    icon: sanitizeIcon(raw.icon),
    paymentMethod: inSet(pays, raw.paymentMethod) ? raw.paymentMethod : undefined,
  };
}

function sanitizeGoal(raw: any): Goal | null {
  if (!isObj(raw) || !isStr(raw.name) || !isNum(raw.target)) return null;
  return {
    id: isStr(raw.id) ? raw.id : id(),
    name: raw.name,
    target: raw.target,
    saved: isNum(raw.saved) ? raw.saved : 0,
    emoji: isStr(raw.emoji) ? raw.emoji : "🎯",
    color: isStr(raw.color) ? raw.color : "gradient-primary",
    deadline: isStr(raw.deadline) ? raw.deadline : undefined,
    icon: sanitizeIcon(raw.icon),
  } as Goal;
}

function sanitizeDebt(raw: any): Debt | null {
  if (!isObj(raw) || !isStr(raw.person) || !isNum(raw.amount)) return null;
  const pays = ["cash","transfer","card","other"] as const;
  const payments: DebtPayment[] = Array.isArray(raw.payments)
    ? (raw.payments as any[])
      .filter((p) => isObj(p) && isNum(p.amount))
      .map((p) => ({
        id: isStr(p.id) ? p.id : id(),
        amount: p.amount as number,
        date: isStr(p.date) ? p.date : new Date().toISOString(),
        note: isStr(p.note) ? p.note : undefined,
        paymentMethod: inSet(pays, p.paymentMethod) ? p.paymentMethod : undefined,
      }))
    : [];
  return {
    id: isStr(raw.id) ? raw.id : id(),
    person: raw.person,
    concept: isStr(raw.concept) ? raw.concept : "Préstamo",
    amount: raw.amount,
    date: isStr(raw.date) ? raw.date : new Date().toISOString(),
    dueDate: isStr(raw.dueDate) ? raw.dueDate : undefined,
    note: isStr(raw.note) ? raw.note : undefined,
    icon: sanitizeIcon(raw.icon),
    payments,
  } as Debt;
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

/** Upgrade an older payload to current schema. Pure: returns sanitized data. */
function migrateImported(payload: any): { data: any; warnings: string[] } {
  const warnings: string[] = [];
  const version: number = isNum(payload?.version) ? payload.version : 1;
  const d = payload?.data ?? payload ?? {};
  if (version > SCHEMA_VERSION) warnings.push(`Importando datos de una versión más nueva (${version}). Algunos campos podrían ignorarse.`);
  if (version < SCHEMA_VERSION) warnings.push(`Migrando datos de versión ${version} a ${SCHEMA_VERSION}.`);
  return { data: d, warnings };
}

export const useFinance = create<State>()(
  persist(
    (set, get) => ({
      fixedItems: [],
      transactions: [],
      goals: [],
      debts: [],
      changeLog: [],
      theme: "light",
      profile: { name: "", currency: "MXN" },
      activeYear: now.getFullYear(),
      activeMonth: now.getMonth(),

      setProfile: (p) => set((s) => ({ profile: { ...s.profile, ...p } })),

      setTheme: (t) => set({ theme: t }),
      toggleTheme: () => set((s) => ({ theme: s.theme === "light" ? "dark" : "light" })),

      setActive: (y, m) => set({ activeYear: y, activeMonth: m }),
      resetToToday: () => { const d = new Date(); set({ activeYear: d.getFullYear(), activeMonth: d.getMonth() }); },

      addFixed: (i) => set((s) => {
        const nv = { ...i, id: id() } as FixedItem;
        return { fixedItems: [nv, ...s.fixedItems], changeLog: [logEntry("fixed", nv.id, "create", `Creó concepto fijo "${nv.concept}"`), ...s.changeLog].slice(0, 500) };
      }),
      updateFixed: (idv, p) => set((s) => {
        const prev = s.fixedItems.find((x) => x.id === idv); if (!prev) return {} as any;
        const ch = diffFields(prev, p);
        return { fixedItems: s.fixedItems.map((x) => x.id === idv ? { ...x, ...p } : x), changeLog: [logEntry("fixed", idv, "update", `Editó "${prev.concept}"`, ch), ...s.changeLog].slice(0, 500) };
      }),
      removeFixed: (idv) => set((s) => {
        const prev = s.fixedItems.find((x) => x.id === idv);
        return { fixedItems: s.fixedItems.filter((x) => x.id !== idv), changeLog: [logEntry("fixed", idv, "delete", `Eliminó "${prev?.concept ?? "concepto"}"`), ...s.changeLog].slice(0, 500) };
      }),
      toggleFixed: (idv) => set((s) => {
        const prev = s.fixedItems.find((x) => x.id === idv); if (!prev) return {} as any;
        return { fixedItems: s.fixedItems.map((x) => x.id === idv ? { ...x, active: !x.active } : x), changeLog: [logEntry("fixed", idv, "update", `${prev.active ? "Pausó" : "Activó"} "${prev.concept}"`, [{ field: "active", from: prev.active, to: !prev.active }]), ...s.changeLog].slice(0, 500) };
      }),

      addTx: (t) => set((s) => {
        const nv = { ...t, id: id() } as Transaction;
        return { transactions: [nv, ...s.transactions], changeLog: [logEntry("transaction", nv.id, "create", `Agregó ${nv.type === "income" ? "ingreso" : nv.type === "saving" ? "ahorro" : "gasto"} "${nv.concept}"`), ...s.changeLog].slice(0, 500) };
      }),
      updateTx: (idv, p) => set((s) => {
        const prev = s.transactions.find((x) => x.id === idv); if (!prev) return {} as any;
        const ch = diffFields(prev, p);
        return { transactions: s.transactions.map((x) => x.id === idv ? { ...x, ...p } : x), changeLog: [logEntry("transaction", idv, "update", `Editó "${prev.concept}"`, ch), ...s.changeLog].slice(0, 500) };
      }),
      removeTx: (idv) => set((s) => {
        const prev = s.transactions.find((x) => x.id === idv);
        return { transactions: s.transactions.filter((x) => x.id !== idv), changeLog: [logEntry("transaction", idv, "delete", `Eliminó "${prev?.concept ?? "movimiento"}"`), ...s.changeLog].slice(0, 500) };
      }),

      addGoal: (g) => set((s) => {
        const nv = { ...g, id: id() } as Goal;
        return { goals: [nv, ...s.goals], changeLog: [logEntry("goal", nv.id, "create", `Creó meta "${nv.name}"`), ...s.changeLog].slice(0, 500) };
      }),
      updateGoal: (idv, p) => set((s) => {
        const prev = s.goals.find((x) => x.id === idv); if (!prev) return {} as any;
        const ch = diffFields(prev, p);
        return { goals: s.goals.map((x) => x.id === idv ? { ...x, ...p } : x), changeLog: [logEntry("goal", idv, "update", `Editó meta "${prev.name}"`, ch), ...s.changeLog].slice(0, 500) };
      }),
      removeGoal: (idv) => set((s) => {
        const prev = s.goals.find((x) => x.id === idv);
        return { goals: s.goals.filter((x) => x.id !== idv), changeLog: [logEntry("goal", idv, "delete", `Eliminó meta "${prev?.name ?? ""}"`), ...s.changeLog].slice(0, 500) };
      }),
      contributeGoal: (idv, amount) => set((s) => {
        const g = s.goals.find((x) => x.id === idv);
        const txId = id();
        return {
          goals: s.goals.map((x) => x.id === idv ? { ...x, saved: Math.max(0, x.saved + amount) } : x),
          transactions: [{ id: txId, type: "saving" as const, category: "Meta", concept: g?.name ?? "Aporte", amount, date: new Date().toISOString() }, ...s.transactions],
          changeLog: [logEntry("goal", idv, "update", `${amount >= 0 ? "Aportó" : "Retiró"} ${Math.abs(amount)} a "${g?.name ?? ""}"`, [{ field: "saved", from: g?.saved, to: (g?.saved ?? 0) + amount }]), ...s.changeLog].slice(0, 500),
        };
      }),

      addDebt: (d) => set((s) => {
        const nv: Debt = { ...d, id: id(), payments: [] };
        return { debts: [nv, ...s.debts], changeLog: [logEntry("debt", nv.id, "create", `Registró deuda de ${nv.person} por ${nv.amount}`), ...s.changeLog].slice(0, 500) };
      }),
      updateDebt: (idv, p) => set((s) => {
        const prev = s.debts.find((x) => x.id === idv); if (!prev) return {} as any;
        const ch = diffFields(prev, p);
        return { debts: s.debts.map((x) => x.id === idv ? { ...x, ...p } : x), changeLog: [logEntry("debt", idv, "update", `Editó deuda de "${prev.person}"`, ch), ...s.changeLog].slice(0, 500) };
      }),
      removeDebt: (idv) => set((s) => {
        const prev = s.debts.find((x) => x.id === idv);
        return { debts: s.debts.filter((x) => x.id !== idv), changeLog: [logEntry("debt", idv, "delete", `Eliminó deuda de "${prev?.person ?? ""}"`), ...s.changeLog].slice(0, 500) };
      }),
      addDebtPayment: (debtId, p) => set((s) => {
        const debt = s.debts.find((x) => x.id === debtId); if (!debt) return {} as any;
        const payment: DebtPayment = { ...p, id: id() };
        return {
          debts: s.debts.map((x) => x.id === debtId ? { ...x, payments: [payment, ...x.payments] } : x),
          changeLog: [logEntry("debt", debtId, "update", `Abono de ${payment.amount} a deuda de "${debt.person}"`), ...s.changeLog].slice(0, 500),
        };
      }),
      removeDebtPayment: (debtId, paymentId) => set((s) => ({
        debts: s.debts.map((x) => x.id === debtId ? { ...x, payments: x.payments.filter((p) => p.id !== paymentId) } : x),
        changeLog: [logEntry("debt", debtId, "update", `Eliminó un abono`), ...s.changeLog].slice(0, 500),
      })),

      clearChangeLog: () => set({ changeLog: [] }),

      exportData: () => {
        const s = get();
        const payload = {
          app: "finance-pal",
          version: SCHEMA_VERSION,
          exportedAt: new Date().toISOString(),
          data: {
            fixedItems: s.fixedItems,
            transactions: s.transactions,
            goals: s.goals,
            debts: s.debts,
            changeLog: s.changeLog,
            theme: s.theme,
            profile: s.profile,
          },
        };
        return JSON.stringify(payload, null, 2);
      },

      importData: (json) => {
        try {
          const parsed = JSON.parse(json);
          if (!isObj(parsed) && !isObj(parsed?.data)) {
            return { ok: false, error: "Formato inválido: se esperaba un objeto JSON" };
          }
          if (parsed?.app && parsed.app !== "finance-pal" && parsed.app !== "migol-finanzas") {
            return { ok: false, error: `Este archivo no pertenece a Finance Pal (app="${parsed.app}")` };
          }
          const { data, warnings } = migrateImported(parsed);

          const fixedItems = (Array.isArray(data.fixedItems) ? data.fixedItems : [])
            .map(sanitizeFixed).filter((x: FixedItem | null): x is FixedItem => !!x);
          const transactions = (Array.isArray(data.transactions) ? data.transactions : [])
            .map(sanitizeTx).filter((x: Transaction | null): x is Transaction => !!x);
          const goals = (Array.isArray(data.goals) ? data.goals : [])
            .map(sanitizeGoal).filter((x: Goal | null): x is Goal => !!x);
          const debts = (Array.isArray(data.debts) ? data.debts : [])
            .map(sanitizeDebt).filter((x: Debt | null): x is Debt => !!x);
          const changeLog: ChangeLogEntry[] = Array.isArray(data.changeLog)
            ? (data.changeLog as any[]).filter((e) => isObj(e) && isStr(e.id) && isStr(e.label)).slice(0, 500) as ChangeLogEntry[]
            : [];
          const theme: ThemeMode = data.theme === "dark" ? "dark" : "light";
          const profile = sanitizeProfile(data.profile);

          set({ fixedItems, transactions, goals, debts, changeLog, theme, profile });
          return { ok: true, warnings };
        } catch (e: any) {
          return { ok: false, error: e?.message ?? "JSON inválido" };
        }
      },

      resetAll: () => {
        const d = new Date();
        set({ fixedItems: [], transactions: [], goals: [], debts: [], changeLog: [], activeYear: d.getFullYear(), activeMonth: d.getMonth() });
      },
    }),
    {
      name: "migol-finanzas-v2",
      version: SCHEMA_VERSION,
      migrate: (state: any, fromVersion: number) => {
        if (!state) return state;
        // Add new fields with defaults — never lose existing user data.
        const next = {
          debts: [],
          changeLog: [],
          theme: "light" as ThemeMode,
          profile: { name: "", currency: "MXN" } as UserProfile,
          ...state,
        };
        // Re-sanitize collections from older versions to drop malformed entries.
        if (fromVersion < SCHEMA_VERSION) {
          next.fixedItems = (Array.isArray(next.fixedItems) ? next.fixedItems : [])
            .map(sanitizeFixed).filter(Boolean);
          next.transactions = (Array.isArray(next.transactions) ? next.transactions : [])
            .map(sanitizeTx).filter(Boolean);
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
