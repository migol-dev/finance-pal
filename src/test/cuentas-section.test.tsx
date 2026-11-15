import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { CuentasSection } from "@/pages/ajustes/secciones/CuentasSection";
import type { Account } from "@/lib/finance";

let mockAccounts: Account[] = [];

vi.mock("@/hooks/useFinanceData", () => ({
  useFinanceData: () => ({
    accounts: mockAccounts,
    transactions: [],
    debts: [],
    addAccount: vi.fn(),
    updateAccount: vi.fn(),
    removeAccount: vi.fn(),
  }),
}));

describe("CuentasSection — Saldos visibles y estadísticas SVG", () => {
  beforeEach(() => {
    mockAccounts = [
      {
        id: "cash-1",
        name: "Dinero Físico",
        type: "cash",
        initialBalance: 1350,
        currency: "MXN",
        denominations: [
          { value: 500, count: 2, kind: "bill" },
          { value: 100, count: 3, kind: "bill" },
          { value: 10, count: 5, kind: "coin" },
        ],
      },
      {
        id: "bank-1",
        name: "Santander Junior",
        type: "bank",
        initialBalance: 4050,
        currency: "MXN",
      },
    ];
  });

  it("muestra el saldo disponible completo sin clase truncate en la cifra", () => {
    render(
      <MemoryRouter>
        <CuentasSection onBack={vi.fn()} />
      </MemoryRouter>
    );

    const cashBalance = screen.getByTestId("account-balance-cash-1");
    const bankBalance = screen.getByTestId("account-balance-bank-1");

    expect(cashBalance).toHaveTextContent("$1,350");
    expect(bankBalance).toHaveTextContent("$4,050");
    expect(cashBalance.className).not.toContain("truncate");
    expect(bankBalance.className).not.toContain("truncate");
  });

  it("despliega estadísticas de cuentas y permite inspeccionar monto y porcentaje al tocar un segmento", () => {
    render(
      <MemoryRouter>
        <CuentasSection onBack={vi.fn()} />
      </MemoryRouter>
    );

    const statsToggle = screen.getByRole("button", { name: /Estadísticas/i });
    expect(statsToggle).toHaveAttribute("aria-expanded", "false");
    expect(screen.queryByRole("img", { name: "Distribución de dinero por cuenta" })).not.toBeInTheDocument();

    fireEvent.click(statsToggle);
    expect(statsToggle).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByRole("img", { name: "Distribución de dinero por cuenta" })).toBeInTheDocument();

    // Tocar segmento de Santander Junior (4050 de 5400 = 75.0%)
    const bankArc = screen.getByRole("button", { name: /Santander Junior: \$4,050.*75\.0%/i });
    fireEvent.click(bankArc);
    expect(bankArc).toHaveAttribute("aria-pressed", "true");
  });

  it("muestra gráfico desplegable para el desglose de efectivo por billetes y monedas", () => {
    render(
      <MemoryRouter>
        <CuentasSection onBack={vi.fn()} />
      </MemoryRouter>
    );

    const cashChartBtn = screen.getByRole("button", { name: /Mostrar distribución en gráfico/i });
    expect(cashChartBtn).toHaveAttribute("aria-expanded", "false");

    fireEvent.click(cashChartBtn);
    expect(cashChartBtn).toHaveAttribute("aria-expanded", "true");
    expect(
      screen.getByRole("img", { name: "Distribución de efectivo por denominación" })
    ).toBeInTheDocument();

    expect(screen.getByText("Billete $500")).toBeInTheDocument();
    expect(screen.getByText("2 piezas")).toBeInTheDocument();
    expect(screen.getByText("Moneda $10")).toBeInTheDocument();
    expect(screen.getByText("5 piezas")).toBeInTheDocument();
  });
});
