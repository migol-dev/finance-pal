import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { useQuickTxModal } from "@/store/ui-quick-tx-store";
import { BottomNavV2 } from "@/components/app/BottomNavV2";
import { DesktopSidebarV2 } from "@/components/app/DesktopSidebarV2";
import { CommandPalette } from "@/components/app/CommandPalette";
import { QuickTransactionSheet } from "@/components/app/QuickTransactionSheet";
import { AppShell } from "@/components/app/AppShell";
import { useFinance } from "@/store/finance-store";

// Mock global de ResizeObserver y scrollIntoView para cmdk en jsdom
class MockResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}
global.ResizeObserver = MockResizeObserver as unknown as typeof ResizeObserver;
window.HTMLElement.prototype.scrollIntoView = vi.fn();

export const mockAddTx = vi.fn().mockResolvedValue(undefined);
export const mockAddTransaction = vi.fn().mockResolvedValue(undefined);

// Mock de useFinanceData
vi.mock("@/hooks/useFinanceData", () => ({
  useFinanceData: () => ({
    uiVersion: useFinance.getState()?.appSettings?.uiVersion ?? "v2",
    appSettings: useFinance.getState()?.appSettings ?? { uiVersion: "v2", accentColor: "emerald" },
    profile: { name: "Usuario Prueba" },
    accounts: [{ id: "acc-1", name: "Efectivo", type: "cash", balance: 1000 }],
    goals: [],
    fixedItems: [],
    setActive: vi.fn(),
    addTx: mockAddTx,
    addTransaction: mockAddTransaction,
    cloudSync: { loadSettingsFromCloud: vi.fn() },
    isOnline: true,
  }),
}));

vi.mock("@/lib/supabase", () => ({
  isSupabaseEnabled: false,
}));

