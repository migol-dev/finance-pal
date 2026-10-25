import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import fs from "fs";
import path from "path";
import { MoreNavSheet } from "@/components/app/MoreNavSheet";
import { BottomNavV2 } from "@/components/app/BottomNavV2";
import { MovimientosV2 } from "@/components/movimientos/MovimientosV2";
import { MetasV2 } from "@/components/metas/MetasV2";
import { Header } from "@/components/app/Header";
import { IconDisplay } from "@/components/app/IconDisplay";
import { useQuickTxModal } from "@/store/ui-quick-tx-store";
import { useFinance } from "@/store/finance-store";
import type { Debt, Goal, GoalFolder, Account, AppSettings, Transaction } from "@/lib/finance";

// Mock ResizeObserver for jsdom
class MockResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}
global.ResizeObserver = MockResizeObserver as unknown as typeof ResizeObserver;
window.HTMLElement.prototype.scrollIntoView = vi.fn();

const mockAddTx = vi.fn().mockResolvedValue(undefined);
const mockAddGoal = vi.fn().mockResolvedValue(undefined);
const mockAddGoalFolder = vi.fn().mockResolvedValue(undefined);

let mockState = {
  transactions: [
    {
      id: "tx-1",
      amount: 150,
      concept: "Café de Especialidad",
      date: "2026-10-24T10:00:00.000Z",
      type: "expense",
      category: "Comida",
      accountId: "acc-1",
      paymentMethod: "cash",
    },
  ] as Transaction[],
  debts: [] as Debt[],
  goals: [
    {
      id: "goal-1",
      name: "Fondo de Emergencia",
      target: 20000,
      saved: 10000,
      color: "gradient-emerald",
      createdAt: "2026-01-01T00:00:00.000Z",
      contributions: [],
    },
  ] as Goal[],
  goalFolders: [
    {
      id: "folder-1",
      name: "Ahorros Principales",
      color: "gradient-primary",
      order: 0,
      createdAt: "2026-01-01T00:00:00.000Z",
    },
  ] as GoalFolder[],
  accounts: [{ id: "acc-1", name: "Efectivo", type: "cash", balance: 5000 }] as Account[],
  appSettings: { uiVersion: "v2", accentColor: "emerald" } as AppSettings | undefined,
};

vi.mock("@/hooks/useFinanceData", () => ({
  useFinanceData: () => ({
    transactions: mockState.transactions,
    debts: mockState.debts,
    goals: mockState.goals,
    goalFolders: mockState.goalFolders,
    accounts: mockState.accounts,
    appSettings: mockState.appSettings,
    uiVersion: "v2",
    profile: { name: "Usuario Móvil" },
    addTx: mockAddTx,
    addGoal: mockAddGoal,
    addGoalFolder: mockAddGoalFolder,
    isOnline: true,
  }),
}));

vi.mock("@/lib/supabase", () => ({
  isSupabaseEnabled: false,
}));

