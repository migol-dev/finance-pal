import { StateCreator } from 'zustand';
import { Debt, DebtPayment, Account, ChangeLogEntry } from '@/lib/finance';
import { validateAndThrow, generateSecureId, logEntry, diffFields } from '@/lib/sanitizers';
import { saveReceipt as saveReceiptToIndexedDB, deleteReceipt as deleteReceiptFromIndexedDB } from '@/lib/encrypted-storage';

export interface DebtSlice {
    debts: Debt[];
    addDebt: (d: Omit<Debt, 'id' | 'payments'>) => void;
    updateDebt: (id: string, p: Partial<Debt>) => void;
    removeDebt: (id: string) => void;
    addDebtPayment: (debtId: string, p: Omit<DebtPayment, 'id'>) => void;
    removeDebtPayment: (debtId: string, paymentId: string) => void;
}

type StoreState = DebtSlice & {
    accounts: Account[];
    changeLog: ChangeLogEntry[];
};

export const createDebtSlice: StateCreator<
    StoreState,
    [],
    [],
    DebtSlice
> = (set, get) => ({
    debts: [],

    addDebt: (d) => {
        const nv: Debt = { ...d, id: generateSecureId(), payments: [] };

        validateAndThrow('debt', nv);

        set((s) => ({
            debts: [nv, ...s.debts],
            changeLog: [
                logEntry('debt', nv.id, 'create', `Registró deuda de ${nv.person} por ${nv.amount}`),
                ...s.changeLog,
            ].slice(0, 500),
        }));
    },

    updateDebt: (idv, p) => {
        const s = get();
        const prev = s.debts.find((x) => x.id === idv);
        if (!prev) return;

        const ch = diffFields(prev, p);
        const merged = { ...prev, ...p };

        validateAndThrow('debt', merged);

        set({
            debts: s.debts.map((x) => (x.id === idv ? { ...x, ...p } : x)),
            changeLog: [
                logEntry('debt', idv, 'update', `Editó deuda de "${prev.person}"`, ch),
                ...s.changeLog,
            ].slice(0, 500),
        });
    },

    removeDebt: (idv) => {
        const s = get();
        const prev = s.debts.find((x) => x.id === idv);

        set({
            debts: s.debts.filter((x) => x.id !== idv),
            changeLog: [
                logEntry('debt', idv, 'delete', `Eliminó deuda de "${prev?.person ?? ''}"`),
                ...s.changeLog,
            ].slice(0, 500),
        });
    },

    addDebtPayment: (debtId, p) => {
        const s = get();
        const debt = s.debts.find((x) => x.id === debtId);
        if (!debt) return;

        const enriched = { ...p };
        if (enriched.paymentMethod === 'cash') {
            const cashAcc = s.accounts.find((a) => a.type === 'cash');
            if (cashAcc) enriched.accountId = cashAcc.id;
        }
        const payment: DebtPayment = { ...enriched, id: generateSecureId() };

        validateAndThrow('debtPayment', payment);

        set((state) => ({
            debts: state.debts.map((x) =>
                x.id === debtId ? { ...x, payments: [payment, ...x.payments] } : x
            ),
            changeLog: [
                logEntry('debt', debtId, 'update', `Abono de ${payment.amount} a deuda de "${debt.person}"`),
                ...state.changeLog,
            ].slice(0, 500),
        }));

        if (payment.receipt && payment.receipt.startsWith('data:')) {
            saveReceiptToIndexedDB(`pay:${payment.id}`, payment.receipt).catch(() => { });
        }
    },

    removeDebtPayment: (debtId, paymentId) => {
        const prev = get().debts.find((x) => x.id === debtId);
        const removedPayment = prev?.payments.find((p) => p.id === paymentId);

        if (removedPayment?.receipt && removedPayment.receipt.startsWith('data:')) {
            deleteReceiptFromIndexedDB(`pay:${paymentId}`).catch(() => { });
        }

        set((state) => ({
            debts: state.debts.map((x) =>
                x.id === debtId ? { ...x, payments: x.payments.filter((p) => p.id !== paymentId) } : x
            ),
            changeLog: [logEntry('debt', debtId, 'update', 'Eliminó un abono'), ...state.changeLog].slice(0, 500),
        }));
    },
});
