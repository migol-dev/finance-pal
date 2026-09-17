import { StateCreator } from 'zustand';
import { Debt, DebtPayment, Account, ChangeLogEntry } from '@/lib/finance';
import { supabase, isSupabaseEnabled } from '@/lib/supabase';
import { validateAndThrow, generateSecureId, logEntry, diffFields, isValidUUID } from '@/lib/sanitizers';
import { sanitizeForLog } from '@/lib/validators';
import { useSyncStore } from '@/store/sync-store';
import { saveReceipt as saveReceiptToIndexedDB, deleteReceipt as deleteReceiptFromIndexedDB } from '@/lib/encrypted-storage';
import { toast } from 'sonner';

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

export interface DebtSlice {
    debts: Debt[];
    addDebt: (d: Omit<Debt, 'id' | 'payments'>) => Promise<void>;
    updateDebt: (id: string, p: Partial<Debt>) => Promise<void>;
    removeDebt: (id: string) => Promise<void>;
    addDebtPayment: (debtId: string, p: Omit<DebtPayment, 'id'>) => Promise<void>;
    removeDebtPayment: (debtId: string, paymentId: string) => Promise<void>;
}

type StoreState = DebtSlice & {
    accounts: Account[];
    changeLog: ChangeLogEntry[];
    saveReceiptFile: (id: string, dataUrl: string) => Promise<string | undefined>;
};

export const createDebtSlice: StateCreator<
    StoreState,
    [],
    [],
    DebtSlice
