import { create } from "zustand";
import { persist } from "zustand/middleware";
import { FixedItem, Transaction, Goal } from "@/lib/finance";

interface State {
  fixedItems: FixedItem[];
  transactions: Transaction[];
  goals: Goal[];
  initialized: boolean;
  addFixed: (i: Omit<FixedItem, "id">) => void;
  updateFixed: (id: string, p: Partial<FixedItem>) => void;
  removeFixed: (id: string) => void;
  toggleFixed: (id: string) => void;
  addTx: (t: Omit<Transaction, "id">) => void;
  removeTx: (id: string) => void;
  addGoal: (g: Omit<Goal, "id">) => void;
  updateGoal: (id: string, p: Partial<Goal>) => void;
  removeGoal: (id: string) => void;
  contributeGoal: (id: string, amount: number) => void;
  seed: () => void;
  resetAll: () => void;
}

const id = () => Math.random().toString(36).slice(2, 10);

const SEED_FIXED: Omit<FixedItem, "id">[] = [
  { type: "income_fixed", category: "Trabajo", concept: "Trabajo", amount: 10000, frequency: "monthly", active: true, note: "Ingreso base", startDate: "2026-01-01", endDate: "2026-12-31", priority: "medium", payDay: 1 },
  { type: "income_fixed", category: "Servicios", concept: "Tareas / Asesorías", amount: 400, frequency: "monthly", active: true, note: "Apoyo extra", startDate: "2026-01-01", endDate: "2026-12-31", priority: "low", payDay: 15 },
  { type: "expense_fixed", category: "Transporte", concept: "Gasolina", amount: 183, frequency: "monthly", active: true, note: "Uso diario", startDate: "2026-01-01", endDate: "2026-12-31", priority: "medium", payDay: 5 },
  { type: "expense_fixed", category: "Salud", concept: "Gimnasio", amount: 450, frequency: "monthly", active: true, note: "Membresía", startDate: "2026-01-01", endDate: "2026-12-31", priority: "medium", payDay: 3 },
  { type: "expense_fixed", category: "Conectividad", concept: "Datos móviles", amount: 230, frequency: "monthly", active: true, note: "Plan celular", startDate: "2026-01-01", endDate: "2026-12-31", priority: "high", payDay: 10 },
  { type: "expense_fixed", category: "Apoyo familiar", concept: "Carmen", amount: 400, frequency: "monthly", active: true, note: "Ayuda mensual", startDate: "2026-01-01", endDate: "2026-12-31", priority: "high", payDay: 1 },
  { type: "expense_variable", category: "Ocio", concept: "Salidas", amount: 500, frequency: "monthly", active: true, note: "Recreación", startDate: "2026-01-01", endDate: "2026-12-31", priority: "low" },
  { type: "expense_fixed", category: "Alimentación", concept: "Alimentación", amount: 1600, frequency: "monthly", active: true, note: "Supermercado", startDate: "2026-01-01", endDate: "2026-12-31", priority: "high", payDay: 7 },
  { type: "expense_fixed", category: "Cuidado personal", concept: "Cuidado personal", amount: 200, frequency: "monthly", active: true, note: "Higiene / imagen", startDate: "2026-01-01", endDate: "2026-12-31", priority: "low", payDay: 12 },
  { type: "expense_fixed", category: "Entretenimiento", concept: "Tidal", amount: 50, frequency: "monthly", active: true, note: "Suscripción", startDate: "2026-01-01", endDate: "2026-12-31", priority: "low", payDay: 20 },
  { type: "saving_fixed", category: "Moto", concept: "Moto", amount: 3500, frequency: "monthly", active: true, note: "Meta principal", startDate: "2026-01-01", endDate: "2026-12-31", priority: "high", payDay: 2 },
  { type: "saving_fixed", category: "Fondo", concept: "Fondo emergencia", amount: 1000, frequency: "monthly", active: true, note: "Emergencia", startDate: "2026-01-01", endDate: "2026-12-31", priority: "high", payDay: 2 },
  { type: "saving_fixed", category: "Moto", concept: "Refacciones moto", amount: 200, frequency: "monthly", active: true, note: "Mantenimiento", startDate: "2026-01-01", endDate: "2026-12-31", priority: "medium", payDay: 2 },
];

const SEED_GOALS: Omit<Goal, "id">[] = [
  { name: "Moto nueva", target: 60000, saved: 12000, emoji: "🏍️", color: "gradient-sunset", deadline: "2026-12-31" },
  { name: "Fondo de emergencia", target: 30000, saved: 8000, emoji: "🛟", color: "gradient-ocean" },
  { name: "Refacciones moto", target: 5000, saved: 1200, emoji: "🔧", color: "gradient-secondary" },
];

export const useFinance = create<State>()(
  persist(
    (set, get) => ({
      fixedItems: [],
      transactions: [],
      goals: [],
      initialized: false,
      addFixed: (i) => set((s) => ({ fixedItems: [{ ...i, id: id() }, ...s.fixedItems] })),
      updateFixed: (idv, p) => set((s) => ({ fixedItems: s.fixedItems.map((x) => x.id === idv ? { ...x, ...p } : x) })),
      removeFixed: (idv) => set((s) => ({ fixedItems: s.fixedItems.filter((x) => x.id !== idv) })),
      toggleFixed: (idv) => set((s) => ({ fixedItems: s.fixedItems.map((x) => x.id === idv ? { ...x, active: !x.active } : x) })),
      addTx: (t) => set((s) => ({ transactions: [{ ...t, id: id() }, ...s.transactions] })),
      removeTx: (idv) => set((s) => ({ transactions: s.transactions.filter((x) => x.id !== idv) })),
      addGoal: (g) => set((s) => ({ goals: [{ ...g, id: id() }, ...s.goals] })),
      updateGoal: (idv, p) => set((s) => ({ goals: s.goals.map((x) => x.id === idv ? { ...x, ...p } : x) })),
      removeGoal: (idv) => set((s) => ({ goals: s.goals.filter((x) => x.id !== idv) })),
      contributeGoal: (idv, amount) => set((s) => ({
        goals: s.goals.map((x) => x.id === idv ? { ...x, saved: Math.max(0, x.saved + amount) } : x),
        transactions: [{ id: id(), type: "saving", category: "Meta", concept: s.goals.find(g=>g.id===idv)?.name ?? "Aporte", amount, date: new Date().toISOString() }, ...s.transactions],
      })),
      seed: () => {
        if (get().initialized) return;
        set({
          fixedItems: SEED_FIXED.map((x) => ({ ...x, id: id() })),
          goals: SEED_GOALS.map((x) => ({ ...x, id: id() })),
          initialized: true,
        });
      },
      resetAll: () => set({ fixedItems: [], transactions: [], goals: [], initialized: false }),
    }),
    { name: "migol-finanzas-v1" }
  )
);
