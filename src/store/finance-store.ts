import { create } from "zustand";
import { persist } from "zustand/middleware";
import { FixedItem, Transaction, Goal, Debt, DebtPayment, ChangeLogEntry, ChangeAction, ChangeEntity } from "@/lib/finance";

export type ThemeMode = "light" | "dark";

interface State {
  fixedItems: FixedItem[];
  transactions: Transaction[];
  goals: Goal[];
  debts: Debt[];
  changeLog: ChangeLogEntry[];
  theme: ThemeMode;
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
  importData: (json: string) => { ok: boolean; error?: string };

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

export const useFinance = create<State>()(
  persist(
    (set, get) => ({
      fixedItems: [],
      transactions: [],
      goals: [],
      debts: [],
      changeLog: [],
      theme: "light",
      activeYear: now.getFullYear(),
      activeMonth: now.getMonth(),

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
          app: "migol-finanzas",
          version: 3,
          exportedAt: new Date().toISOString(),
          data: {
            fixedItems: s.fixedItems,
            transactions: s.transactions,
            goals: s.goals,
            debts: s.debts,
            changeLog: s.changeLog,
            theme: s.theme,
          },
        };
        return JSON.stringify(payload, null, 2);
      },

      importData: (json) => {
        try {
          const parsed = JSON.parse(json);
          const d = parsed?.data ?? parsed;
          if (!d || typeof d !== "object") return { ok: false, error: "Formato inválido" };
          set({
            fixedItems: Array.isArray(d.fixedItems) ? d.fixedItems : [],
            transactions: Array.isArray(d.transactions) ? d.transactions : [],
            goals: Array.isArray(d.goals) ? d.goals : [],
            debts: Array.isArray(d.debts) ? d.debts.map((x: any) => ({ ...x, payments: x.payments ?? [] })) : [],
            changeLog: Array.isArray(d.changeLog) ? d.changeLog : [],
            theme: d.theme === "dark" ? "dark" : "light",
          });
          return { ok: true };
        } catch (e: any) {
          return { ok: false, error: e?.message ?? "JSON inválido" };
        }
      },

      resetAll: () => { const d = new Date(); set({ fixedItems: [], transactions: [], goals: [], debts: [], changeLog: [], activeYear: d.getFullYear(), activeMonth: d.getMonth() }); },
    }),
    {
      name: "migol-finanzas-v2",
      version: 3,
      migrate: (state: any) => {
        if (!state) return state;
        return { debts: [], changeLog: [], theme: "light", ...state };
      },
    }
  )
);