> = (set, get) => ({
    debts: [],

    addDebt: async (d) => {
        const nv: Debt = { ...d, id: generateSecureId(), payments: [] };

        validateAndThrow('debt', nv);

        set((s) => ({
            debts: [nv, ...s.debts],
            changeLog: [
                logEntry('debt', nv.id, 'create', `Registró deuda de ${nv.person} por ${nv.amount}`),
                ...s.changeLog,
            ].slice(0, 500),
        }));

        if (isSupabaseEnabled) {
            const user = (await supabase.auth.getUser()).data.user;
            if (user) {
                const payload: Record<string, unknown> = {
                    id: nv.id,
                    user_id: user.id,
                    person: nv.person,
                    concept: nv.concept,
                    amount: nv.amount,
                    date: nv.date,
                    due_date: nv.dueDate,
                    note: nv.note,
                    icon: nv.icon,
                };
                if (nv.accountId && isValidUUID(nv.accountId)) payload.account_id = nv.accountId;

                if (isOnline()) {
                    const { error } = await supabase.from('debts').insert(payload);
                    if (error) {
                        console.error('Supabase insert error (debts):', sanitizeForLog(error));
                        toast.error('Error al guardar deuda en la nube: ' + error.message);
                    }
                } else {
                    queueMutation('debts', 'INSERT', nv.id, payload);
                }
            }
        }
    },

    updateDebt: async (idv, p) => {
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

        if (isSupabaseEnabled) {
            const user = (await supabase.auth.getUser()).data.user;
            if (user) {
                const payload: Record<string, unknown> = {};
                if ('person' in p) payload.person = p.person;
                if ('concept' in p) payload.concept = p.concept;
                if ('amount' in p) payload.amount = p.amount;
                if ('date' in p) payload.date = p.date;
                if ('dueDate' in p) payload.due_date = p.dueDate === undefined ? null : p.dueDate;
                if ('note' in p) payload.note = p.note === undefined ? null : p.note;
                if ('icon' in p) payload.icon = p.icon === undefined ? null : p.icon;
                if ('accountId' in p) {
                    payload.account_id =
                        p.accountId === undefined ? null : isValidUUID(p.accountId) ? p.accountId : null;
                }

                if (isOnline()) {
                    const { error } = await supabase.from('debts').update(payload).eq('id', idv);
                    if (error) {
                        console.error('Supabase update error (debts):', sanitizeForLog(error));
                        toast.error('Error al actualizar deuda en la nube: ' + error.message);
                    }
                } else {
                    queueMutation('debts', 'UPDATE', idv, payload);
                }
            }
        }
    },

    removeDebt: async (idv) => {
        const s = get();
        const prev = s.debts.find((x) => x.id === idv);

        set({
            debts: s.debts.filter((x) => x.id !== idv),
            changeLog: [
                logEntry('debt', idv, 'delete', `Eliminó deuda de "${prev?.person ?? ''}"`),
                ...s.changeLog,
            ].slice(0, 500),
        });

        if (isSupabaseEnabled) {
            const user = (await supabase.auth.getUser()).data.user;
            if (user) {
                if (isOnline()) {
                    const { error } = await supabase.from('debts').delete().eq('id', idv);
                    if (error) console.error('Supabase delete error (debts):', sanitizeForLog(error));
                } else {
                    queueMutation('debts', 'DELETE', idv);
                }
            }
        }
    },

    addDebtPayment: async (debtId, p) => {
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
            if (isSupabaseEnabled) {
                const url = await get().saveReceiptFile(payment.id, payment.receipt);
                if (url) {
                    payment.receipt = url;
                    set((state) => ({
                        debts: state.debts.map((x) =>
                            x.id === debtId
                                ? {
                                    ...x,
                                    payments: x.payments.map((pay) =>
                                        pay.id === payment.id ? { ...pay, receipt: url } : pay
                                    ),
                                }
                                : x
                        ),
                    }));
                }
            }
        }

        let resolvedDebtId = debtId;
        if (isSupabaseEnabled && !isValidUUID(debtId)) {
            const user = (await supabase.auth.getUser()).data.user;
            if (user) {
                const { data: existing } = await supabase
                    .from('debts')
                    .select('id')
                    .eq('user_id', user.id)
                    .eq('person', debt.person)
                    .eq('amount', debt.amount)
                    .eq('concept', debt.concept)
                    .maybeSingle();

                if (existing) {
                    resolvedDebtId = existing.id;
                } else {
                    const newId = generateSecureId();
                    const debtPayload: Record<string, unknown> = {
                        id: newId,
                        user_id: user.id,
                        person: debt.person,
                        concept: debt.concept,
                        amount: debt.amount,
                        date: debt.date,
                        due_date: debt.dueDate,
                        note: debt.note,
                        icon: debt.icon,
                    };
                    if (debt.accountId && isValidUUID(debt.accountId)) {
                        debtPayload.account_id = debt.accountId;
                    }

                    if (isOnline()) {
                        const { error: debtErr } = await supabase
                            .from('debts')
                            .upsert(debtPayload, { onConflict: 'id' });
                        if (debtErr) {
                            console.error('Supabase upsert error (debts):', sanitizeForLog(debtErr));
                            toast.error('Error al sincronizar deuda: ' + debtErr.message);
                        } else {
                            resolvedDebtId = newId;
                        }
                    } else {
                        queueMutation('debts', 'INSERT', newId, debtPayload);
                        resolvedDebtId = newId;
                    }
                }
            }
        }

        if (isSupabaseEnabled && isValidUUID(resolvedDebtId)) {
            const user = (await supabase.auth.getUser()).data.user;
            if (user) {
                const payload: Record<string, unknown> = {
                    id: payment.id,
                    user_id: user.id,
                    debt_id: resolvedDebtId,
                    amount: payment.amount,
                    date: payment.date,
                    note: payment.note,
                    payment_method: payment.paymentMethod,
                };

                if (payment.accountId && isValidUUID(payment.accountId)) {
                    payload.account_id = payment.accountId;
                }
                if (payment.transferToAccountId && isValidUUID(payment.transferToAccountId)) {
                    payload.transfer_to_account_id = payment.transferToAccountId;
                }
                if (payment.externalPayee) {
                    payload.external_payee = payment.externalPayee;
                }
                if (payment.receipt && !payment.receipt.startsWith('data:')) {
                    payload.receipt_url = payment.receipt;
                }

                if (isOnline()) {
                    const { error } = await supabase.from('debt_payments').insert(payload);
                    if (error) {
                        if (error.code === '23503') {
                            delete payload.account_id;
                            delete payload.transfer_to_account_id;
                            const { error: retryErr } = await supabase.from('debt_payments').insert(payload);
                            if (retryErr) toast.error('Error al sincronizar abono: ' + retryErr.message);
                        } else {
                            toast.error('Error al sincronizar abono: ' + error.message);
                        }
                    }
                } else {
                    queueMutation('debt_payments', 'INSERT', payment.id, payload);
                }
            }
        }
    },

    removeDebtPayment: async (debtId, paymentId) => {
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

        if (isSupabaseEnabled) {
            const user = (await supabase.auth.getUser()).data.user;
            if (user) {
                if (isOnline()) {
                    const { error } = await supabase.from('debt_payments').delete().eq('id', paymentId);
                    if (error) console.error('Supabase delete error (debt_payments):', sanitizeForLog(error));
                } else {
                    queueMutation('debt_payments', 'DELETE', paymentId);
                }
            }
        }
    },
});