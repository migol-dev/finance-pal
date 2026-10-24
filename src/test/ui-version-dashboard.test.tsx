import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import Dashboard from "@/pages/Dashboard";
import { DashboardV2 } from "@/components/dashboard/DashboardV2";
import { useQuickTxModal } from "@/store/ui-quick-tx-store";
import type { Account, Transaction, Goal, FixedItem, Debt } from "@/lib/finance";

// Mock de ResizeObserver
class MockResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}
global.ResizeObserver = MockResizeObserver as unknown as typeof ResizeObserver;

const mockEnsureScheduledTransactions = vi.fn();

let mockState = {
  accounts: [] as Account[],
  transactions: [] as Transaction[],
  fixedItems: [] as FixedItem[],
  goals: [] as Goal[],
  debts: [] as Debt[],
  activeYear: 2026,
  activeMonth: 9, // Octubre
  profile: { name: "Valeria Gómez" },
  appSettings: { uiVersion: "v2", accentColor: "emerald" },
};

vi.mock("@/hooks/useFinanceData", () => ({
  useFinanceData: () => ({
    accounts: mockState.accounts,
    transactions: mockState.transactions,
    fixedItems: mockState.fixedItems,
    goals: mockState.goals,
    debts: mockState.debts,
    activeYear: mockState.activeYear,
    activeMonth: mockState.activeMonth,
    profile: mockState.profile,
    appSettings: mockState.appSettings,
    uiVersion: mockState.appSettings?.uiVersion ?? "v2",
    ensureScheduledTransactions: mockEnsureScheduledTransactions,
    setActive: vi.fn(),
  }),
}));

