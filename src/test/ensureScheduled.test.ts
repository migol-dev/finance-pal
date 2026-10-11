import { beforeEach, describe, expect, it } from "vitest";
import { useFinance } from "../store/finance-store";
import {
  FixedItem,
  getDueOccurrencesForFixedItem,
  buildScheduledTxId,
  monthlyAmount,
  parseDateLocal,
} from "../lib/finance";

describe("ensureScheduledTransactions", () => {
  beforeEach(() => {
    const s = useFinance.getState();
    s.resetAll();
  });

  it("creates a single transaction for a weekly fixed and prevents duplicates", () => {
    const s = useFinance.getState();
    const today = new Date();

    const fixedNoId = {
      type: "income_fixed",
      category: "Otros",
      concept: "Sueldo semanal",
      amount: 1500,
      frequency: "weekly",
      active: true,
      note: undefined,
      startDate: new Date(today.getFullYear(), today.getMonth(), 1).toISOString(),
      endDate: new Date(today.getFullYear() + 1, today.getMonth(), 1).toISOString(),
      priority: "medium",
      payDay: undefined,
      payWeekDay: today.getDay(),
      icon: undefined,
      paymentMethod: undefined,
    } as any;

    s.addFixed(fixedNoId);
    // Re-read state after mutation
    const stateAfterAdd = useFinance.getState();
    const fixed = stateAfterAdd.fixedItems.find((f) => f.concept === "Sueldo semanal");
    expect(fixed).toBeTruthy();

    // Trigger creation and read transactions from fresh state
    stateAfterAdd.ensureScheduledTransactions();
    const txs = useFinance.getState().transactions.filter((t) => t.fixedId === fixed!.id);
    expect(txs.length).toBe(1);

    // calling again should not create a duplicate
    useFinance.getState().ensureScheduledTransactions();
    const txs2 = useFinance.getState().transactions.filter((t) => t.fixedId === fixed!.id);
    expect(txs2.length).toBe(1);
  });

  it("creates a transaction when startDate is today and payWeekDay is today", () => {
    const s = useFinance.getState();
    const today = new Date();

    const fixedNoId = {
      type: "expense_fixed",
      category: "Otros",
      concept: "Pago hoy",
      amount: 100,
      frequency: "weekly",
      active: true,
      note: undefined,
      startDate: new Date(today.getFullYear(), today.getMonth(), today.getDate()).toISOString(),
      endDate: new Date(today.getFullYear() + 1, today.getMonth(), today.getDate()).toISOString(),
      priority: "medium",
      payDay: undefined,
      payWeekDay: today.getDay(),
      icon: undefined,
      paymentMethod: undefined,
    } as any;

    s.addFixed(fixedNoId);
    const stateAfterAdd = useFinance.getState();
    const fixed = stateAfterAdd.fixedItems.find((f) => f.concept === "Pago hoy");
    expect(fixed).toBeTruthy();

    stateAfterAdd.ensureScheduledTransactions();
    const txs = useFinance.getState().transactions.filter((t) => t.fixedId === fixed!.id);
    expect(txs.length).toBe(1);
  });

  it("removing a fixed today removes only today's occurrence and keeps historical transactions", () => {
    const s = useFinance.getState();
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);

    const fixedNoId = {
      type: "expense_fixed",
      category: "Otros",
      concept: "Fijo con historial",
      amount: 200,
      frequency: "weekly",
      active: true,
      note: undefined,
      startDate: yesterday.toISOString(),
      endDate: new Date(today.getFullYear() + 1, today.getMonth(), today.getDate()).toISOString(),
      priority: "medium",
      payDay: undefined,
      payWeekDay: today.getDay(),
      icon: undefined,
      paymentMethod: undefined,
    } as any;

    s.addFixed(fixedNoId);
    const stateAfterAdd = useFinance.getState();
    const fixed = stateAfterAdd.fixedItems.find((f) => f.concept === "Fijo con historial");
    expect(fixed).toBeTruthy();

    // add a historical transaction for yesterday
    useFinance.getState().addTx({ type: "expense", category: fixed!.category, concept: fixed!.concept, amount: fixed!.amount, date: yesterday.toISOString(), fixedId: fixed!.id });

    // generate today's occurrence
    stateAfterAdd.ensureScheduledTransactions();
    const allTxs = useFinance.getState().transactions.filter((t) => t.fixedId === fixed!.id);
    expect(allTxs.length).toBe(2);

    // remove the fixed and expect only yesterday's tx remains
    useFinance.getState().removeFixed(fixed!.id);
    const afterTxs = useFinance.getState().transactions.filter((t) => t.fixedId === fixed!.id);
    expect(afterTxs.length).toBe(1);
    const remainingDate = new Date(afterTxs[0].date);
    expect(remainingDate.getDate()).toBe(yesterday.getDate());
  });

  it("registers an overdue monthly fixed item when payDay already passed in the current month", () => {
    const now = new Date(2026, 9, 11, 12, 0, 0); // Oct 11, 2026
    const fixed: FixedItem = {
      id: "11111111-1111-4111-8111-111111111111",
      type: "expense_fixed",
      category: "Servicios",
      concept: "Internet",
      amount: 690,
      frequency: "monthly",
      active: true,
      startDate: new Date(2026, 9, 1, 12, 0, 0).toISOString(),
      endDate: new Date(2030, 11, 31, 12, 0, 0).toISOString(),
      priority: "high",
      payDay: 5,
      paymentMethod: "transfer",
    };

    const due = getDueOccurrencesForFixedItem(fixed, [], now);
    expect(due.length).toBe(1);
    expect(due[0].concept).toBe("Internet");
    expect(due[0].amount).toBe(690);
    expect(due[0].fixedId).toBe(fixed.id);
    const txDate = parseDateLocal(due[0].date);
    expect(txDate.getFullYear()).toBe(2026);
    expect(txDate.getMonth()).toBe(9);
    expect(txDate.getDate()).toBe(5);

    // Calling again with the generated transaction present should return empty (idempotent)
    const dueAgain = getDueOccurrencesForFixedItem(fixed, due, now);
    expect(dueAgain.length).toBe(0);
  });

  it("does not register a monthly fixed item whose payDay is still in the future this month", () => {
    const now = new Date(2026, 9, 11, 12, 0, 0); // Oct 11, 2026
    const fixed: FixedItem = {
      id: "22222222-2222-4222-8222-222222222222",
      type: "expense_fixed",
      category: "Hogar",
      concept: "Renta",
      amount: 5000,
      frequency: "monthly",
      active: true,
      startDate: new Date(2026, 9, 1, 12, 0, 0).toISOString(),
      endDate: new Date(2030, 11, 31, 12, 0, 0).toISOString(),
      priority: "high",
      payDay: 20,
    };

    const due = getDueOccurrencesForFixedItem(fixed, [], now);
    expect(due.length).toBe(0);
  });

  it("clamps payDay = 31 to the last day of short months (e.g. February 28 and April 30)", () => {
    const fixed: FixedItem = {
      id: "33333333-3333-4333-8333-333333333333",
      type: "expense_fixed",
      category: "Servicios",
      concept: "Suscripción fin de mes",
      amount: 299,
      frequency: "monthly",
      active: true,
      startDate: new Date(2026, 0, 1, 12, 0, 0).toISOString(),
      endDate: new Date(2030, 11, 31, 12, 0, 0).toISOString(),
      priority: "medium",
      payDay: 31,
    };

    // Feb 28, 2026 (non-leap year)
    const feb28 = new Date(2026, 1, 28, 12, 0, 0);
    const dueFeb = getDueOccurrencesForFixedItem(fixed, [], feb28);
    expect(dueFeb.length).toBe(1);
    const febDate = parseDateLocal(dueFeb[0].date);
    expect(febDate.getMonth()).toBe(1);
    expect(febDate.getDate()).toBe(28);

    // Apr 30, 2026 (30-day month)
    const apr30 = new Date(2026, 3, 30, 12, 0, 0);
    const dueApr = getDueOccurrencesForFixedItem(fixed, [], apr30);
    expect(dueApr.length).toBe(1);
    const aprDate = parseDateLocal(dueApr[0].date);
    expect(aprDate.getMonth()).toBe(3);
    expect(aprDate.getDate()).toBe(30);
  });

  it("handles biweekly frequency across first and second quincena without duplicates", () => {
    const fixed: FixedItem = {
      id: "44444444-4444-4444-8444-444444444444",
      type: "income_fixed",
      category: "Trabajo",
      concept: "Quincena",
      amount: 8000,
      frequency: "biweekly",
      active: true,
      startDate: new Date(2026, 9, 1, 12, 0, 0).toISOString(),
      endDate: new Date(2030, 11, 31, 12, 0, 0).toISOString(),
      priority: "high",
      payDay: 1, // Days 1 and 16
    };

    // On Oct 10, only day 1 is due
    const oct10 = new Date(2026, 9, 10, 12, 0, 0);
    const dueFirstHalf = getDueOccurrencesForFixedItem(fixed, [], oct10);
    expect(dueFirstHalf.length).toBe(1);
    expect(parseDateLocal(dueFirstHalf[0].date).getDate()).toBe(1);

    // On Oct 20, with day 1 already recorded, only day 16 is generated
    const oct20 = new Date(2026, 9, 20, 12, 0, 0);
    const dueSecondHalf = getDueOccurrencesForFixedItem(fixed, dueFirstHalf, oct20);
    expect(dueSecondHalf.length).toBe(1);
    expect(parseDateLocal(dueSecondHalf[0].date).getDate()).toBe(16);

    // If neither was recorded and user opens app on Oct 20, both days 1 and 16 are generated
    const dueBoth = getDueOccurrencesForFixedItem(fixed, [], oct20);
    expect(dueBoth.length).toBe(2);
  });

  it("buildScheduledTxId is deterministic and produces valid RFC 4122 v4 UUIDs", () => {
    const fixedId = "55555555-5555-4555-8555-555555555555";
    const id1 = buildScheduledTxId(fixedId, "2026-10-05");
    const id2 = buildScheduledTxId(fixedId, "2026-10-05");
    const idDiffDate = buildScheduledTxId(fixedId, "2026-10-06");

    expect(id1).toBe(id2);
    expect(id1).not.toBe(idDiffDate);
    expect(id1).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
  });

  it("calculates monthlyAmount accurately for all frequencies including biweekly and bimonthly", () => {
    const base: FixedItem = {
      id: "66666666-6666-4666-8666-666666666666",
      type: "expense_fixed",
      category: "Servicios",
      concept: "Agua",
      amount: 1900,
      frequency: "bimonthly",
      active: true,
      startDate: "2026-01-01T12:00:00.000Z",
      endDate: "2030-12-31T12:00:00.000Z",
      priority: "medium",
      payDay: 10,
    };

    expect(monthlyAmount(base)).toBe(950);
    expect(monthlyAmount({ ...base, frequency: "biweekly", amount: 1000 })).toBe(2000);
    expect(monthlyAmount({ ...base, frequency: "monthly", amount: 3200 })).toBe(3200);
    expect(monthlyAmount({ ...base, frequency: "yearly", amount: 1200 })).toBe(100);
    expect(monthlyAmount({ ...base, active: false })).toBe(0);
  });

  it("does not create a duplicate monthly transaction in the same month if payDay is edited after registration", () => {
    const now = new Date(2026, 9, 15, 12, 0, 0); // Oct 15, 2026
    const fixedDay5: FixedItem = {
      id: "77777777-7777-4777-8777-777777777777",
      type: "expense_fixed",
      category: "Servicios",
      concept: "Luz",
      amount: 500,
      frequency: "monthly",
      active: true,
      startDate: new Date(2026, 9, 1, 12, 0, 0).toISOString(),
      endDate: new Date(2030, 11, 31, 12, 0, 0).toISOString(),
      priority: "high",
      payDay: 5,
    };

    const firstRun = getDueOccurrencesForFixedItem(fixedDay5, [], now);
    expect(firstRun.length).toBe(1);

    // User edits payDay from 5 to 10 in the same month
    const fixedEditedDay10: FixedItem = { ...fixedDay5, payDay: 10 };
    const secondRun = getDueOccurrencesForFixedItem(fixedEditedDay10, firstRun, now);
    expect(secondRun.length).toBe(0);
  });

  it("respects startDate for biweekly items starting in the second half of the month and sanitizes empty optional strings", () => {
    const s = useFinance.getState();
    const oct20 = new Date(2026, 9, 20, 12, 0, 0);
    const fixedBiweeklyMidMonth: FixedItem = {
      id: "88888888-8888-4888-8888-888888888888",
      type: "income_fixed",
      category: "Trabajo",
      concept: "Quincena nuevo empleo",
      amount: 9500,
      frequency: "biweekly",
      active: true,
      // Starts Oct 15 -> Oct 1 occurrence must NOT be generated, only Oct 16
      startDate: new Date(2026, 9, 15, 12, 0, 0).toISOString(),
      endDate: new Date(2030, 11, 31, 12, 0, 0).toISOString(),
      priority: "high",
      payDay: 16,
      note: "",
      accountId: "",
    };

    const due = getDueOccurrencesForFixedItem(fixedBiweeklyMidMonth, [], oct20);
    expect(due.length).toBe(1);
    expect(parseDateLocal(due[0].date).getDate()).toBe(16);
    expect(due[0].accountId).toBeUndefined();
    expect(due[0].note).toBeUndefined();

    // Verify it passes full Zustand addTx + Zod validation without throwing
    s.addTx(due[0]);
    const stored = useFinance.getState().transactions.find((t) => t.id === due[0].id);
    expect(stored).toBeTruthy();
  });
});
