import { StateCreator } from 'zustand';
import { Transaction, Account, FixedItem, ChangeLogEntry, parseDateLocal } from '@/lib/finance';
import { validateAndThrow, generateSecureId, logEntry, diffFields } from '@/lib/sanitizers';
import { saveReceipt as saveReceiptToIndexedDB } from '@/lib/encrypted-storage';
import { Capacitor } from '@capacitor/core';
import { Filesystem, Directory, Encoding } from '@capacitor/filesystem';

export interface TransactionSlice {
    transactions: Transaction[];
    addTx: (t: Omit<Transaction, 'id'>) => void;
    updateTx: (id: string, p: Partial<Transaction>) => void;
    removeTx: (id: string) => void;
    saveReceiptFile: (receiptId: string, dataUrl: string) => Promise<string | undefined>;
    deleteReceiptIfExists: (receipt?: string) => Promise<void>;
}

type StoreState = TransactionSlice & {
    accounts: Account[];
    fixedItems?: FixedItem[];
    changeLog: ChangeLogEntry[];
};

export const createTransactionSlice: StateCreator<
    StoreState,
    [],
    [],
    TransactionSlice
> = (set, get) => ({
    transactions: [],

    addTx: async (t) => {
        // Prevent accidental duplicates for transactions created from a fixed item
        const s = get();
        if (t.fixedId) {
            const pad = (n: number) => String(n).padStart(2, '0');
            const td = t.date ? parseDateLocal(t.date) : new Date();
            const tDateISO = `${td.getFullYear()}-${pad(td.getMonth() + 1)}-${pad(td.getDate())}`;
            const exists = s.transactions.some((x) => {
                if (x.fixedId !== t.fixedId) return false;
                const xd = parseDateLocal(x.date ?? '');
                const xISO = `${xd.getFullYear()}-${pad(xd.getMonth() + 1)}-${pad(xd.getDate())}`;
                return xISO === tDateISO;
            });
            if (exists) return;
        }
        const nv = { ...t, id: generateSecureId() } as Transaction;

        // Enforce cash account if paymentMethod is cash
        if (nv.paymentMethod === 'cash') {
            const cashAcc = s.accounts.find((a) => a.type === 'cash');
            if (cashAcc) nv.accountId = cashAcc.id;
        }

        // If receipt is a data URL, persist original to IndexedDB then save to local filesystem (native)
        if (typeof nv.receipt === 'string' && nv.receipt.startsWith('data:')) {
            // Save original to IndexedDB first (before compression replaces it)
            saveReceiptToIndexedDB(`tx:${nv.id}`, nv.receipt).catch(() => {});
            if (Capacitor.isNativePlatform()) {
                const saved = await get().saveReceiptFile(nv.id, nv.receipt);
                if (saved) nv.receipt = saved;
            }
        }

        // Validate with Zod before saving
        validateAndThrow('transaction', nv);

        set((s2) => ({
            transactions: [nv, ...s2.transactions],
            changeLog: [
                logEntry(
                    'transaction',
                    nv.id,
                    'create',
                    `Agregó ${nv.type === 'income' ? 'ingreso' : nv.type === 'saving' ? 'ahorro' : 'gasto'} "${nv.concept}"`
                ),
                ...s2.changeLog,
            ].slice(0, 500),
        }));
    },

    updateTx: async (idv, p) => {
        const s = get();
        const prev = s.transactions.find((x) => x.id === idv);
        if (!prev) return;
        const patch = { ...p } as Partial<Transaction>;

        // Enforce cash account if paymentMethod is cash
        if (patch.paymentMethod === 'cash') {
            const cashAcc = s.accounts.find((a) => a.type === 'cash');
            if (cashAcc) patch.accountId = cashAcc.id;
        }

        // If new receipt is a data URL, persist it to local filesystem then delete old
        if (typeof p.receipt === 'string' && p.receipt.startsWith('data:') && Capacitor.isNativePlatform()) {
            const saved = await get().saveReceiptFile(idv, p.receipt as string);
            if (saved) {
                patch.receipt = saved;
                await get().deleteReceiptIfExists(prev.receipt);
            }
        }

        // Validate merged transaction with Zod
        const merged = { ...prev, ...patch };
        validateAndThrow('transaction', merged);

        set((s2) => ({
            transactions: s2.transactions.map((x) => (x.id === idv ? { ...x, ...patch } : x)),
            changeLog: [logEntry('transaction', idv, 'update', `Editó "${prev.concept}"`, diffFields(prev, patch)), ...s2.changeLog].slice(0, 500),
        }));
    },

    removeTx: async (idv) => {
        const s = get();
        const prev = s.transactions.find((x) => x.id === idv);
        if (prev?.receipt) await get().deleteReceiptIfExists(prev.receipt);
        set((s2) => ({
            transactions: s2.transactions.filter((x) => x.id !== idv),
            changeLog: [logEntry('transaction', idv, 'delete', `Eliminó "${prev?.concept ?? 'movimiento'}"`), ...s2.changeLog].slice(0, 500),
        }));
    },

    // Local-only receipt helpers (native filesystem). La subida a la nube
    // se gestiona fuera del store, en la capa de servicios/mutations.
    async saveReceiptFile(receiptId: string, dataUrl: string) {
        try {
            if (typeof Filesystem?.writeFile === 'function') {
                const m = dataUrl.match(/^data:(image\/[^;]+);base64,(.*)$/);
                const base64 = m ? m[2] : dataUrl.split(',')[1];
                const mime = m ? m[1] : 'image/png';
                const ext = mime.split('/')[1] || 'png';
                const fname = `receipt-${receiptId}-${Date.now()}.${ext}`;
                const rel = `receipts/${fname}`;
                await Filesystem.writeFile({ path: rel, data: base64, directory: Directory.Data, encoding: Encoding.UTF8 });
                return rel;
            }
            return undefined;
        } catch {
            return undefined;
        }
    },

    async deleteReceiptIfExists(receipt?: string) {
        if (!receipt) return;
        // Solo archivos locales. Los recibos remotos se gestionan en la capa de servicios.
        if (receipt.startsWith('http')) return;
        try {
            if (typeof Filesystem?.deleteFile === 'function' && Capacitor.isNativePlatform()) {
                let fname = receipt;
                if (receipt.includes('/')) fname = receipt.split('/').pop() as string;
                await Filesystem.deleteFile({ path: `receipts/${fname}`, directory: Directory.Data });
            }
        } catch {
            // ignore
        }
    },
});
