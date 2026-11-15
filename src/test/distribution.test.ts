import { describe, it, expect } from "vitest";
import {
  computeAccountsDistribution,
  computeDenominationsDistribution,
} from "@/lib/distribution";
import type { Account } from "@/lib/finance";

describe("distribution analytics helpers", () => {
  it("maneja listas vacias o cuentas en cero sin NaN", () => {
    expect(computeAccountsDistribution([], {})).toEqual({
      total: 0,
      slices: [],
      excludedNegativeCount: 0,
    });

    const accounts: Account[] = [
      { id: "a1", name: "Vacía", type: "bank", initialBalance: 0, currency: "MXN" },
    ];
    expect(computeAccountsDistribution(accounts, { a1: 0 })).toEqual({
      total: 0,
      slices: [],
      excludedNegativeCount: 0,
    });
  });

  it("ordena cuentas positivas, excluye negativas con conteo y suma exactamente 100.0%", () => {
    const accounts: Account[] = [
      { id: "cash", name: "Dinero Físico", type: "cash", initialBalance: 0, currency: "MXN" },
      { id: "bank1", name: "Santander", type: "bank", initialBalance: 0, currency: "MXN" },
      { id: "bank2", name: "Nu", type: "bank", initialBalance: 0, currency: "MXN" },
      { id: "neg", name: "Tarjeta", type: "bank", initialBalance: 0, currency: "MXN" },
    ];
    const balances = { cash: 1000, bank1: 2000, bank2: 1000, neg: -500 };

    const result = computeAccountsDistribution(accounts, balances);
    expect(result.total).toBe(4000);
    expect(result.excludedNegativeCount).toBe(1);
    expect(result.slices.map((s) => s.id)).toEqual(["bank1", "cash", "bank2"]);
    expect(result.slices[0].percentage).toBe(50);
    expect(result.slices[1].percentage).toBe(25);
    expect(result.slices[2].percentage).toBe(25);
    expect(result.slices.reduce((s, item) => s + item.percentage, 0)).toBe(100);
  });

  it("aplica largest remainder para evitar desajuste de redondeo con 3 tercios", () => {
    const accounts: Account[] = [
      { id: "a", name: "A", type: "bank", initialBalance: 100, currency: "MXN" },
      { id: "b", name: "B", type: "bank", initialBalance: 100, currency: "MXN" },
      { id: "c", name: "C", type: "cash", initialBalance: 100, currency: "MXN" },
    ];
    const res = computeAccountsDistribution(accounts, { a: 100, b: 100, c: 100 });
    const sum = res.slices.reduce((acc, s) => acc + Math.round(s.percentage * 10), 0);
    expect(sum).toBe(1000);
  });

  it("calcula distribucion fisica de billetes y monedas con piezas y porcentaje", () => {
    const res = computeDenominationsDistribution([
      { value: 500, count: 2, kind: "bill" },
      { value: 100, count: 3, kind: "bill" },
      { value: 10, count: 5, kind: "coin" },
      { value: 20, count: 0, kind: "bill" },
    ]);

    expect(res.total).toBe(1350);
    expect(res.totalPieces).toBe(10);
    expect(res.slices).toHaveLength(3);
    expect(res.slices[0]).toMatchObject({
      label: "Billete $500",
      sublabel: "2 piezas",
      amount: 1000,
      count: 2,
    });
    expect(res.slices[2]).toMatchObject({
      label: "Moneda $10",
      sublabel: "5 piezas",
      amount: 50,
      count: 5,
    });
    const sumTenths = res.slices.reduce((acc, s) => acc + Math.round(s.percentage * 10), 0);
    expect(sumTenths).toBe(1000);
  });
});
