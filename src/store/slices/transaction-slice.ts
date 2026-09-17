import { StateCreator } from 'zustand';
import { Transaction, Account, FixedItem, ChangeLogEntry, parseDateLocal } from '@/lib/finance';
import { supabase, isSupabaseEnabled } from '@/lib/supabase';
import { uploadReceipt, deleteReceipt } from '@/lib/supabase-storage';
import { validateAndThrow, generateSecureId, logEntry, diffFields } from '@/lib/sanitizers';
import { sanitizeForLog } from '@/lib/validators';
import { useSyncStore } from '@/store/sync-store';
import { saveReceipt as saveReceiptToIndexedDB } from '@/lib/encrypted-storage';
import { Capacitor } from '@capacitor/core';
import { Filesystem, Directory, Encoding } from '@capacitor/filesystem';

function isOnline(): boolean {
    return typeof navigator !== 'undefined' ? navigator.onLine : true;
}

function queueMutation(
    table: string,
    action: 'INSERT' | 'UPDATE' | 'DELETE',
    recordId: string,
    payload?: Record<string, unknown>
) {
    if (!isSupabaseEnabled) return;
    useSyncStore.getState().addMutation({ table, action, recordId, payload });
}

export interface TransactionSlice {
    transactions: Transaction[];
    addTx: (t: Omit<Transaction, 'id'>) => Promise<void>;
    updateTx: (id: string, p: Partial<Transaction>) => Promise<void>;
    removeTx: (id: string) => Promise<void>;
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

        // If receipt is a data URL, persist original to IndexedDB then upload compressed
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

        // Sync to Supabase
        if (isSupabaseEnabled) {
            const user = (await supabase.auth.getUser()).data.user;
            if (user) {
                const payload: Record<string, unknown> = {
                    id: nv.id,
                    user_id: user.id,
                    type: nv.type,
                    category: nv.category,
                    concept: nv.concept,
                    amount: nv.amount,
                    date: nv.date,
                    note: nv.note,
                    icon: nv.icon,
                    payment_method: nv.paymentMethod,
                    fixed_id: nv.fixedId,
                    account_id: nv.accountId,
                    transfer_to_account_id: nv.transferToAccountId,
                    external_payee: nv.externalPayee,
                    receipt: nv.receipt,
                };
                if (isOnline()) {
                    const { error } = await supabase.from('transactions').insert(payload);
                    if (error) console.error('Supabase insert error (transactions):', sanitizeForLog(error));
                } else {
                    queueMutation('transactions', 'INSERT', nv.id, payload);
                }
            }
        }
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

        // If new receipt is a data URL, persist it then delete old
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

        // Sync to Supabase
        if (isSupabaseEnabled) {
            const user = (await supabase.auth.getUser()).data.user;
            if (user) {
                const payload: Record<string, unknown> = {};
                if ('type' in patch) payload.type = patch.type;
                if ('category' in patch) payload.category = patch.category;
                if ('concept' in patch) payload.concept = patch.concept;
                if ('amount' in patch) payload.amount = patch.amount;
                if ('date' in patch) payload.date = patch.date;
                if ('note' in patch) payload.note = patch.note === undefined ? null : patch.note;
                if ('icon' in patch) payload.icon = patch.icon === undefined ? null : patch.icon;
                if ('paymentMethod' in patch) payload.payment_method = patch.paymentMethod === undefined ? null : patch.paymentMethod;
                if ('fixedId' in patch) payload.fixed_id = patch.fixedId === undefined ? null : patch.fixedId;
                if ('accountId' in patch) payload.account_id = patch.accountId === undefined ? null : patch.accountId;
                if ('transferToAccountId' in patch) payload.transfer_to_account_id = patch.transferToAccountId === undefined ? null : patch.transferToAccountId;
                if ('externalPayee' in patch) payload.external_payee = patch.externalPayee === undefined ? null : patch.externalPayee;
                if ('receipt' in patch) payload.receipt = patch.receipt === undefined ? null : patch.receipt;
                if (isOnline()) {
                    const { error } = await supabase.from('transactions').update(payload).eq('id', idv);
                    if (error) console.error('Supabase update error (transactions):', sanitizeForLog(error));
                } else {
                    queueMutation('transactions', 'UPDATE', idv, payload);
                }
            }
        }
    },

    removeTx: async (idv) => {
        const s = get();
        const prev = s.transactions.find((x) => x.id === idv);
        if (prev?.receipt) await get().deleteReceiptIfExists(prev.receipt);
        set((s2) => ({
            transactions: s2.transactions.filter((x) => x.id !== idv),
            changeLog: [logEntry('transaction', idv, 'delete', `Eliminó "${prev?.concept ?? 'movimiento'}"`), ...s2.changeLog].slice(0, 500),
        }));

        // Sync to Supabase
        if (isSupabaseEnabled) {
            const user = (await supabase.auth.getUser()).data.user;
            if (user) {
                if (isOnline()) {
                    const { error } = await supabase.from('transactions').delete().eq('id', idv);
                    if (error) console.error('Supabase delete error (transactions):', sanitizeForLog(error));
                } else {
                    queueMutation('transactions', 'DELETE', idv);
                }
            }
        }
    },

    async saveReceiptFile(receiptId: string, dataUrl: string) {
        if (isSupabaseEnabled) {
            const user = (await supabase.auth.getUser()).data.user;
            if (user) {
                const url = await uploadReceipt(user.id, receiptId, dataUrl);
                if (url) return url;
            }
        }
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
        if (isSupabaseEnabled && receipt.startsWith('http')) {
            const user = (await supabase.auth.getUser()).data.user;
            if (user) {
                const deleted = await deleteReceipt(user.id, receipt);
                if (deleted) return;
            }
        }
        try {
            if (typeof Filesystem?.deleteFile === 'function') {
                let fname = receipt;
                if (receipt.includes('/')) fname = receipt.split('/').pop() as string;
                await Filesystem.deleteFile({ path: `receipts/${fname}`, directory: Directory.Data });
            }
        } catch {
            // ignore
        }
    },
});
