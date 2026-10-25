import { vi, describe, it, expect, beforeEach } from "vitest";

vi.mock('@capacitor/filesystem', () => {
  return {
    Filesystem: {
      writeFile: vi.fn(async ({ path }: any) => ({ uri: `file://${path}` })),
      deleteFile: vi.fn(async (_: any) => ({})),
    },
    Directory: { Data: 'DATA' },
    Encoding: { UTF8: 'utf8' },
  };
});
vi.mock('@capacitor/core', () => ({ Capacitor: { isNativePlatform: () => true } }));

import { Filesystem } from '@capacitor/filesystem';
import { useFinance } from "../store/finance-store";
import { formatChangeLogLabel } from "@/components/historial/HistorialV2";

describe('receipt filesystem persistence', () => {
  beforeEach(() => {
    useFinance.getState().resetAll();
  });

  it('saves dataURL receipt to filesystem on addTx', async () => {
    const s = useFinance.getState();
    const accounts = s.accounts;
    const accId = accounts[0].id;
    const dataUrl = 'data:image/png;base64,AAAA';
    await s.addTx({ type: 'expense', category: 'Otros', concept: 'Pago', amount: 10, date: new Date().toISOString(), accountId: accId, receipt: dataUrl });
    const cur = useFinance.getState();
    const tx = cur.transactions[0];
    expect(tx).toBeDefined();
    expect(tx.receipt).toBeTruthy();
    expect(typeof tx.receipt).toBe('string');
    expect((tx.receipt as string).startsWith('receipts/')).toBeTruthy();
    // ensure filesystem write was called
    expect((Filesystem as any).writeFile).toHaveBeenCalled();
  });

  it('deletes receipt file on removeTx', async () => {
    const s = useFinance.getState();
    const accId = s.accounts[0].id;
    const dataUrl = 'data:image/png;base64,BBBB';
    await s.addTx({ type: 'expense', category: 'Otros', concept: 'Pago', amount: 5, date: new Date().toISOString(), accountId: accId, receipt: dataUrl });
    const cur = useFinance.getState();
    const tx = cur.transactions[0];
    expect(tx.receipt).toBeTruthy();
    const fname = (tx.receipt as string).split('/').pop();
    await s.removeTx(tx.id);
    // deleteFile should have been called
    expect((Filesystem as any).deleteFile).toHaveBeenCalled();
    // check it was called with receipts/<fname>
    const callArg = (Filesystem as any).deleteFile.mock.calls[0][0];
    expect(callArg.path).toBe(`receipts/${fname}`);
  });

  it('registra correctamente en changeLog la etiqueta "traspaso" cuando type === "transfer"', async () => {
    const s = useFinance.getState();
    const acc1 = s.accounts[0].id;
    const acc2 = s.accounts[1]?.id ?? "acc-dest";
    await s.addTx({
      type: 'transfer',
      category: 'Otros',
      concept: 'Envío entre cuentas',
      amount: 1500,
      date: new Date().toISOString(),
      accountId: acc1,
      transferToAccountId: acc2,
    });
    const cur = useFinance.getState();
    const log = cur.changeLog[0];
    expect(log).toBeDefined();
    expect(log.action).toBe('create');
    expect(log.label).toBe('Agregó traspaso "Envío entre cuentas"');
  });

  it('formatea etiquetas legacy en HistorialV2 convirtiendo "Agregó gasto [traspaso]" a "Agregó traspaso"', () => {
    expect(formatChangeLogLabel('Agregó gasto "Traspaso a BBVA"')).toBe('Agregó traspaso "Traspaso a BBVA"');
    expect(formatChangeLogLabel('Agregó gasto "Transferencia a Ahorro"')).toBe('Agregó traspaso "Transferencia a Ahorro"');
    expect(formatChangeLogLabel('Agregó gasto "Supermercado"')).toBe('Agregó gasto "Supermercado"');
    expect(formatChangeLogLabel('Agregó ingreso "Salario"')).toBe('Agregó ingreso "Salario"');
  });
});
