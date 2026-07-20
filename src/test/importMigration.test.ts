import { describe, it, expect, beforeEach } from "vitest";
import { useFinance } from "../store/finance-store";

describe("importData / migrate sanitization", () => {
  beforeEach(() => {
    useFinance.getState().resetAll();
  });

  it("importa solo cuentas y transacciones válidas y devuelve advertencias de migración", async () => {
    const payload = {
      app: "finance-pal",
      version: 1,
      data: {
        accounts: [
          { id: "ok", name: "Cuenta OK", type: "bank", initialBalance: 100 },
          { id: "bad", type: "cash" },
        ],
        transactions: [
          { id: "t1", type: "income", category: "Trabajo", concept: "Sueldo", amount: 100, date: new Date().toISOString(), accountId: "ok" },
          { id: "t2", type: "expense", concept: "Sin monto" },
        ]
      }
    };

    const res = await useFinance.getState().importData(JSON.stringify(payload), { accounts: true, transactions: true });
    expect(res.ok).toBe(true);
    expect(res.warnings && res.warnings.length > 0).toBe(true);

    const s = useFinance.getState();
    const okAcct = s.accounts.find((a) => a.id === "ok");
    expect(okAcct).toBeTruthy();
    const badAcct = s.accounts.find((a) => a.id === "bad");
    expect(badAcct).toBeUndefined();

    const tx = s.transactions.find((t) => t.id === "t1");
    expect(tx).toBeTruthy();
    const invalidTx = s.transactions.find((t) => t.id === "t2");
    expect(invalidTx).toBeUndefined();
  });
});
