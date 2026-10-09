import { describe, it, expect } from "vitest";
import { fmtDate, parseGoalDeadline } from "@/lib/finance";
import { paceFor } from "@/pages/metas/types";
import { computeGoalNotifications, DEFAULT_NOTIFICATION_PREFS } from "@/lib/notifications";

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

  it("calculates goal pace without NaN when deadline is full ISO string", () => {
    const goal = {
      id: "g-iso",
      name: "Meta ISO",
      target: 10000,
      saved: 2000,
      emoji: "🎯",
      color: "gradient-primary",
      deadline: "2026-12-31T00:00:00.000Z",
    };

    const pace = paceFor(goal);
    expect(pace).not.toBeNull();
    expect(Number.isNaN(pace?.perDay)).toBe(false);
    expect(Number.isNaN(pace?.perWeek)).toBe(false);
    expect(Number.isNaN(pace?.perMonth)).toBe(false);
    expect(pace?.remaining).toBe(8000);
  });

  it("generates goal notifications without NaN in notification body for ISO deadlines", () => {
    const goal = {
      id: "g-iso-notify",
      name: "Meta Alerta",
      target: 5000,
      saved: 500,
      emoji: "🚗",
      color: "gradient-sunset",
      deadline: new Date(Date.now() + 86400000 * 3).toISOString(), // 3 days in future
    };

    const notifs = computeGoalNotifications(goal, {
      ...DEFAULT_NOTIFICATION_PREFS,
      enabled: true,
      localEnabled: true,
      upcomingDays: [3],
    });

    for (const n of notifs) {
      expect(n.body).not.toContain("NaN");
    }
  });
});
