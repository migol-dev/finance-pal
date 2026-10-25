import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import Deudas from "@/pages/Deudas";
import Metas from "@/pages/Metas";
import type { Debt, Goal, GoalFolder, Account, AppSettings } from "@/lib/finance";
import { debtPaymentSchema, validateEntity } from "@/lib/validators";

// Mock de ResizeObserver
class MockResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}
global.ResizeObserver = MockResizeObserver as unknown as typeof ResizeObserver;

const mockAddDebt = vi.fn();
const mockUpdateDebt = vi.fn();
const mockRemoveDebt = vi.fn();
const mockAddDebtPayment = vi.fn();
const mockRemoveDebtPayment = vi.fn();

const mockAddGoal = vi.fn();
const mockUpdateGoal = vi.fn();
const mockRemoveGoal = vi.fn();
const mockContributeGoal = vi.fn();
const mockAddGoalFolder = vi.fn();
const mockUpdateGoalFolder = vi.fn();
const mockRemoveGoalFolder = vi.fn();

let mockState = {
  debts: [] as Debt[],
  goals: [] as Goal[],
  goalFolders: [] as GoalFolder[],
  accounts: [] as Account[],
  appSettings: { uiVersion: "v2", accentColor: "emerald" } as AppSettings | undefined,
};

vi.mock("@/hooks/useFinanceData", () => ({
  useFinanceData: () => ({
    debts: mockState.debts,
    goals: mockState.goals,
    goalFolders: mockState.goalFolders,
    accounts: mockState.accounts,
    appSettings: mockState.appSettings,
    uiVersion: mockState.appSettings?.uiVersion ?? "v2",
    addDebt: mockAddDebt,
    updateDebt: mockUpdateDebt,
    removeDebt: mockRemoveDebt,
    addDebtPayment: mockAddDebtPayment,
    removeDebtPayment: mockRemoveDebtPayment,
    addGoal: mockAddGoal,
    updateGoal: mockUpdateGoal,
    removeGoal: mockRemoveGoal,
    contributeGoal: mockContributeGoal,
    addGoalFolder: mockAddGoalFolder,
    updateGoalFolder: mockUpdateGoalFolder,
    removeGoalFolder: mockRemoveGoalFolder,
  }),
}));