describe("Sprint 2 Navigation & AppShell v2 Suite", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    act(() => {
      useQuickTxModal.getState().closeQuickTx();
      useFinance.getState().setUIVersion("v2");
    });
  });

  describe("ui-quick-tx-store", () => {
    it("manages open and close state with default type", () => {
      expect(useQuickTxModal.getState().isOpen).toBe(false);

      act(() => {
        useQuickTxModal.getState().openQuickTx("income");
      });
      expect(useQuickTxModal.getState().isOpen).toBe(true);
      expect(useQuickTxModal.getState().defaultType).toBe("income");

      act(() => {
        useQuickTxModal.getState().closeQuickTx();
      });
      expect(useQuickTxModal.getState().isOpen).toBe(false);
    });
  });

  describe("BottomNavV2", () => {
    it("renders navigation items and center action button", () => {
      render(
        <MemoryRouter>
          <BottomNavV2 />
        </MemoryRouter>
      );

      expect(screen.getByLabelText("Inicio")).toBeInTheDocument();
      expect(screen.getByLabelText("Movimientos")).toBeInTheDocument();
      expect(screen.getByLabelText("Deudas")).toBeInTheDocument();
      expect(screen.getByLabelText("Metas")).toBeInTheDocument();

      const fab = screen.getByLabelText("Registrar movimiento rápido");
      expect(fab).toBeInTheDocument();

      act(() => {
        fireEvent.click(fab);
      });
      expect(useQuickTxModal.getState().isOpen).toBe(true);
    });
  });

  describe("DesktopSidebarV2", () => {
    it("renders navigation, command bar trigger and quick action button", () => {
      render(
        <MemoryRouter>
          <DesktopSidebarV2 />
        </MemoryRouter>
      );

      expect(screen.getByText("Inicio")).toBeInTheDocument();
      expect(screen.getByText("Movimientos")).toBeInTheDocument();
      expect(screen.getByText("Deudas")).toBeInTheDocument();
      expect(screen.getByText("Metas")).toBeInTheDocument();
      expect(screen.getByText("Nuevo Movimiento")).toBeInTheDocument();
      expect(screen.getByLabelText("Buscar o comandos (⌘K)")).toBeInTheDocument();

      const addBtn = screen.getByText("Nuevo Movimiento");
      act(() => {
        fireEvent.click(addBtn);
      });
      expect(useQuickTxModal.getState().isOpen).toBe(true);
    });

    it("collapses to rail mode and expands back", () => {
      render(
        <MemoryRouter>
          <DesktopSidebarV2 />
        </MemoryRouter>
      );

      const collapseBtn = screen.getByLabelText("Colapsar barra lateral");
      act(() => {
        fireEvent.click(collapseBtn);
      });

      // En modo colapsado el texto "Nuevo Movimiento" se oculta
      expect(screen.queryByText("Nuevo Movimiento")).not.toBeInTheDocument();

      const expandBtn = screen.getByLabelText("Expandir barra lateral");
      act(() => {
        fireEvent.click(expandBtn);
      });
      expect(screen.getByText("Nuevo Movimiento")).toBeInTheDocument();
    });
  });

  describe("CommandPalette", () => {
    it("renders quick actions and allows opening quick transaction sheet", () => {
      render(
        <MemoryRouter>
          <CommandPalette open={true} onOpenChange={() => {}} />
        </MemoryRouter>
      );

      expect(screen.getByText("Nuevo Movimiento Rápido")).toBeInTheDocument();
      expect(screen.getByText("Alternar Tema (Claro / Oscuro)")).toBeInTheDocument();
      expect(screen.getByText("Alternar Diseño (Warm Editorial v2 / Clásico)")).toBeInTheDocument();

      const quickItem = screen.getByText("Nuevo Movimiento Rápido");
      act(() => {
        fireEvent.click(quickItem);
      });
      expect(useQuickTxModal.getState().isOpen).toBe(true);
    });

    it("toggles open state with Cmd+K / Ctrl+K keyboard shortcut", () => {
      const handleOpenChange = vi.fn();
      render(
        <MemoryRouter>
          <CommandPalette open={false} onOpenChange={handleOpenChange} />
        </MemoryRouter>
      );

      act(() => {
        window.dispatchEvent(new KeyboardEvent("keydown", { key: "k", metaKey: true, bubbles: true }));
      });
      expect(handleOpenChange).toHaveBeenCalledWith(true);
    });
  });

  describe("QuickTransactionSheet", () => {
    it("renders drawer elements when open and submits valid transaction", async () => {
      act(() => {
        useQuickTxModal.getState().openQuickTx("expense");
      });

      render(
        <MemoryRouter>
          <QuickTransactionSheet />
        </MemoryRouter>
      );

      expect(screen.getByText("Registro Rápido de Movimiento")).toBeInTheDocument();
      expect(screen.getByPlaceholderText("0.00")).toBeInTheDocument();
      expect(screen.getByPlaceholderText(/Ej\. Supermercado/)).toBeInTheDocument();
      expect(screen.getByPlaceholderText("Detalle extra")).toBeInTheDocument();

      const amountInput = screen.getByPlaceholderText("0.00");
      const conceptInput = screen.getByPlaceholderText(/Ej\. Supermercado/);
      const noteInput = screen.getByPlaceholderText("Detalle extra");

      act(() => {
        fireEvent.change(amountInput, { target: { value: "150.50" } });
        fireEvent.change(conceptInput, { target: { value: "Cena familiar" } });
        fireEvent.change(noteInput, { target: { value: "Pago con tarjeta" } });
      });

      const submitBtn = screen.getByRole("button", { name: /Guardar Gasto/i });
      await act(async () => {
        fireEvent.click(submitBtn);
      });

      expect(mockAddTransaction).toHaveBeenCalledTimes(1);
      const callArg = mockAddTransaction.mock.calls[0][0];
      expect(callArg.amount).toBe(150.5);
      expect(callArg.concept).toBe("Cena familiar");
      expect(callArg.note).toBe("Pago con tarjeta");
      expect(callArg.type).toBe("expense");
      expect(callArg.accountId).toBe("acc-1");
      expect(useQuickTxModal.getState().isOpen).toBe(false);
    });

    it("prevents submission and displays warning if amount is invalid", async () => {
      act(() => {
        useQuickTxModal.getState().openQuickTx("expense");
      });

      render(
        <MemoryRouter>
          <QuickTransactionSheet />
        </MemoryRouter>
      );

      const conceptInput = screen.getByPlaceholderText(/Ej\. Supermercado/);
      act(() => {
        fireEvent.change(conceptInput, { target: { value: "Café" } });
      });

      const submitBtn = screen.getByRole("button", { name: /Guardar Gasto/i });
      await act(async () => {
        fireEvent.click(submitBtn);
      });

      // No debe llamar a mockAddTransaction porque el monto está vacío
      expect(mockAddTransaction).not.toHaveBeenCalled();
      expect(useQuickTxModal.getState().isOpen).toBe(true);
    });
  });

  describe("AppShell Dual Integration", () => {
    it("renders v2 navigation components when uiVersion is v2", () => {
      act(() => {
        useFinance.getState().setUIVersion("v2");
      });

      render(
        <MemoryRouter>
          <AppShell>
            <div data-testid="child-content">Hola Mundo</div>
          </AppShell>
        </MemoryRouter>
      );

      expect(screen.getByTestId("child-content")).toBeInTheDocument();
      expect(screen.getByLabelText("Navegación principal inferior v2")).toBeInTheDocument();
      expect(screen.getByLabelText("Navegación lateral de escritorio v2")).toBeInTheDocument();
    });

    it("renders classic navigation components when uiVersion is classic", () => {
      act(() => {
        useFinance.getState().setUIVersion("classic");
      });

      render(
        <MemoryRouter>
          <AppShell>
            <div data-testid="child-content">Hola Mundo Classic</div>
          </AppShell>
        </MemoryRouter>
      );

      expect(screen.getByTestId("child-content")).toBeInTheDocument();
      expect(screen.queryByLabelText("Navegación principal inferior v2")).not.toBeInTheDocument();
      expect(screen.queryByLabelText("Navegación lateral de escritorio v2")).not.toBeInTheDocument();
    });
  });
});
