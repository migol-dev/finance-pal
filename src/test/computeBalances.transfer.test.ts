import { describe, it, expect } from "vitest";
import { computeBalances, Account, Transaction } from "../lib/finance";

describe("computeBalances transfers", () => {
  it("debits origin and credits internal destination", () => {
    const accounts: Account[] = [
      { id: "a1", name: "Cuenta A", type: "bank", initialBalance: 500 },
      { id: "a2", name: "Cuenta B", type: "bank", initialBalance: 200 },
    ];
    const tx: Transaction[] = [
      { id: "t1", type: "expense", category: "Otros", concept: "Transferencia", amount: 100, date: new Date().toISOString(), accountId: "a1", transferToAccountId: "a2" },
    ];
    const out = computeBalances(accounts, tx);
    expect(out["a1"]).toBeCloseTo(400);
    expect(out["a2"]).toBeCloseTo(300);
  });

  it("only debits origin for external transfer (no credit to unknown destination)", () => {
    const accounts: Account[] = [
      { id: "a1", name: "Cuenta A", type: "bank", initialBalance: 800 },
    ];
    const tx: Transaction[] = [
      { id: "t2", type: "expense", category: "Otros", concept: "Transferencia externa", amount: 150, date: new Date().toISOString(), accountId: "a1", transferToAccountId: "__external", externalPayee: { clabe: "123", bank: "BancoX", name: "Juan" } },
    ];
    const out = computeBalances(accounts, tx);
    expect(out["a1"]).toBeCloseTo(650);
    expect(out["__external"]).toBeUndefined();
  });

  it("attributes cash transactions without accountId to cash account", () => {
    const accounts: Account[] = [
      { id: "a1", name: "Banco", type: "bank", initialBalance: 1000 },
      { id: "cash1", name: "Efectivo", type: "cash", initialBalance: 50 },
    ];
    const tx: Transaction[] = [
      { id: "t3", type: "expense", category: "Otros", concept: "Gasto en efectivo", amount: 20, date: new Date().toISOString(), paymentMethod: "cash" },
    ];
    const out = computeBalances(accounts, tx);
    expect(out["cash1"]).toBeCloseTo(30);
  });
});
