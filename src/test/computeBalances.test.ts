import { describe, it, expect } from "vitest";
import { computeBalances, Account, Transaction } from "../lib/finance";

describe("computeBalances", () => {
  it("aplica transacciones a saldos iniciales y usa cuenta fallback según paymentMethod", () => {
    const accounts: Account[] = [
      { id: "a1", name: "A1", type: "bank", initialBalance: 1000 },
      { id: "a2", name: "Efectivo", type: "cash", initialBalance: 200 },
    ];

    const transactions: Transaction[] = [
      { id: "t1", type: "income", category: "Otros", concept: "Venta", amount: 100, date: new Date().toISOString(), accountId: "a1" },
      { id: "t2", type: "expense", category: "Otros", concept: "Compra", amount: 50, date: new Date().toISOString(), accountId: "a1" },
      { id: "t3", type: "expense", category: "Otros", concept: "Snack", amount: 10, date: new Date().toISOString(), accountId: "a2" },
      // Sin accountId pero con paymentMethod "cash" -> cae en cuenta cash (a2)
      { id: "t4", type: "income", category: "Otros", concept: "SinCuenta", amount: 200, date: new Date().toISOString(), paymentMethod: "cash" },
      { id: "t5", type: "saving", category: "Otros", concept: "Ahorro", amount: 30, date: new Date().toISOString(), accountId: "a1" },
    ];

    const out = computeBalances(accounts, transactions);
    // a1: 1000 + 100 - 50 - 30 = 1020
    expect(out["a1"]).toBeCloseTo(1000 + 100 - 50 - 30);
    // a2: 200 - 10 + 200 (t4 income con paymentMethod cash) = 390
    expect(out["a2"]).toBeCloseTo(200 - 10 + 200);
  });
});