describe("Sprint 7 — Mobile Usability & WCAG AAA Verification Suite", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    act(() => {
      useQuickTxModal.getState().closeQuickTx();
      useFinance.getState().setUIVersion("v2");
    });
  });

  describe("MoreNavSheet Component", () => {
    it("renders navigation shortcuts and accessibility touch targets >= 44px", () => {
      const handleOpenChange = vi.fn();
      render(
        <MemoryRouter>
          <MoreNavSheet open={true} onOpenChange={handleOpenChange} />
        </MemoryRouter>
      );

      // Verify header and primary links
      expect(screen.getByText("Más opciones")).toBeInTheDocument();
      expect(screen.getByText("Deudas y Préstamos")).toBeInTheDocument();
      expect(screen.getByText("Balance Anual")).toBeInTheDocument();
      expect(screen.getByText("Historial de Actividades")).toBeInTheDocument();
      expect(screen.getByText("Ajustes y Personalización")).toBeInTheDocument();

      // Verify theme buttons exist
      expect(screen.getByRole("button", { name: "Claro" })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Oscuro" })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Sistema" })).toBeInTheDocument();

      // Verify touch targets: all navigation buttons must satisfy min-h-[44px]
      const deudasButton = screen.getByText("Deudas y Préstamos").closest("button");
      expect(deudasButton).toHaveClass("min-h-[52px]");

      const ajustesButton = screen.getByText("Ajustes y Personalización").closest("button");
      expect(ajustesButton).toHaveClass("min-h-[52px]");

      // Clicking navigation button triggers onOpenChange(false)
      fireEvent.click(deudasButton!);
      expect(handleOpenChange).toHaveBeenCalledWith(false);
    });
  });

  describe("BottomNavV2 5-Item Navigation Hierarchy", () => {
    it("renders 5 primary touch controls [Inicio, Movimientos, (+), Metas, Más]", () => {
      render(
        <MemoryRouter>
          <BottomNavV2 />
        </MemoryRouter>
      );

      expect(screen.getByLabelText("Inicio")).toBeInTheDocument();
      expect(screen.getByLabelText("Movimientos")).toBeInTheDocument();
      expect(screen.getByLabelText("Metas")).toBeInTheDocument();
      expect(screen.getByLabelText("Registrar movimiento rápido")).toBeInTheDocument();
      expect(screen.getByLabelText("Más opciones")).toBeInTheDocument();

      // Test elevated FAB
      const fab = screen.getByLabelText("Registrar movimiento rápido");
      act(() => {
        fireEvent.click(fab);
      });
      expect(useQuickTxModal.getState().isOpen).toBe(true);

      // Test tapping 'Más' opens MoreNavSheet
      const moreBtn = screen.getByLabelText("Más opciones");
      expect(moreBtn).toHaveAttribute("aria-expanded", "false");
      fireEvent.click(moreBtn);
      expect(moreBtn).toHaveAttribute("aria-expanded", "true");
    });
  });

  describe("MovimientosV2 Elastic Filter Tray", () => {
    it("renders clean Level 1 filters and toggles Level 2 secondary tray", () => {
      render(
        <MemoryRouter>
          <MovimientosV2 />
        </MemoryRouter>
      );

      // Search input is present in Level 1
      expect(screen.getByPlaceholderText(/buscar por concepto, categoría o método/i)).toBeInTheDocument();

      // Type tabs in Level 1
      expect(screen.getByRole("button", { name: "Todo" })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Gastos" })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Ingresos" })).toBeInTheDocument();

      // 'Más filtros' button toggles aria-expanded
      const moreFiltersBtn = screen.getByRole("button", { name: /más filtros/i });
      expect(moreFiltersBtn).toHaveAttribute("aria-expanded", "false");

      fireEvent.click(moreFiltersBtn);
      expect(moreFiltersBtn).toHaveAttribute("aria-expanded", "true");

      // Secondary filters (Cuenta, Categoría, Presets) are accessible
      expect(screen.getByText("Todas las cuentas")).toBeInTheDocument();
      expect(screen.getByText("Todas las categorías")).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Personalizado" })).toBeInTheDocument();
    });

    it("displays accessible Limpiar filtros button when query is entered", () => {
      render(
        <MemoryRouter>
          <MovimientosV2 />
        </MemoryRouter>
      );

      const searchInput = screen.getByPlaceholderText(/buscar por concepto, categoría o método/i);
      fireEvent.change(searchInput, { target: { value: "Café" } });

      const clearBtn = screen.getByRole("button", { name: /limpiar filtros/i });
      expect(clearBtn).toBeInTheDocument();

      fireEvent.click(clearBtn);
      expect(searchInput).toHaveValue("");
    });
    it("allows collapsing the filter tray even when secondary filters are active", () => {
      render(
        <MemoryRouter>
          <MovimientosV2 />
        </MemoryRouter>
      );

      const moreFiltersBtn = screen.getByRole("button", { name: /más filtros/i });
      // Open tray
      fireEvent.click(moreFiltersBtn);
      expect(moreFiltersBtn).toHaveAttribute("aria-expanded", "true");

      // Verify tray element is expanded
      const tray = moreFiltersBtn.closest("section")!.querySelector(".overflow-hidden");
      expect(tray).toHaveClass("max-h-[1200px]");

      // Select 'Ahorros' secondary type
      const savingsBtn = screen.getByRole("button", { name: "Ahorros" });
      fireEvent.click(savingsBtn);

      // Verify active badge is displayed
      expect(screen.getByText("1")).toBeInTheDocument();

      // Click 'Más filtros' again to collapse
      fireEvent.click(moreFiltersBtn);
      expect(moreFiltersBtn).toHaveAttribute("aria-expanded", "false");
      expect(tray).toHaveClass("max-h-0");
    });
  });

  describe("MetasV2 Mobile FolderChips & Header Hierarchy", () => {
    it("renders FolderChips and humanized copy without layout breakage", () => {
      render(
        <MemoryRouter>
          <MetasV2 />
        </MemoryRouter>
      );

      expect(screen.getByText("Metas de Ahorro")).toBeInTheDocument();
      expect(screen.getByText("Falta por ahorrar")).toBeInTheDocument();
      expect(screen.getByText("Metas logradas")).toBeInTheDocument();
      expect(screen.getByText("Fondo de Emergencia")).toBeInTheDocument();

      // Mobile folder chips exploration
      expect(screen.getByRole("region", { name: "Organizador por carpetas" })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Ver todas las carpetas en panel" })).toBeInTheDocument();
    });
  });

  describe("WCAG AAA Tokens & Stylesheet Integrity", () => {
    it("verifies index.css does NOT contain destructive border-width: 2px !important", () => {
      const cssPath = path.resolve(__dirname, "../index.css");
      const cssContent = fs.readFileSync(cssPath, "utf-8");

      // High-contrast rule must not destroy delicate borders across all elements
      expect(cssContent).not.toMatch(/html\.a11y-high-contrast\s*\{\s*border-width:\s*2px\s*!important/i);
      expect(cssContent).not.toMatch(/html\.a11y-high-contrast\s*\*\s*\{\s*border:\s*2px\s*solid\s*!important/i);

      // Verify high contrast tokens are defined
      expect(cssContent).toContain("--border: 0 0% 32%;"); // #525252 in light high contrast
      expect(cssContent).toContain("--border: 0 0% 64%;"); // #A3A3A3 in dark high contrast

      // Verify html.ui-v2 and html.dark.ui-v2 have reinforced WCAG AAA contrast tokens
      expect(cssContent).toContain("--muted-foreground: 38 6% 25.5%;"); // #45423D in ui-v2 (8.5:1)
      expect(cssContent).toContain("--muted-foreground: 40 6% 67.3%;"); // #B0ADA7 in dark.ui-v2 (7.8:1)
    });

    it("persists highContrast and textScalePercent in accessibility store", () => {
      act(() => {
        useFinance.getState().setAccessibilitySettings({
          highContrast: true,
          textScalePercent: 150,
          textScale: "xlarge",
        });
      });

      const a11y = useFinance.getState().appSettings.accessibility;
      expect(a11y.highContrast).toBe(true);
      expect(a11y.textScalePercent).toBe(150);
      expect(a11y.textScale).toBe("xlarge");
    });
  });

  describe("Mobile Header & IconDisplay Accessibility", () => {
    it("renders accessible mobile settings shortcut in Header with touch target >= 44px", () => {
      render(
        <MemoryRouter>
          <Header title="Prueba Header" subtitle="Subtítulo accesible" />
        </MemoryRouter>
      );

      const settingsLink = screen.getByRole("link", { name: "Ir a Ajustes y Perfil" });
      expect(settingsLink).toBeInTheDocument();
      expect(settingsLink).toHaveAttribute("href", "/ajustes");
      expect(settingsLink).toHaveClass("min-h-[44px]");
      expect(settingsLink).toHaveClass("min-w-[44px]");
    });

    it("renders IconDisplay with size xs applying size-6 text-xs properly without undefined", () => {
      const { container } = render(
        <IconDisplay icon={{ kind: "emoji", value: "🚀" }} size="xs" />
      );

      const iconDiv = container.firstChild as HTMLElement;
      expect(iconDiv).toHaveClass("size-6");
      expect(iconDiv).toHaveClass("text-xs");
      expect(iconDiv.className).not.toContain("undefined");
    });
  });
});