describe("Sprint 3 DashboardV2 & Dual Dispatcher Suite", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useQuickTxModal.getState().closeQuickTx();

    mockState = {
      accounts: [
        {
          id: "acc-1",
          name: "BBVA Nómina",
          type: "bank",
          initialBalance: 20000,
          color: "blue",
        },
        {
          id: "acc-2",
          name: "Cartera Efectivo",
          type: "cash",
          initialBalance: 2500,
          color: "emerald",
        },
        {
          id: "acc-3",
          name: "Tarjeta de Crédito",
          type: "bank",
          initialBalance: -4000, // Pasivo
          color: "red",
        },
      ],
      transactions: [
        {
          id: "tx-1",
          concept: "Nómina Quincenal",
          amount: 15000,
          type: "income",
          date: "2026-10-15",
          category: "Sueldo",
          accountId: "acc-1",
        },
        {
          id: "tx-2",
          concept: "Supermercado Semanal",
          amount: 3200,
          type: "expense",
          date: "2026-10-16",
          category: "Despensa",
          accountId: "acc-1",
        },
        {
          id: "tx-3",
          concept: "Café de Especialidad",
          amount: 120,
          type: "expense",
          date: "2026-10-18",
          category: "Restaurantes",
          accountId: "acc-2",
        },
      ],
      fixedItems: [
        {
          id: "fix-1",
          concept: "Internet Fibra Óptica",
          amount: 650,
          type: "expense_fixed",
          category: "Servicios",
          startDate: "2026-01-01",
          frequency: "monthly",
          payDay: 28,
        },
      ],
      goals: [
        {
          id: "goal-1",
          name: "Fondo de Emergencia",
          target: 50000,
          saved: 25000,
          pinned: true,
          color: "gradient-primary",
        },
      ],
      debts: [
        {
          id: "debt-1",
          person: "Carlos Méndez",
          concept: "Préstamo personal",
          amount: 5000,
          date: "2026-10-02",
          payments: [{ id: "pay-1", amount: 2000, date: "2026-10-10" }],
        },
      ],
      activeYear: 2026,
      activeMonth: 9, // Octubre
      profile: { name: "Valeria Gómez" },
      appSettings: { uiVersion: "v2", accentColor: "emerald" },
    };
  });

  describe("Despachador Dual en Dashboard.tsx", () => {
    it("renderiza DashboardV2 cuando uiVersion es 'v2'", () => {
      mockState.appSettings.uiVersion = "v2";

      render(
        <MemoryRouter>
          <Dashboard />
        </MemoryRouter>
      );

      // Debe contener elementos característicos de DashboardV2
      expect(screen.getByText("Patrimonio Neto Total")).toBeInTheDocument();
      expect(screen.getByText("Flujo del Mes")).toBeInTheDocument();
      expect(screen.getByText("Movimientos Recientes")).toBeInTheDocument();
      expect(screen.getByText("v2")).toBeInTheDocument();
      expect(screen.getByText("Hola, Valeria")).toBeInTheDocument();
    });

    it("renderiza DashboardClassic cuando uiVersion es 'classic'", () => {
      mockState.appSettings.uiVersion = "classic";

      render(
        <MemoryRouter>
          <Dashboard />
        </MemoryRouter>
      );

      // Debe contener elementos del Dashboard clásico
      expect(screen.getByText("Neto acumulado")).toBeInTheDocument();
      expect(screen.getByText("Tasa de ahorro")).toBeInTheDocument();
      expect(screen.queryByText("Patrimonio Neto Total")).not.toBeInTheDocument();
    });

    it("preserva DashboardClassic si appSettings es undefined (compatibilidad de snapshots)", () => {
      // @ts-expect-error simulación de mock sin appSettings
      mockState.appSettings = undefined;

      render(
        <MemoryRouter>
          <Dashboard />
        </MemoryRouter>
      );

      expect(screen.getByText("Neto acumulado")).toBeInTheDocument();
      expect(screen.queryByText("Patrimonio Neto Total")).not.toBeInTheDocument();
    });
  });

  describe("Cálculos Financieros y Escenario Editorial (DashboardV2)", () => {
    it("muestra saludo editorial con nombre de usuario y badge v2", () => {
      render(
        <MemoryRouter>
          <DashboardV2 />
        </MemoryRouter>
      );

      expect(screen.getByText("Hola, Valeria")).toBeInTheDocument();
      expect(screen.getByText("v2")).toBeInTheDocument();
      expect(mockEnsureScheduledTransactions).toHaveBeenCalled();
    });

    it("calcula y formatea el patrimonio neto, ingresos, gastos y ahorro", () => {
      render(
        <MemoryRouter>
          <DashboardV2 />
        </MemoryRouter>
      );

      expect(screen.getByText("Patrimonio Neto Total")).toBeInTheDocument();
      expect(screen.getByText("Ingresos")).toBeInTheDocument();
      expect(screen.getByText("Gastos")).toBeInTheDocument();
      expect(screen.getByText("Ahorro")).toBeInTheDocument();

      // Debe listar las transacciones recientes
      expect(screen.getByText("Nómina Quincenal")).toBeInTheDocument();
      expect(screen.getByText("Supermercado Semanal")).toBeInTheDocument();
      expect(screen.getByText("Café de Especialidad")).toBeInTheDocument();
    });

    it("muestra el desglose de activos totales y pasivos", () => {
      render(
        <MemoryRouter>
          <DashboardV2 />
        </MemoryRouter>
      );

      expect(screen.getByText("Activos Totales:")).toBeInTheDocument();
      expect(screen.getByText("Pasivos / Obligaciones:")).toBeInTheDocument();
      expect(screen.getByText(/Disponibles en cuentas y efectivo:/)).toBeInTheDocument();
      expect(screen.getByText(/Por cobrar:/)).toBeInTheDocument();
    });

    it("muestra la meta prioritaria y su porcentaje de avance", () => {
      render(
        <MemoryRouter>
          <DashboardV2 />
        </MemoryRouter>
      );

      expect(screen.getByText("Meta Prioritaria")).toBeInTheDocument();
      expect(screen.getByText("Fondo de Emergencia")).toBeInTheDocument();
      expect(screen.getByText("50% completado")).toBeInTheDocument();
      expect(screen.getByText("Metas →")).toBeInTheDocument();
    });

    it("muestra la sección de distribución de liquidez (efectivo vs bancos)", () => {
      render(
        <MemoryRouter>
          <DashboardV2 />
        </MemoryRouter>
      );

      expect(screen.getByText("Distribución de Liquidez")).toBeInTheDocument();
      expect(screen.getByText("Efectivo")).toBeInTheDocument();
      expect(screen.getByText("Cuentas Bancarias")).toBeInTheDocument();
    });
  });

  describe("Modo de Privacidad (Ocultar Saldos)", () => {
    it("enmascara los montos con viñetas al hacer click en el botón de privacidad", () => {
      render(
        <MemoryRouter>
          <DashboardV2 />
        </MemoryRouter>
      );

      const hideBtn = screen.getByLabelText("Ocultar saldos");
      expect(hideBtn).toBeInTheDocument();

      // Antes de ocultar, no debe haber viñetas enmascaradas
      expect(screen.queryAllByText("••••••").length).toBe(0);

      // Clic para ocultar
      fireEvent.click(hideBtn);

      // Ahora deben existir múltiples elementos enmascarados
      const masked = screen.getAllByText("••••••");
      expect(masked.length).toBeGreaterThan(0);
      expect(screen.getByLabelText("Mostrar saldos")).toBeInTheDocument();

      // Clic para volver a mostrar
      fireEvent.click(screen.getByLabelText("Mostrar saldos"));
      expect(screen.queryAllByText("••••••").length).toBe(0);
    });
  });

  describe("Acciones Rápidas (useQuickTxModal)", () => {
    it("dispara openQuickTx('expense') al pulsar el botón rápido de Gasto", () => {
      render(
        <MemoryRouter>
          <DashboardV2 />
        </MemoryRouter>
      );

      expect(useQuickTxModal.getState().isOpen).toBe(false);

      const expenseBtn = screen.getByLabelText("Registrar gasto rápido");
      fireEvent.click(expenseBtn);

      expect(useQuickTxModal.getState().isOpen).toBe(true);
      expect(useQuickTxModal.getState().defaultType).toBe("expense");
    });

    it("dispara openQuickTx('income') al pulsar el botón rápido de Ingreso", () => {
      render(
        <MemoryRouter>
          <DashboardV2 />
        </MemoryRouter>
      );

      expect(useQuickTxModal.getState().isOpen).toBe(false);

      const incomeBtn = screen.getByLabelText("Registrar ingreso rápido");
      fireEvent.click(incomeBtn);

      expect(useQuickTxModal.getState().isOpen).toBe(true);
      expect(useQuickTxModal.getState().defaultType).toBe("income");
    });
  });

  describe("Estados Vacíos", () => {
    it("muestra estado elegante cuando no hay transacciones en el mes", () => {
      mockState.transactions = [];

      render(
        <MemoryRouter>
          <DashboardV2 />
        </MemoryRouter>
      );

      expect(screen.getByText("Sin transacciones en este mes")).toBeInTheDocument();
      expect(screen.getByText("Nuevo Movimiento")).toBeInTheDocument();
    });

    it("muestra estado 'Al día en este mes' cuando no hay pagos fijos pendientes", () => {
      mockState.fixedItems = [];

      render(
        <MemoryRouter>
          <DashboardV2 />
        </MemoryRouter>
      );

      expect(screen.getByText("Al día en este mes")).toBeInTheDocument();
    });
  });
});
