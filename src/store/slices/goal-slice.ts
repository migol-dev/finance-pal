import { StateCreator } from 'zustand';
import { Goal, GoalFolder, Transaction, Account, ChangeLogEntry } from '@/lib/finance';
import { supabase, isSupabaseEnabled } from '@/lib/supabase';
import { validateAndThrow, generateSecureId, logEntry, diffFields } from '@/lib/sanitizers';
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

export interface GoalSlice {
    goals: Goal[];
    goalFolders: GoalFolder[];

    addGoal: (g: Omit<Goal, 'id'>) => Promise<void>;
    updateGoal: (id: string, p: Partial<Goal>) => Promise<void>;
    removeGoal: (id: string) => Promise<void>;
    contributeGoal: (id: string, amount: number, date?: string, accountId?: string) => void;

    addGoalFolder: (f: Omit<GoalFolder, 'id'>) => Promise<void>;
    updateGoalFolder: (id: string, p: Partial<GoalFolder>) => Promise<void>;
    removeGoalFolder: (id: string) => Promise<void>;
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

    addGoal: async (g) => {
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

        if (isSupabaseEnabled) {
            const user = (await supabase.auth.getUser()).data.user;
            if (user) {
                const payload = {
                    id: nv.id,
                    user_id: user.id,
                    name: nv.name,
                    target: nv.target,
                    saved: nv.saved,
                    emoji: nv.emoji,
                    color: nv.color,
                    deadline: nv.deadline,
                    icon: nv.icon,
                    purchase_url: nv.purchaseUrl,
                    contributions: nv.contributions,
                    pinned: nv.pinned,
                    folder_id: nv.folderId,
                };
                if (isOnline()) {
                    const { error } = await supabase.from('goals').insert(payload);
                    if (error) console.error('Supabase insert error (goals):', sanitizeForLog(error));
                } else {
                    queueMutation('goals', 'INSERT', nv.id, payload);
                }
            }
        }
    },

    updateGoal: async (idv, p) => {
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

        if (isSupabaseEnabled) {
            const user = (await supabase.auth.getUser()).data.user;
            if (user) {
                const payload: Record<string, unknown> = {};
                if ('name' in p) payload.name = p.name;
                if ('target' in p) payload.target = p.target;
                if ('saved' in p) payload.saved = p.saved;
                if ('emoji' in p) payload.emoji = p.emoji;
                if ('color' in p) payload.color = p.color;
                if ('deadline' in p) payload.deadline = p.deadline === undefined ? null : p.deadline;
                if ('icon' in p) payload.icon = p.icon === undefined ? null : p.icon;
                if ('purchaseUrl' in p) payload.purchase_url = p.purchaseUrl === undefined ? null : p.purchaseUrl;
                if ('contributions' in p) payload.contributions = p.contributions === undefined ? null : p.contributions;
                if ('pinned' in p) payload.pinned = p.pinned === undefined ? null : p.pinned;
                if ('folderId' in p) payload.folder_id = p.folderId === undefined ? null : p.folderId;

                if (isOnline()) {
                    const { error } = await supabase.from('goals').update(payload).eq('id', idv);
                    if (error) console.error('Supabase update error (goals):', sanitizeForLog(error));
                } else {
                    queueMutation('goals', 'UPDATE', idv, payload);
                }
            }
        }
    },

    removeGoal: async (idv) => {
        const s = get();
        const prev = s.goals.find((x) => x.id === idv);
        set({
            goals: s.goals.filter((x) => x.id !== idv),
            changeLog: [logEntry('goal', idv, 'delete', `Eliminó meta "${prev?.name ?? ''}"`), ...s.changeLog].slice(0, 500),
        });

        if (isSupabaseEnabled) {
            const user = (await supabase.auth.getUser()).data.user;
            if (user) {
                if (isOnline()) {
                    const { error } = await supabase.from('goals').delete().eq('id', idv);
                    if (error) console.error('Supabase delete error (goals):', sanitizeForLog(error));
                } else {
                    queueMutation('goals', 'DELETE', idv);
                }
            }
        }
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

    addGoalFolder: async (f) => {
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

        if (isSupabaseEnabled) {
            const user = (await supabase.auth.getUser()).data.user;
            if (user) {
                const payload = {
                    id: nv.id,
                    user_id: user.id,
                    name: nv.name,
                    color: nv.color,
                    icon: nv.icon,
                    parent_id: nv.parentId,
                    order: nv.order,
                };
                if (isOnline()) {
                    const { error } = await supabase.from('goal_folders').insert(payload);
                    if (error) console.error('Supabase insert error (goal_folders):', sanitizeForLog(error));
                } else {
                    queueMutation('goal_folders', 'INSERT', nv.id, payload);
                }
            }
        }
    },

    updateGoalFolder: async (idv, p) => {
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

        if (isSupabaseEnabled) {
            const user = (await supabase.auth.getUser()).data.user;
            if (user) {
                const payload: Record<string, unknown> = {};
                if ('name' in p) payload.name = p.name;
                if ('color' in p) payload.color = p.color;
                if ('icon' in p) payload.icon = p.icon === undefined ? null : p.icon;
                if ('parentId' in p) payload.parent_id = p.parentId === undefined ? null : p.parentId;
                if ('order' in p) payload.order = p.order;

                if (isOnline()) {
                    const { error } = await supabase.from('goal_folders').update(payload).eq('id', idv);
                    if (error) console.error('Supabase update error (goal_folders):', sanitizeForLog(error));
                } else {
                    queueMutation('goal_folders', 'UPDATE', idv, payload);
                }
            }
        }
    },

    removeGoalFolder: async (idv) => {
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

        if (isSupabaseEnabled) {
            const user = (await supabase.auth.getUser()).data.user;
            if (user) {
                if (isOnline()) {
                    const { error } = await supabase.from('goal_folders').delete().eq('id', idv);
                    if (error) console.error('Supabase delete error (goal_folders):', sanitizeForLog(error));
                } else {
                    queueMutation('goal_folders', 'DELETE', idv);
                }
            }
        }
    },

    reorderGoalFolders: (folders) => set({ goalFolders: folders }),
});