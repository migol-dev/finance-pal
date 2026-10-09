import { describe, it, expect } from "vitest";
import { fmtDate, parseGoalDeadline } from "@/lib/finance";

describe("Safe date formatting and goal deadline parsing", () => {
  it("formats valid dates properly as dd/mm/yyyy", () => {
    expect(fmtDate("2026-05-10")).toBe("10/05/2026");
    expect(fmtDate(new Date(2026, 4, 10))).toBe("10/05/2026");
  });

  it("handles null, undefined, empty and invalid strings safely without throwing or NaN", () => {
    expect(fmtDate(null)).toBe("—");
    expect(fmtDate(undefined)).toBe("—");
    expect(fmtDate("")).toBe("—");
    expect(fmtDate("not-a-date")).toBe("—");
  });

  it("parses bare YYYY-MM-DD deadlines into midday local Date", () => {
    const dt = parseGoalDeadline("2026-05-10");
    expect(dt).not.toBeNull();
    expect(dt?.getFullYear()).toBe(2026);
    expect(dt?.getMonth()).toBe(4);
    expect(dt?.getDate()).toBe(10);
  });

  it("parses full ISO datetimes without producing NaN", () => {
    const dt = parseGoalDeadline("2026-05-10T00:00:00.000Z");
    expect(dt).not.toBeNull();
    expect(dt?.getFullYear()).toBe(2026);
    expect(fmtDate(dt)).toBe("10/05/2026");
  });

  it("returns null for invalid or missing goal deadlines", () => {
    expect(parseGoalDeadline(null)).toBeNull();
    expect(parseGoalDeadline(undefined)).toBeNull();
    expect(parseGoalDeadline("")).toBeNull();
    expect(parseGoalDeadline("invalid")).toBeNull();
  });
});