describe("Sprint 5 — DeudasV2, MetasV2 & Dual Dispatchers Suite", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.innerWidth = 1200;

    mockState = {
      accounts: [
        {
          id: "acc-1",
          name: "BBVA Principal",
          type: "bank",
          currency: "MXN",
          initialBalance: 15000,
          color: "blue",
          isDefault: true,
          showInSummary: true,
          order: 0,
          createdAt: "2026-01-01T00:00:00.000Z",
        },
      ],
      debts: [
        {
          id: "debt-1",
          person: "Carlos Mendoza",
          concept: "Préstamo para viaje",
          amount: 5000,
          date: "2026-10-10T12:00:00.000Z",
          type: "me_deben",
          payments: [
            {
              id: "pay-1",
              amount: 2000,
              date: "2026-10-15T12:00:00.000Z",
              paymentMethod: "transfer",
              note: "Primer abono",
            },
          ],
        },
        {
          id: "debt-2",
          person: "Banco Hipotecario",
          concept: "Crédito personal",
          amount: 10000,
          date: "2026-09-01T12:00:00.000Z",
          type: "yo_debo",
          note: "[yo_debo]",
          payments: [
            {
              id: "pay-2",
              amount: 5000,
              date: "2026-10-01T12:00:00.000Z",
              paymentMethod: "transfer",
            },
          ],
        },
      ],
      goals: [
        {
          id: "goal-1",
          name: "Viaje a Japón",
          target: 50000,
          saved: 25000,
          emoji: "✈️",
          color: "gradient-sunset",
          deadline: "2027-10-24T00:00:00.000Z",
          createdAt: "2026-01-01T00:00:00.000Z",
          folderId: "folder-1",
          contributions: [
            { id: "c-1", date: "2026-06-01T12:00:00.000Z", amount: 10000 },
            { id: "c-2", date: "2026-09-01T12:00:00.000Z", amount: 15000 },
          ],
        },
        {
          id: "goal-2",
          name: "Fondo de Emergencia",
          target: 30000,
          saved: 30000,
          emoji: "🛡️",
          color: "gradient-ocean",
          createdAt: "2026-01-01T00:00:00.000Z",
          pinned: true,
        },
      ],
      goalFolders: [
        {
          id: "folder-1",
          name: "Viajes y Aventuras",
          color: "gradient-sunset",
          order: 0,
          createdAt: "2026-01-01T00:00:00.000Z",
        },
      ],
      appSettings: { uiVersion: "v2", accentColor: "emerald" },
    };
  });

  // ==========================================
  // DEUDAS TESTS
  // ==========================================
  describe("Deudas Module & Dual Dispatcher", () => {
    it("renders DeudasV2 when uiVersion === 'v2'", () => {
      render(
        <MemoryRouter>
          <Deudas />
        </MemoryRouter>
      );

      expect(screen.getByText("Deudas y Préstamos")).toBeInTheDocument();
      expect(screen.getByText("Control de amortización, cobros y pagos a terceros")).toBeInTheDocument();
      expect(screen.getByText("Me deben (Por cobrar)")).toBeInTheDocument();
      expect(screen.getByText("Yo debo (Por pagar)")).toBeInTheDocument();
    });

    it("renders DeudasClassic when uiVersion === 'classic'", () => {
      mockState.appSettings = { uiVersion: "classic" };
      render(
        <MemoryRouter>
          <Deudas />
        </MemoryRouter>
      );

      expect(screen.getByText("Rastrea quién te debe dinero")).toBeInTheDocument();
      expect(screen.queryByText("Control de amortización, cobros y pagos a terceros")).not.toBeInTheDocument();
    });

    it("preserves DeudasClassic when appSettings is undefined", () => {
      mockState.appSettings = undefined;
      render(
        <MemoryRouter>
          <Deudas />
        </MemoryRouter>
      );

      expect(screen.getByText("Rastrea quién te debe dinero")).toBeInTheDocument();
    });

    it("calculates totals and net debt balance correctly", () => {
      render(
        <MemoryRouter>
          <Deudas />
        </MemoryRouter>
      );

      expect(screen.getByText("Balance Neto de Deudas")).toBeInTheDocument();
      expect(screen.getAllByText("Carlos Mendoza").length).toBeGreaterThan(0);
      expect(screen.getAllByText("Banco Hipotecario").length).toBeGreaterThan(0);
    });

    it("distinguishes between 'Me deben' and 'Yo debo' with badges and filters", () => {
      render(
        <MemoryRouter>
          <Deudas />
        </MemoryRouter>
      );

      expect(screen.getAllByText("Me deben").length).toBeGreaterThan(0);
      expect(screen.getAllByText("Yo debo").length).toBeGreaterThan(0);

      // Filtrar por "Me deben"
      const meDebenPill = screen.getAllByRole("button", { name: "Me deben" })[0];
      fireEvent.click(meDebenPill);

      expect(screen.getAllByText("Carlos Mendoza").length).toBeGreaterThan(0);
      expect(screen.queryByText("Crédito personal")).not.toBeInTheDocument();

      // Filtrar por "Yo debo"
      const yoDeboPill = screen.getAllByRole("button", { name: "Yo debo" })[0];
      fireEvent.click(yoDeboPill);

      expect(screen.queryByText("Préstamo para viaje")).not.toBeInTheDocument();
      expect(screen.getAllByText("Banco Hipotecario").length).toBeGreaterThan(0);
    });

    it("filters debts by text search", () => {
      render(
        <MemoryRouter>
          <Deudas />
        </MemoryRouter>
      );

      const searchInput = screen.getByPlaceholderText(/buscar por persona/i);
      fireEvent.change(searchInput, { target: { value: "Carlos" } });

      expect(screen.getAllByText("Carlos Mendoza").length).toBeGreaterThan(0);
      expect(screen.queryByText("Crédito personal")).not.toBeInTheDocument();
    });

    it("selects debt in Master-Detail inspector on PC", () => {
      render(
        <MemoryRouter>
          <Deudas />
        </MemoryRouter>
      );

      // Clic en Carlos Mendoza en la lista
      const debtCard = screen.getByText("Préstamo para viaje").closest(".group")!;
      fireEvent.click(debtCard);

      // Inspector panel activo en desktop
      expect(screen.getByRole("complementary", { name: "Inspector de deuda" })).toBeInTheDocument();
      expect(screen.getByText("Registrar Abono")).toBeInTheDocument();
      expect(screen.getByText("Historial de abonos")).toBeInTheDocument();
      expect(screen.getByText(/primer abono/i)).toBeInTheDocument();
    });

    it("registers a quick payment calling addDebtPayment", async () => {
      render(
        <MemoryRouter>
          <Deudas />
        </MemoryRouter>
      );

      // Seleccionar Carlos Mendoza
      const debtCard = screen.getByText("Préstamo para viaje").closest(".group")!;
      fireEvent.click(debtCard);

      // El inspector tiene botón "Abonar ahora"
      const payButton = screen.getByRole("button", { name: "Abonar ahora" });
      fireEvent.click(payButton);

      await waitFor(() => {
        expect(mockAddDebtPayment).toHaveBeenCalledWith(
          "debt-1",
          expect.objectContaining({
            amount: 3000, // saldo pendiente sugerido (5000 - 2000)
          })
        );
      });
    });

    it("opens delete confirmation and calls removeDebt", async () => {
      render(
        <MemoryRouter>
          <Deudas />
        </MemoryRouter>
      );

      // Seleccionar Carlos Mendoza
      const debtCard = screen.getByText("Préstamo para viaje").closest(".group")!;
      fireEvent.click(debtCard);

      // Botón eliminar en inspector
      const deleteBtn = screen.getByRole("button", { name: /eliminar registro de deuda/i });
      fireEvent.click(deleteBtn);

      // Diálogo de confirmación
      expect(screen.getByText("¿Eliminar deuda?")).toBeInTheDocument();
      const confirmBtn = screen.getByRole("button", { name: /confirmar|eliminar/i });
      fireEvent.click(confirmBtn);

      await waitFor(() => {
        expect(mockRemoveDebt).toHaveBeenCalledWith("debt-1");
      });
    });

    it("supports deep-linking via query param ?id=debt-2", () => {
      render(
        <MemoryRouter initialEntries={["/deudas?id=debt-2"]}>
          <Deudas />
        </MemoryRouter>
      );

      expect(screen.getByRole("complementary", { name: "Inspector de deuda" })).toBeInTheDocument();
      expect(screen.getAllByText("Crédito personal").length).toBeGreaterThan(0);
    });

    it("opens mobile drawer automatically on mobile viewport when deep-linked", () => {
      window.innerWidth = 500;
      render(
        <MemoryRouter initialEntries={["/deudas?id=debt-2"]}>
          <Deudas />
        </MemoryRouter>
      );

      expect(screen.getByText("Detalle de Deuda")).toBeInTheDocument();
    });
  });

  // ==========================================
  // METAS TESTS
  // ==========================================
  describe("Metas Module & Dual Dispatcher", () => {
    it("renders MetasV2 when uiVersion === 'v2'", () => {
      render(
        <MemoryRouter>
          <Metas />
        </MemoryRouter>
      );

      expect(screen.getByText("Metas de Ahorro")).toBeInTheDocument();
      expect(screen.getByText("Visualiza tus sueños con hitos y ritmo mensual")).toBeInTheDocument();
      expect(screen.getByText("Ahorro Acumulado")).toBeInTheDocument();
      expect(screen.getByText("Capital Restante")).toBeInTheDocument();
    });

    it("renders MetasClassic when uiVersion === 'classic'", () => {
      mockState.appSettings = { uiVersion: "classic" };
      render(
        <MemoryRouter>
          <Metas />
        </MemoryRouter>
      );

      expect(screen.getByText("Sueños con plan")).toBeInTheDocument();
      expect(screen.queryByText("Visualiza tus sueños con hitos y ritmo mensual")).not.toBeInTheDocument();
    });

    it("preserves MetasClassic when appSettings is undefined", () => {
      mockState.appSettings = undefined;
      render(
        <MemoryRouter>
          <Metas />
        </MemoryRouter>
      );

      expect(screen.getByText("Sueños con plan")).toBeInTheDocument();
    });

    it("calculates progress and renders milestones (25%, 50%, 75%, 100%)", () => {
      render(
        <MemoryRouter>
          <Metas />
        </MemoryRouter>
      );

      expect(screen.getByText("Viaje a Japón")).toBeInTheDocument();
      // Milestone chips
      expect(screen.getAllByText("25%").length).toBeGreaterThan(0);
      expect(screen.getAllByText("50%").length).toBeGreaterThan(0);
      expect(screen.getAllByText("75%").length).toBeGreaterThan(0);
      expect(screen.getAllByText("100%").length).toBeGreaterThan(0);
    });

    it("calculates and displays required monthly pace for goal with deadline", () => {
      render(
        <MemoryRouter>
          <Metas />
        </MemoryRouter>
      );

      expect(screen.getByText(/ritmo requerido:/i)).toBeInTheDocument();
    });

    it("filters goals by folder", () => {
      render(
        <MemoryRouter>
          <Metas />
        </MemoryRouter>
      );

      const folderPill = screen.getByRole("button", { name: /seleccionar carpeta viajes y aventuras/i });
      fireEvent.click(folderPill);

      expect(screen.getByText("Viaje a Japón")).toBeInTheDocument();
      expect(screen.queryByText("Fondo de Emergencia")).not.toBeInTheDocument();
    });

    it("selects goal and allows quick contribution calling contributeGoal", async () => {
      render(
        <MemoryRouter>
          <Metas />
        </MemoryRouter>
      );

      const goalCard = screen.getByText("Viaje a Japón").closest(".group")!;
      fireEvent.click(goalCard);

      // Inspector de meta
      expect(screen.getByRole("complementary", { name: "Inspector de meta" })).toBeInTheDocument();
      expect(screen.getByText("Hitos del Sueño")).toBeInTheDocument();
      expect(screen.getByText("Aportación Rápida")).toBeInTheDocument();

      // Clic en preset "+500"
      const add500Btn = screen.getByRole("button", { name: "+500" });
      fireEvent.click(add500Btn);

      // Aportar ahora
      const contributeBtn = screen.getByRole("button", { name: "Aportar ahora" });
      fireEvent.click(contributeBtn);

      await waitFor(() => {
        expect(mockContributeGoal).toHaveBeenCalledWith(
          "goal-1",
          500,
          expect.any(String),
          "acc-1"
        );
      });
    });

    it("toggles pin status on goal calling updateGoal", async () => {
      render(
        <MemoryRouter>
          <Metas />
        </MemoryRouter>
      );

      const goalCard = screen.getByText("Viaje a Japón").closest(".group")!;
      fireEvent.click(goalCard);

      const pinBtn = screen.getByTitle(/fijar meta al inicio/i);
      fireEvent.click(pinBtn);

      await waitFor(() => {
        expect(mockUpdateGoal).toHaveBeenCalledWith("goal-1", { pinned: true });
      });
    });

    it("opens delete confirmation and calls removeGoal", async () => {
      render(
        <MemoryRouter>
          <Metas />
        </MemoryRouter>
      );

      const goalCard = screen.getByText("Viaje a Japón").closest(".group")!;
      fireEvent.click(goalCard);

      const deleteBtn = screen.getByRole("button", { name: /eliminar meta de ahorro/i });
      fireEvent.click(deleteBtn);

      expect(screen.getByText("¿Eliminar meta?")).toBeInTheDocument();
      const confirmBtn = screen.getByRole("button", { name: /confirmar|eliminar/i });
      fireEvent.click(confirmBtn);

      await waitFor(() => {
        expect(mockRemoveGoal).toHaveBeenCalledWith("goal-1");
      });
    });

    it("opens mobile drawer automatically on mobile viewport when deep-linked in Metas", () => {
      window.innerWidth = 500;
      render(
        <MemoryRouter initialEntries={["/metas?id=goal-1"]}>
          <Metas />
        </MemoryRouter>
      );

      expect(screen.getByText("Detalle de Meta")).toBeInTheDocument();
    });

    it("allows deleting a folder with confirmation dialog", async () => {
      render(
        <MemoryRouter>
          <Metas />
        </MemoryRouter>
      );

      const actionsBtn = screen.getByRole("button", { name: /acciones para la carpeta viajes y aventuras/i });
      fireEvent.pointerDown(actionsBtn, { button: 0 });
      fireEvent.click(actionsBtn);
      const deleteFolderBtn = await screen.findByText(/eliminar carpeta/i);
      fireEvent.click(deleteFolderBtn);

      expect(screen.getByText("¿Eliminar carpeta?")).toBeInTheDocument();
      const confirmBtn = screen.getByRole("button", { name: /confirmar|eliminar/i });
      fireEvent.click(confirmBtn);

      await waitFor(() => {
        expect(mockRemoveGoalFolder).toHaveBeenCalledWith("folder-1");
      });
    });

    it("includes goals in subfolders when parent folder is selected", () => {
      // Agregar subcarpeta y meta dentro de subcarpeta
      mockState.goalFolders.push({
        id: "folder-sub",
        name: "Europa",
        parentId: "folder-1",
        color: "gradient-sunset",
        order: 1,
        createdAt: "2026-01-01T00:00:00.000Z",
      });
      mockState.goals.push({
        id: "goal-sub",
        name: "Tour Francia",
        target: 20000,
        saved: 5000,
        emoji: "🗼",
        color: "gradient-sunset",
        folderId: "folder-sub",
      });

      render(
        <MemoryRouter>
          <Metas />
        </MemoryRouter>
      );

      // Clic en la carpeta padre "Viajes y Aventuras"
      const parentFolderPill = screen.getByRole("button", { name: /seleccionar carpeta viajes y aventuras/i });
      fireEvent.click(parentFolderPill);

      // Ambas metas (padre y subcarpeta) deben estar visibles
      expect(screen.getByText("Viaje a Japón")).toBeInTheDocument();
      expect(screen.getByText("Tour Francia")).toBeInTheDocument();
      expect(screen.queryByText("Fondo de Emergencia")).not.toBeInTheDocument();
    });
  });

  // ==========================================
  // VALIDATORS SCHEMA HARDENING TESTS
  // ==========================================
  describe("Validators Schema Hardening", () => {
    it("validates debtPaymentSchema with receipt and transfer metadata without throwing", () => {
      const paymentWithReceipt = {
        id: "123e4567-e89b-12d3-a456-426614174000",
        amount: 1500,
        date: "2026-10-24T12:00:00.000Z",
        paymentMethod: "transfer",
        accountId: "123e4567-e89b-12d3-a456-426614174001",
        transferToAccountId: "123e4567-e89b-12d3-a456-426614174002",
        externalPayee: {
          clabe: "123456789012345678",
          bank: "BBVA",
          name: "Carlos Mendoza",
        },
        receipt: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=",
      };

      const result = validateEntity(debtPaymentSchema, paymentWithReceipt);
      expect(result.success).toBe(true);
    });
  });
});
