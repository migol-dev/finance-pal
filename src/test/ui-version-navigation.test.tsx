import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { useQuickTxModal } from "@/store/ui-quick-tx-store";
import { BottomNavV2 } from "@/components/app/BottomNavV2";
import { DesktopSidebarV2 } from "@/components/app/DesktopSidebarV2";
import { CommandPalette } from "@/components/app/CommandPalette";
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
    addTransaction: vi.fn().mockResolvedValue(undefined),
    cloudSync: { loadSettingsFromCloud: vi.fn() },
    isOnline: true,
  }),
}));

vi.mock("@/lib/supabase", () => ({
  isSupabaseEnabled: false,
}));

describe("Sprint 2 Navigation & AppShell v2 Suite", () => {
  beforeEach(() => {
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
