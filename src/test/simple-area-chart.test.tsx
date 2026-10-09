import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import SimpleAreaChart from "@/components/ui/SimpleAreaChart";

describe("SimpleAreaChart Component", () => {
  it("renders with valid series and data points without crashing", () => {
    const data = [
      { x: "Ene", val: 100 },
      { x: "Feb", val: 200 },
      { x: "Mar", val: 300 },
    ];

    const { container } = render(
      <SimpleAreaChart
        data={data}
        xKey="x"
        series={[{ key: "val", label: "Valor", color: "#3b82f6", type: "area" }]}
      />
    );

    const svg = container.querySelector("svg");
    expect(svg).toBeInTheDocument();
  });

  it("handles empty data array without throwing Cannot read properties of undefined", () => {
    const { container } = render(
      <SimpleAreaChart
        data={[]}
        xKey="x"
        series={[{ key: "val", label: "Valor", color: "#3b82f6", type: "area" }]}
      />
    );

    const svg = container.querySelector("svg");
    expect(svg).toBeInTheDocument();
  });

  it("handles single data point gracefully", () => {
    const { container } = render(
      <SimpleAreaChart
        data={[{ x: "Ene", val: 500 }]}
        xKey="x"
        series={[{ key: "val", label: "Valor", color: "#3b82f6", type: "line" }]}
      />
    );

    const svg = container.querySelector("svg");
    expect(svg).toBeInTheDocument();
  });
});
