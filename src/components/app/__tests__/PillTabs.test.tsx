import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import {
  PillTabs,
  PILL_TAB_ACTIVE,
  PILL_TAB_INACTIVE,
  PILL_TAB_BASE,
  PILL_TABS_CONTAINER,
} from "../PillTabs";

describe("PillTabs", () => {
  const tabs = ["resumen", "calendario", "simular"] as const;

  it("renders all tabs and marks the active one", () => {
    render(<PillTabs tabs={tabs} value="calendario" onChange={() => {}} />);
    const active = screen.getByRole("tab", { name: "calendario" });
    expect(active).toHaveAttribute("aria-selected", "true");
    expect(active.className).toContain("bg-background");
    expect(active.className).toContain("text-foreground");
  });

  it("calls onChange when a tab is clicked", () => {
    const fn = vi.fn();
    render(<PillTabs tabs={tabs} value="resumen" onChange={fn} />);
    fireEvent.click(screen.getByRole("tab", { name: "simular" }));
    expect(fn).toHaveBeenCalledWith("simular");
  });

  it("regression: shared style constants stay in sync (snapshot)", () => {
    expect({
      container: PILL_TABS_CONTAINER,
      base: PILL_TAB_BASE,
      active: PILL_TAB_ACTIVE,
      inactive: PILL_TAB_INACTIVE,
    }).toMatchSnapshot();
  });

  it("regression: rendered DOM structure (snapshot)", () => {
    const { container } = render(
      <PillTabs tabs={tabs} value="resumen" onChange={() => {}} ariaLabel="test" />,
    );
    expect(container.firstChild).toMatchSnapshot();
  });
});