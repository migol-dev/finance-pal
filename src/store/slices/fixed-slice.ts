import { StateCreator } from 'zustand';
import { FixedItem, Transaction, ChangeLogEntry, parseDateLocal } from '@/lib/finance';
import { supabase, isSupabaseEnabled } from '@/lib/supabase';
import { generateSecureId, logEntry, diffFields } from '@/lib/sanitizers';
import { sanitizeForLog } from '@/lib/validators';
import { useSyncStore } from '@/store/sync-store';

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

export interface FixedSlice {
    fixedItems: FixedItem[];
    addFixed: (i: Omit<FixedItem, 'id'>) => Promise<void>;
    updateFixed: (id: string, p: Partial<FixedItem>) => Promise<void>;
    removeFixed: (id: string) => Promise<void>;
    toggleFixed: (id: string) => Promise<void>;
}

type StoreState = FixedSlice & {
    transactions: Transaction[];
    changeLog: ChangeLogEntry[];
};

export const createFixedSlice: StateCreator<
    StoreState,
    [],
    [],
    FixedSlice
> = (set, get) => ({
    fixedItems: [],

    addFixed: async (i) => {
        const nv = { ...i, id: generateSecureId() } as FixedItem;
        set((s) => ({
            fixedItems: [nv, ...s.fixedItems],
            changeLog: [logEntry('fixed', nv.id, 'create', `Creó concepto fijo "${nv.concept}"`), ...s.changeLog].slice(0, 500),
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
                    frequency: nv.frequency,
                    active: nv.active,
                    note: nv.note,
                    start_date: nv.startDate,
                    end_date: nv.endDate,
                    priority: nv.priority,
                    pay_day: nv.payDay,
                    pay_week_day: nv.payWeekDay,
                    icon: nv.icon,
                    payment_method: nv.paymentMethod,
                    account_id: nv.accountId,
                };
                if (isOnline()) {
                    const { error } = await supabase.from('fixed_items').insert(payload);
                    if (error) console.error('Supabase insert error (fixed_items):', sanitizeForLog(error));
                } else {
                    queueMutation('fixed_items', 'INSERT', nv.id, payload);
                }
            }
        }
    },

    updateFixed: async (idv, p) => {
        const s = get();
        const prev = s.fixedItems.find((x) => x.id === idv);
        if (!prev) return;
        const ch = diffFields(prev, p);
        set((st) => ({
            fixedItems: st.fixedItems.map((x) => (x.id === idv ? { ...x, ...p } : x)),
            changeLog: [logEntry('fixed', idv, 'update', `Editó "${prev.concept}"`, ch), ...st.changeLog].slice(0, 500),
        }));

        // Sync to Supabase
        if (isSupabaseEnabled) {
            const user = (await supabase.auth.getUser()).data.user;
            if (user) {
                const payload: Record<string, unknown> = {};
                if ('type' in p) payload.type = p.type;
                if ('category' in p) payload.category = p.category;
                if ('concept' in p) payload.concept = p.concept;
                if ('amount' in p) payload.amount = p.amount;
                if ('frequency' in p) payload.frequency = p.frequency;
                if ('active' in p) payload.active = p.active;
                if ('note' in p) payload.note = p.note === undefined ? null : p.note;
                if ('startDate' in p) payload.start_date = p.startDate;
                if ('endDate' in p) payload.end_date = p.endDate;
                if ('priority' in p) payload.priority = p.priority;
                if ('payDay' in p) payload.pay_day = p.payDay === undefined ? null : p.payDay;
                if ('payWeekDay' in p) payload.pay_week_day = p.payWeekDay === undefined ? null : p.payWeekDay;
                if ('icon' in p) payload.icon = p.icon === undefined ? null : p.icon;
                if ('paymentMethod' in p) payload.payment_method = p.paymentMethod;
                if ('accountId' in p) payload.account_id = p.accountId === undefined ? null : p.accountId;
                if (isOnline()) {
                    const { error } = await supabase.from('fixed_items').update(payload).eq('id', idv);
                    if (error) console.error('Supabase update error (fixed_items):', sanitizeForLog(error));
                } else {
                    queueMutation('fixed_items', 'UPDATE', idv, payload);
                }
            }
        }
    },

    removeFixed: async (idv) => {
        const s = get();
        const prev = s.fixedItems.find((x) => x.id === idv);
        // Also remove today's automatically created transaction for this fixed item (but keep historical ones)
        const pad = (n: number) => String(n).padStart(2, '0');
        const today = new Date();
        const todayISO = `${today.getFullYear()}-${pad(today.getMonth() + 1)}-${pad(today.getDate())}`;
        const remainingTx = s.transactions.filter((t) => {
            if (t.fixedId !== idv) return true;
            const td = parseDateLocal(t.date ?? '');
            const tISO = `${td.getFullYear()}-${pad(td.getMonth() + 1)}-${pad(td.getDate())}`;
            // keep transaction unless it's for today
            return tISO !== todayISO;
        });
        set({
            fixedItems: s.fixedItems.filter((x) => x.id !== idv),
            transactions: remainingTx,
            changeLog: [logEntry('fixed', idv, 'delete', `Eliminó "${prev?.concept ?? 'concepto'}"`), ...s.changeLog].slice(0, 500),
        });

        // Sync to Supabase
        if (isSupabaseEnabled) {
            const user = (await supabase.auth.getUser()).data.user;
            if (user) {
                if (isOnline()) {
                    const { error } = await supabase.from('fixed_items').delete().eq('id', idv);
                    if (error) console.error('Supabase delete error (fixed_items):', sanitizeForLog(error));
                } else {
                    queueMutation('fixed_items', 'DELETE', idv);
                }
            }
        }
    },

    toggleFixed: async (idv) => {
        const s = get();
        const prev = s.fixedItems.find((x) => x.id === idv);
        if (!prev) return;
        const nextActive = !prev.active;
        set((st) => ({
            fixedItems: st.fixedItems.map((x) => (x.id === idv ? { ...x, active: !x.active } : x)),
            changeLog: [
                logEntry('fixed', idv, 'update', `${prev.active ? 'Pausó' : 'Activó'} "${prev.concept}"`, [
                    { field: 'active', from: prev.active, to: !prev.active },
                ]),
                ...st.changeLog,
            ].slice(0, 500),
        }));

        // Sync to Supabase
        if (isSupabaseEnabled) {
            const user = (await supabase.auth.getUser()).data.user;
            if (user) {
                const payload: Record<string, unknown> = { active: nextActive };
                if (isOnline()) {
                    const { error } = await supabase.from('fixed_items').update(payload).eq('id', idv);
                    if (error) console.error('Supabase update error (fixed_items):', sanitizeForLog(error));
                } else {
                    queueMutation('fixed_items', 'UPDATE', idv, payload);
                }
            }
        }
    },
});
