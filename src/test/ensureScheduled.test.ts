import { beforeEach, describe, expect, it } from "vitest";
import { useFinance } from "../store/finance-store";

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
});
