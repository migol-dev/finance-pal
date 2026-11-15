import { describe, it, expect } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { DonutChart } from "@/components/charts/DonutChart";
import type { DistributionSlice } from "@/lib/distribution";

const SAMPLE_SLICES: DistributionSlice[] = [
  {
    id: "acc-1",
    label: "Santander",
    sublabel: "Cuenta bancaria",
    amount: 3000,
    percentage: 75,
    colorVar: "var(--chart-1)",
  },
  {
    id: "acc-2",
    label: "Dinero Físico",
    sublabel: "Efectivo",
    amount: 1000,
    percentage: 25,
    colorVar: "var(--chart-2)",
  },
];

describe("DonutChart interactive SVG component", () => {
  it("renderiza el SVG, total inicial y leyenda con montos y porcentajes", () => {
    render(<DonutChart slices={SAMPLE_SLICES} total={4000} ariaLabel="Distribución cuentas" />);

    expect(screen.getByRole("img", { name: "Distribución cuentas" })).toBeInTheDocument();
    const center = screen.getByTestId("donut-center-readout");
    expect(center).toHaveTextContent(/Total distribuido/i);
    expect(center).toHaveTextContent(/4,000/);

    expect(screen.getAllByRole("button", { name: /Santander/i }).length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText("75.0%")).toBeInTheDocument();
    expect(screen.getByText("25.0%")).toBeInTheDocument();
  });

  it("actualiza la lectura central y aria-pressed al hacer clic o activar con teclado", () => {
    render(<DonutChart slices={SAMPLE_SLICES} total={4000} />);

    // Primer botón de Santander corresponde al segmento SVG <circle role="button">
    const arcBtn = screen.getByRole("button", { name: /Santander: \$3,000.*75\.0%/i });
    fireEvent.click(arcBtn);

    expect(arcBtn).toHaveAttribute("aria-pressed", "true");
    const center = screen.getByTestId("donut-center-readout");
    expect(center).toHaveTextContent("Santander");
    expect(center).toHaveTextContent("75.0%");

    // Activar segundo segmento con teclado (Enter)
    const secondArc = screen.getByRole("button", { name: /Dinero Físico: \$1,000.*25\.0%/i });
    fireEvent.keyDown(secondArc, { key: "Enter" });
    expect(secondArc).toHaveAttribute("aria-pressed", "true");
    expect(arcBtn).toHaveAttribute("aria-pressed", "false");
    expect(center).toHaveTextContent("Dinero Físico");
    expect(center).toHaveTextContent("25.0%");

    // Volver a pulsar para volver al resumen Total
    fireEvent.click(secondArc);
    expect(center).toHaveTextContent(/Total distribuido/i);
  });

  it("muestra estado vacío limpio cuando no hay segmentos positivos", () => {
    render(<DonutChart slices={[]} total={0} emptyMessage="Sin cuentas activas" />);
    expect(screen.getByText("Sin cuentas activas")).toBeInTheDocument();
    expect(screen.queryByRole("img")).not.toBeInTheDocument();
  });
});
