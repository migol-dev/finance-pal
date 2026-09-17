import { StateCreator } from 'zustand';
import { FixedItem, Transaction, ChangeLogEntry, parseDateLocal } from '@/lib/finance';
import { generateSecureId, logEntry, diffFields } from '@/lib/sanitizers';

export interface FixedSlice {
    fixedItems: FixedItem[];
    addFixed: (i: Omit<FixedItem, 'id'>) => void;
    updateFixed: (id: string, p: Partial<FixedItem>) => void;
    removeFixed: (id: string) => void;
    toggleFixed: (id: string) => void;
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

    addFixed: (i) => {
        const nv = { ...i, id: generateSecureId() } as FixedItem;
        set((s) => ({
            fixedItems: [nv, ...s.fixedItems],
            changeLog: [logEntry('fixed', nv.id, 'create', `Creó concepto fijo "${nv.concept}"`), ...s.changeLog].slice(0, 500),
        }));
    },

    updateFixed: (idv, p) => {
        const s = get();
        const prev = s.fixedItems.find((x) => x.id === idv);
        if (!prev) return;
        const ch = diffFields(prev, p);
        set((st) => ({
            fixedItems: st.fixedItems.map((x) => (x.id === idv ? { ...x, ...p } : x)),
            changeLog: [logEntry('fixed', idv, 'update', `Editó "${prev.concept}"`, ch), ...st.changeLog].slice(0, 500),
        }));
    },

    removeFixed: (idv) => {
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
    },

    toggleFixed: (idv) => {
        const s = get();
        const prev = s.fixedItems.find((x) => x.id === idv);
        if (!prev) return;
        set((st) => ({
            fixedItems: st.fixedItems.map((x) => (x.id === idv ? { ...x, active: !x.active } : x)),
            changeLog: [
                logEntry('fixed', idv, 'update', `${prev.active ? 'Pausó' : 'Activó'} "${prev.concept}"`, [
                    { field: 'active', from: prev.active, to: !prev.active },
                ]),
                ...st.changeLog,
            ].slice(0, 500),
        }));
    },
});
