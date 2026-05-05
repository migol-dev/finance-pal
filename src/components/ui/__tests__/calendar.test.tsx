import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import { Calendar } from "../calendar";

/**
 * Visual regression tests for the Calendar.
 * If theme tokens, classNames, or range styles change unintentionally,
 * the snapshot diff highlights it before it ships.
 */
describe("Calendar", () => {
  const fixedDate = new Date("2026-05-15T12:00:00Z");

  it("renders a single-mode calendar (snapshot)", () => {
    const { container } = render(
      <Calendar mode="single" selected={fixedDate} month={fixedDate} />,
    );
    expect(container.firstChild).toMatchSnapshot();
  });

  it("uses semantic theme tokens for selected/today (no hardcoded colors)", () => {
    const { container } = render(
      <Calendar mode="single" selected={fixedDate} month={fixedDate} />,
    );
    const html = container.innerHTML;
    // Should rely on tokens, not raw hex/white/black.
    expect(html).not.toMatch(/#fff(?![a-fA-F0-9])/);
    expect(html).not.toMatch(/#000(?![a-fA-F0-9])/);
    // Wrapper must allow pointer events inside dialogs/popovers.
    expect(container.querySelector(".pointer-events-auto")).not.toBeNull();
  });

  it("renders range mode with continuous middle styling (snapshot)", () => {
    const from = new Date("2026-05-10T12:00:00Z");
    const to = new Date("2026-05-20T12:00:00Z");
    const { container } = render(
      <Calendar mode="range" selected={{ from, to }} month={from} />,
    );
    expect(container.firstChild).toMatchSnapshot();
  });
});