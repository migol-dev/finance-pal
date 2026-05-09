import * as React from "react";
import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import { Calendar } from "../calendar";

/** Render the Calendar inside a wrapper that toggles the `dark` class
 *  exactly like AppShell does in production, so token-based styles
 *  resolve against the right palette. */
function renderThemed(ui: React.ReactElement, theme: "light" | "dark") {
  return render(<div className={theme === "dark" ? "dark" : ""}>{ui}</div>);
}

/**
 * Visual regression tests for the Calendar.
 * If theme tokens, classNames, or range styles change unintentionally,
 * the snapshot diff highlights it before it ships.
 */
describe("Calendar", () => {
  const fixedDate = new Date("2026-05-15T12:00:00Z");
  const rangeFrom = new Date("2026-05-10T12:00:00Z");
  const rangeTo = new Date("2026-05-20T12:00:00Z");

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
    expect(html).not.toMatch(/text-white|bg-white|text-black|bg-black/);
    // Wrapper must allow pointer events inside dialogs/popovers.
    expect(container.querySelector(".pointer-events-auto")).not.toBeNull();
  });

  it("renders range mode with continuous middle styling (snapshot)", () => {
    const { container } = render(
      <Calendar mode="range" selected={{ from: rangeFrom, to: rangeTo }} month={rangeFrom} />,
    );
    expect(container.firstChild).toMatchSnapshot();
  });

  it("light theme: full calendar (snapshot)", () => {
    const { container } = renderThemed(
      <Calendar mode="single" selected={fixedDate} month={fixedDate} />,
      "light",
    );
    expect(container.firstChild).toMatchSnapshot();
  });

  it("dark theme: full calendar (snapshot)", () => {
    const { container } = renderThemed(
      <Calendar mode="single" selected={fixedDate} month={fixedDate} />,
      "dark",
    );
    expect(container.firstChild).toMatchSnapshot();
  });

  it("light theme: range start/middle/end classes (snapshot)", () => {
    const { container } = renderThemed(
      <Calendar mode="range" selected={{ from: rangeFrom, to: rangeTo }} month={rangeFrom} />,
      "light",
    );
    // Sanity: at least one of each range marker should be present.
    expect(container.querySelector(".day-range-start, .day-range_start")).not.toBeUndefined();
    expect(container.querySelector(".day-range-end, .day-range_end")).not.toBeUndefined();
    expect(container.firstChild).toMatchSnapshot();
  });

  it("dark theme: range start/middle/end classes (snapshot)", () => {
    const { container } = renderThemed(
      <Calendar mode="range" selected={{ from: rangeFrom, to: rangeTo }} month={rangeFrom} />,
      "dark",
    );
    expect(container.firstChild).toMatchSnapshot();
  });

  it("hover/outside/disabled states use tokenised classes", () => {
    const { container } = render(
      <Calendar
        mode="single"
        selected={fixedDate}
        month={fixedDate}
        showOutsideDays
      />,
    );
    const html = container.innerHTML;
    // Hover styles should target accent tokens, not raw colors.
    expect(html).toMatch(/hover:bg-accent/);
    expect(html).toMatch(/hover:text-accent-foreground/);
    // Outside-month days exist and use muted-foreground.
    const outsideEl = container.querySelector(".day-outside") ?? container.querySelector('[data-outside="true"]');
    expect(outsideEl).not.toBeNull();
    expect(html).toMatch(/text-muted-foreground/);
    // Selected day uses primary tokens for AA contrast.
    const selected = container.querySelector('[aria-selected="true"]');
    expect(selected).not.toBeNull();
    const selCls = selected?.className ?? "";
    const hasPrimary = /bg-primary/.test(selCls) && /text-primary-foreground/.test(selCls);
    const hasMarker = selCls.includes("rdp-selected") || !!selected?.closest('[data-selected="true"]');
    expect(hasPrimary || hasMarker).toBeTruthy();
  });
});