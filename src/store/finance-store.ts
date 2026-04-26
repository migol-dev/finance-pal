import { create } from "zustand";
import { persist } from "zustand/middleware";
import { FixedItem, Transaction, Goal } from "@/lib/finance";

interface State {
  fixedItems: FixedItem[];
  transactions: Transaction[];
  goals: Goal[];
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

  resetAll: () => void;
}

const id = () => Math.random().toString(36).slice(2, 10);
const now = new Date();

export const useFinance = create<State>()(
  persist(
    (set) => ({
      fixedItems: [],
      transactions: [],
      goals: [],
      activeYear: now.getFullYear(),
      activeMonth: now.getMonth(),

      setActive: (y, m) => set({ activeYear: y, activeMonth: m }),
      resetToToday: () => { const d = new Date(); set({ activeYear: d.getFullYear(), activeMonth: d.getMonth() }); },

      addFixed: (i) => set((s) => ({ fixedItems: [{ ...i, id: id() }, ...s.fixedItems] })),
      updateFixed: (idv, p) => set((s) => ({ fixedItems: s.fixedItems.map((x) => x.id === idv ? { ...x, ...p } : x) })),
      removeFixed: (idv) => set((s) => ({ fixedItems: s.fixedItems.filter((x) => x.id !== idv) })),
      toggleFixed: (idv) => set((s) => ({ fixedItems: s.fixedItems.map((x) => x.id === idv ? { ...x, active: !x.active } : x) })),

      addTx: (t) => set((s) => ({ transactions: [{ ...t, id: id() }, ...s.transactions] })),
      updateTx: (idv, p) => set((s) => ({ transactions: s.transactions.map((x) => x.id === idv ? { ...x, ...p } : x) })),
      removeTx: (idv) => set((s) => ({ transactions: s.transactions.filter((x) => x.id !== idv) })),

      addGoal: (g) => set((s) => ({ goals: [{ ...g, id: id() }, ...s.goals] })),
      updateGoal: (idv, p) => set((s) => ({ goals: s.goals.map((x) => x.id === idv ? { ...x, ...p } : x) })),
      removeGoal: (idv) => set((s) => ({ goals: s.goals.filter((x) => x.id !== idv) })),
      contributeGoal: (idv, amount) => set((s) => {
        const g = s.goals.find((x) => x.id === idv);
        return {
          goals: s.goals.map((x) => x.id === idv ? { ...x, saved: Math.max(0, x.saved + amount) } : x),
          transactions: [{ id: id(), type: "saving" as const, category: "Meta", concept: g?.name ?? "Aporte", amount, date: new Date().toISOString() }, ...s.transactions],
        };
      }),

      resetAll: () => { const d = new Date(); set({ fixedItems: [], transactions: [], goals: [], activeYear: d.getFullYear(), activeMonth: d.getMonth() }); },
    }),
    {
      name: "migol-finanzas-v2",
      version: 2,
    }
  )
);
