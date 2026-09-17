import { StateCreator } from 'zustand';
import { Goal, GoalFolder, Transaction, Account, ChangeLogEntry } from '@/lib/finance';
import { validateAndThrow, generateSecureId, logEntry, diffFields } from '@/lib/sanitizers';

export interface GoalSlice {
    goals: Goal[];
    goalFolders: GoalFolder[];

    addGoal: (g: Omit<Goal, 'id'>) => void;
    updateGoal: (id: string, p: Partial<Goal>) => void;
    removeGoal: (id: string) => void;
    contributeGoal: (id: string, amount: number, date?: string, accountId?: string) => void;

    addGoalFolder: (f: Omit<GoalFolder, 'id'>) => void;
    updateGoalFolder: (id: string, p: Partial<GoalFolder>) => void;
    removeGoalFolder: (id: string) => void;
    reorderGoalFolders: (folders: GoalFolder[]) => void;
}

type StoreState = GoalSlice & {
    accounts: Account[];
    transactions: Transaction[];
    changeLog: ChangeLogEntry[];
};

export const createGoalSlice: StateCreator<
    StoreState,
    [],
    [],
    GoalSlice
> = (set, get) => ({
    goals: [],
    goalFolders: [],

    addGoal: (g) => {
        const s = get();
        const nv = {
            ...g,
            id: generateSecureId(),
            createdAt: g.createdAt ?? new Date().toISOString(),
            contributions:
                g.contributions ??
                (g.saved > 0
                    ? [{ id: generateSecureId(), date: new Date().toISOString(), amount: g.saved }]
                    : []),
        } as Goal;

        validateAndThrow('goal', nv);

        const nextGoals = nv.pinned
            ? [nv, ...s.goals.map((x) => ({ ...x, pinned: false }))]
            : [nv, ...s.goals];

        set({
            goals: nextGoals,
            changeLog: [logEntry('goal', nv.id, 'create', `Creó meta "${nv.name}"`), ...s.changeLog].slice(0, 500),
        });
    },

    updateGoal: (idv, p) => {
        const s = get();
        const prev = s.goals.find((x) => x.id === idv);
        if (!prev) return;
        const ch = diffFields(prev, p);
        const merged = { ...prev, ...p };

        validateAndThrow('goal', merged);

        let nextGoals = s.goals.map((x) => (x.id === idv ? { ...x, ...p } : x));
        if (p.pinned === true) {
            nextGoals = nextGoals.map((x) => (x.id === idv ? { ...x, pinned: true } : { ...x, pinned: false }));
        }

        set({
            goals: nextGoals,
            changeLog: [logEntry('goal', idv, 'update', `Editó meta "${prev.name}"`, ch), ...s.changeLog].slice(0, 500),
        });
    },

    removeGoal: (idv) => {
        const s = get();
        const prev = s.goals.find((x) => x.id === idv);
        set({
            goals: s.goals.filter((x) => x.id !== idv),
            changeLog: [logEntry('goal', idv, 'delete', `Eliminó meta "${prev?.name ?? ''}"`), ...s.changeLog].slice(0, 500),
        });
    },

    contributeGoal: (idv, amount, date, accountId) =>
        set((s) => {
            const g = s.goals.find((x) => x.id === idv);
            const txId = generateSecureId();
            const when = date ?? new Date().toISOString();
            const entry = { id: generateSecureId(), date: when, amount };
            const method = s.accounts.find((a) => a.id === accountId)?.type === 'bank' ? 'transfer' : 'cash';

            return {
                goals: s.goals.map((x) =>
                    x.id === idv
                        ? {
                            ...x,
                            saved: Math.max(0, x.saved + amount),
                            contributions: [...(x.contributions ?? []), entry],
                        }
                        : x
                ),
                transactions: [
                    {
                        id: txId,
                        type: amount >= 0 ? 'saving' : 'income',
                        category: 'Meta',
                        concept: `${amount >= 0 ? 'Aporte' : 'Retiro'} ${g?.name ?? 'Meta'}`,
                        amount: Math.abs(amount),
                        date: when,
                        accountId,
                        paymentMethod: method,
                    },
                    ...s.transactions,
                ],
                changeLog: [
                    logEntry(
                        'goal',
                        idv,
                        'update',
                        `${amount >= 0 ? 'Aportó' : 'Retiró'} ${Math.abs(amount)} a "${g?.name ?? ''}"`,
                        [{ field: 'saved', from: g?.saved, to: (g?.saved ?? 0) + amount }]
                    ),
                    ...s.changeLog,
                ].slice(0, 500),
            };
        }),

    addGoalFolder: (f) => {
        const s = get();
        const nv = {
            ...f,
            id: generateSecureId(),
            createdAt: f.createdAt ?? new Date().toISOString(),
        } as GoalFolder;

        validateAndThrow('goalFolder', nv);

        set({
            goalFolders: [nv, ...s.goalFolders],
            changeLog: [logEntry('goal', nv.id, 'create', `Creó carpeta "${nv.name}"`), ...s.changeLog].slice(0, 500),
        });
    },

    updateGoalFolder: (idv, p) => {
        const s = get();
        const prev = s.goalFolders.find((x) => x.id === idv);
        if (!prev) return;
        const ch = diffFields(prev, p);
        const merged = { ...prev, ...p };

        validateAndThrow('goalFolder', merged);

        set({
            goalFolders: s.goalFolders.map((x) => (x.id === idv ? { ...x, ...p } : x)),
            changeLog: [logEntry('goal', idv, 'update', `Editó carpeta "${prev.name}"`, ch), ...s.changeLog].slice(0, 500),
        });
    },

    removeGoalFolder: (idv) => {
        const s = get();
        const prev = s.goalFolders.find((x) => x.id === idv);
        const nextGoals = s.goals.map((g) => (g.folderId === idv ? { ...g, folderId: undefined } : g));
        const childIds = s.goalFolders.filter((f) => f.parentId === idv).map((f) => f.id);
        const nextFolders = s.goalFolders.filter((x) => x.id !== idv && !childIds.includes(x.id));

        set({
            goalFolders: nextFolders,
            goals: nextGoals,
            changeLog: [logEntry('goal', idv, 'delete', `Eliminó carpeta "${prev?.name ?? ''}"`), ...s.changeLog].slice(0, 500),
        });
    },

    reorderGoalFolders: (folders) => set({ goalFolders: folders }),
});
