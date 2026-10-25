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

    it("muestra el desglose de activos totales y pasivos con balance contable exacto", () => {
      render(
        <MemoryRouter>
          <DashboardV2 />
        </MemoryRouter>
      );

      // Activos totales ($36,180 liquid + $3,000 receivables = $39,180)
      expect(screen.getByText("Activos Totales:")).toBeInTheDocument();
      expect(screen.getByText("$39,180")).toBeInTheDocument();

      // Pasivos / Obligaciones (-$4,000 en tarjeta de crédito = $4,000)
      expect(screen.getByText("Pasivos / Obligaciones:")).toBeInTheDocument();
      expect(screen.getByText("$4,000")).toBeInTheDocument();

      // Patrimonio Neto Total = Activos - Pasivos ($39,180 - $4,000 = $35,180)
      expect(screen.getByText("$35,180")).toBeInTheDocument();

      // Subdesglose de activos
      expect(screen.getByText(/Disponibles en cuentas y efectivo:/)).toBeInTheDocument();
      expect(screen.getByText("$36,180")).toBeInTheDocument();
      expect(screen.getByText(/Por cobrar:/)).toBeInTheDocument();
      expect(screen.getByText("$3,000")).toBeInTheDocument();
      expect(screen.getByText(/En metas de ahorro:/)).toBeInTheDocument();
      expect(screen.getAllByText("$25,000").length).toBeGreaterThan(0);
    });

    it("muestra indicador de tendencia neutral cuando el flujo neto del mes es exactamente cero", () => {
      // Mock estado donde ingresos y gastos son exactamente iguales y sin deudas del mes
      mockState.debts = [];
      mockState.fixedItems = [];
      mockState.transactions = [
        {
          id: "tx-eq-1",
          concept: "Ingreso igual",
          amount: 5000,
          type: "income",
          date: "2026-10-10",
        },
        {
          id: "tx-eq-2",
          concept: "Gasto igual",
          amount: 5000,
          type: "expense",
          date: "2026-10-12",
        },
      ];

      render(
        <MemoryRouter>
          <DashboardV2 />
        </MemoryRouter>
      );

      // Flujo neto mensual es 0, no debe llevar prefijo '+' ni '-'
      expect(screen.getAllByText("$0").length).toBeGreaterThan(0);
      expect(screen.getByText("(0.0%)")).toBeInTheDocument();
      expect(screen.queryByText("+$0")).not.toBeInTheDocument();
      expect(screen.queryByText("(+0.0%)")).not.toBeInTheDocument();
    });

    it("filtra deudas y abonos futuros para no contaminar balances de periodos pasados", () => {
      mockState.activeYear = 2026;
      mockState.activeMonth = 8; // Septiembre 2026

      mockState.debts = [
        {
          id: "debt-future",
          person: "Pedro Futuro",
          concept: "Préstamo futuro",
          amount: 10000,
          date: "2026-11-01",
          payments: [],
        },
        {
          id: "debt-past",
          person: "Laura Pasado",
          concept: "Préstamo en septiembre",
          amount: 6000,
          date: "2026-09-05",
          payments: [
            { id: "pay-oct", amount: 2000, date: "2026-10-01" }, // Pago en octubre
            { id: "pay-sep", amount: 1000, date: "2026-09-20" }, // Pago en septiembre
          ],
        },
      ];

      render(
        <MemoryRouter>
          <DashboardV2 />
        </MemoryRouter>
      );

      // En Septiembre:
      // - debt-future (noviembre) no se cuenta ($0)
      // - debt-past: $6,000 inicial - $1,000 pagado en septiembre = $5,000 por cobrar
      expect(screen.getByText("$5,000")).toBeInTheDocument();
    });

    it("muestra 'Hoy' cuando el pago fijo programado vence el día actual", () => {
      const today = new Date();
      mockState.activeYear = today.getFullYear();
      mockState.activeMonth = today.getMonth();
      mockState.fixedItems = [
        {
          id: "fix-today",
          concept: "Suscripción Nube",
          amount: 299,
          type: "expense_fixed",
          active: true,
          startDate: `${today.getFullYear()}-01-01`,
          frequency: "monthly",
          payDay: today.getDate(), // hoy
        },
      ];

      render(
        <MemoryRouter>
          <DashboardV2 />
        </MemoryRouter>
      );

      expect(screen.getByText("Suscripción Nube")).toBeInTheDocument();
      expect(screen.getByText("Hoy")).toBeInTheDocument();
      expect(screen.queryByText("en 0d")).not.toBeInTheDocument();
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
    it("enmascara los montos con viñetas al hacer click en el botón de privacidad y persiste en sessionStorage", () => {
      sessionStorage.clear();
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

      // Ahora deben existir múltiples elementos enmascarados y haberse guardado en sessionStorage
      const masked = screen.getAllByText("••••••");
      expect(masked.length).toBeGreaterThan(0);
      expect(sessionStorage.getItem("fp_hide_balances")).toBe("true");
      expect(screen.getByLabelText("Mostrar saldos")).toBeInTheDocument();

      // Clic para volver a mostrar
      fireEvent.click(screen.getByLabelText("Mostrar saldos"));
      expect(screen.queryAllByText("••••••").length).toBe(0);
      expect(sessionStorage.getItem("fp_hide_balances")).toBe("false");
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

    it("clasifica deudas 'yo_debo' en pasivos (Lo que debes) y 'me_deben' en activos (Por cobrar)", () => {
      mockState.accounts = [
        { id: "acc-1", name: "BBVA", type: "bank", initialBalance: 10000 },
      ];
      mockState.transactions = [];
      mockState.fixedItems = [];
      mockState.debts = [
        // me_deben: Alguien me debe 3,000 con 1,000 abonados -> 2,000 por cobrar (Activo)
        {
          id: "debt-receivable",
          person: "Pedro",
          concept: "Préstamo personal",
          amount: 3000,
          date: "2026-10-01T12:00:00.000Z",
          type: "me_deben",
          payments: [
            { id: "p-rec-1", amount: 1000, date: "2026-10-05T12:00:00.000Z" },
          ],
        },
        // yo_debo: Yo debo 5,000 con 1,500 abonados -> 3,500 pendiente por pagar (Pasivo)
        {
          id: "debt-payable",
          person: "Banco Santander",
          concept: "Crédito automotriz",
          amount: 5000,
          date: "2026-10-01T12:00:00.000Z",
          type: "yo_debo",
          payments: [
            { id: "p-pay-1", amount: 1500, date: "2026-10-10T12:00:00.000Z" },
          ],
        },
      ];

      render(
        <MemoryRouter>
          <DashboardV2 />
        </MemoryRouter>
      );

      // Saldo líquido en banco: 10,000 + 1,000 (abono recibido) - 1,500 (abono pagado) = 9,500
      // Activos totales: saldo líquido 9,500 + 2,000 (me_deben pendiente) = 11,500
      // Pasivos totales: 3,500 (yo_debo pendiente)
      // Patrimonio neto: 11,500 - 3,500 = 8,000
      expect(screen.getAllByText(/3,500/).length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText(/11,500/).length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText(/8,000/).length).toBeGreaterThanOrEqual(1);
    });
  });
});
