import { describe, it, expect } from "vitest";
import { computeBalances, Account, Transaction, isIOweDebt } from "../lib/finance";

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

  it("gestiona deudas 'me_deben': el préstamo resta de la cuenta y los abonos recibidos suman", () => {
    const accounts: Account[] = [
      { id: "bank1", name: "Banco", type: "bank", initialBalance: 5000 },
    ];
    const debts = [
      {
        id: "d1",
        person: "Carlos",
        concept: "Préstamo",
        amount: 2000,
        date: "2026-10-01T12:00:00.000Z",
        accountId: "bank1",
        type: "me_deben" as const,
        payments: [
          {
            id: "p1",
            amount: 500,
            date: "2026-10-05T12:00:00.000Z",
            accountId: "bank1",
          },
        ],
      },
    ];

    const out = computeBalances(accounts, [], debts);
    // 5000 - 2000 (prestado) + 500 (abono recibido) = 3500
    expect(out["bank1"]).toBeCloseTo(3500);
  });

  it("gestiona deudas 'yo_debo': el préstamo recibido suma a la cuenta y los abonos/pagos restan", () => {
    const accounts: Account[] = [
      { id: "bank1", name: "Banco", type: "bank", initialBalance: 1000 },
      { id: "cash1", name: "Efectivo", type: "cash", initialBalance: 500 },
    ];
    const debts = [
      {
        id: "d2",
        person: "Prestamista",
        concept: "Crédito recibido",
        amount: 10000,
        date: "2026-10-01T12:00:00.000Z",
        accountId: "bank1",
        type: "yo_debo" as const,
        payments: [
          {
            id: "p2",
            amount: 2000,
            date: "2026-10-10T12:00:00.000Z",
            accountId: "bank1",
          },
          // Abono en efectivo sin accountId explícito -> fallback a cash1
          {
            id: "p3",
            amount: 300,
            date: "2026-10-15T12:00:00.000Z",
            paymentMethod: "cash" as const,
          },
        ],
      },
      // Deuda con etiqueta legacy [yo_debo]
      {
        id: "d3",
        person: "Amigo",
        concept: "Préstamo",
        note: "[yo_debo]",
        amount: 500,
        date: "2026-10-02T12:00:00.000Z",
        // Sin accountId en creación (no altera saldo inicial)
        payments: [
          {
            id: "p4",
            amount: 200,
            date: "2026-10-12T12:00:00.000Z",
            accountId: "bank1",
          },
        ],
      },
    ];

    const out = computeBalances(accounts, [], debts);
    // bank1: 1000 + 10000 (préstamo recibido d2) - 2000 (abono p2) - 200 (abono p4) = 8800
    expect(out["bank1"]).toBeCloseTo(8800);
    // cash1: 500 - 300 (abono p3 en efectivo de deuda propia) = 200
    expect(out["cash1"]).toBeCloseTo(200);
  });

  it("tolera deudas con payments indefinidos o nulos sin lanzar excepción", () => {
    const accounts: Account[] = [
      { id: "bank1", name: "Banco", type: "bank", initialBalance: 5000 },
    ];
    const debts: any[] = [
      {
        id: "d-no-payments",
        person: "Sin Abonos",
        concept: "Préstamo",
        amount: 1000,
        date: "2026-10-01T12:00:00.000Z",
        accountId: "bank1",
        type: "me_deben",
        payments: undefined,
      },
    ];

    expect(() => computeBalances(accounts, [], debts)).not.toThrow();
    const out = computeBalances(accounts, [], debts);
    expect(out["bank1"]).toBe(4000);
  });

  it("verifica isIOweDebt con types explícitos, etiquetas legacy y defaults", () => {
    expect(isIOweDebt({ type: "yo_debo" })).toBe(true);
    expect(isIOweDebt({ type: "me_deben" })).toBe(false);
    expect(isIOweDebt({ note: "Préstamo [yo_debo] urgente" })).toBe(true);
    expect(isIOweDebt({ note: "Préstamo normal" })).toBe(false);
    expect(isIOweDebt({})).toBe(false);
  });
});
