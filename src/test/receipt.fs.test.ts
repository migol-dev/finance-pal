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
});
