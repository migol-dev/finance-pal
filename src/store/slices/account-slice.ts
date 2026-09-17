import { StateCreator } from 'zustand';
import { Account, Transaction } from '@/lib/finance';
import { supabase, isSupabaseEnabled } from '@/lib/supabase';
import { validateAndThrow, generateSecureId } from '@/lib/sanitizers';
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

export interface AccountSlice {
  accounts: Account[];
  addAccount: (a: Omit<Account, 'id'>) => Promise<void>;
  updateAccount: (id: string, p: Partial<Account>) => Promise<void>;
  removeAccount: (id: string) => Promise<void>;
  mergeAccounts: (fromIds: string[], intoId: string) => void;
}

// Interfaz combinada temporal para permitir que mergeAccounts acceda a transactions
type StoreState = AccountSlice & { transactions: Transaction[] };

export const createAccountSlice: StateCreator<
  StoreState,
  [],
  [],
  AccountSlice
> = (set, get) => ({
  accounts: [
    { id: generateSecureId(), name: 'Efectivo', type: 'cash', initialBalance: 0, denominations: [] },
    { id: generateSecureId(), name: 'Cuenta 1', type: 'bank', initialBalance: 0 },
  ],

  addAccount: async (a) => {
    const s = get();
    if (a.type === 'cash' && s.accounts.some((x) => x.type === 'cash')) {
      return;
    }
    const nv = { ...a, id: generateSecureId() } as Account;

    validateAndThrow('account', nv);

    set((state) => ({ accounts: [nv, ...state.accounts] }));

    if (isSupabaseEnabled) {
      const user = (await supabase.auth.getUser()).data.user;
      if (user) {
        const payload = {
          id: nv.id,
          user_id: user.id,
          name: nv.name,
          type: nv.type,
          initial_balance: nv.initialBalance,
          currency: nv.currency,
          denominations: nv.denominations,
          clabe: nv.clabe,
          bank: nv.bank,
          holder_name: nv.holderName,
        };

        if (isOnline()) {
          const { error } = await supabase.from('accounts').insert(payload);
          if (error) console.error('Supabase insert error (accounts):', sanitizeForLog(error));
        } else {
          queueMutation('accounts', 'INSERT', nv.id, payload);
        }
      }
    }
  },

  updateAccount: async (idv, p) => {
    const s = get();
    const prev = s.accounts.find((x) => x.id === idv);
    if (!prev) return;

    set((state) => ({
      accounts: state.accounts.map((x) => (x.id === idv ? { ...x, ...p } : x)),
    }));

    if (isSupabaseEnabled) {
      const user = (await supabase.auth.getUser()).data.user;
      if (user) {
        const payload: Record<string, unknown> = {};
        if ('name' in p) payload.name = p.name;
        if ('type' in p) payload.type = p.type;
        if ('initialBalance' in p) payload.initial_balance = p.initialBalance;
        if ('currency' in p) payload.currency = p.currency === undefined ? null : p.currency;
        if ('denominations' in p) payload.denominations = p.denominations;
        if ('clabe' in p) payload.clabe = p.clabe === undefined ? null : p.clabe;
        if ('bank' in p) payload.bank = p.bank === undefined ? null : p.bank;
        if ('holderName' in p) payload.holder_name = p.holderName === undefined ? null : p.holderName;

        if (isOnline()) {
          const { error } = await supabase.from('accounts').update(payload).eq('id', idv);
          if (error) console.error('Supabase update error (accounts):', sanitizeForLog(error));
        } else {
          queueMutation('accounts', 'UPDATE', idv, payload);
        }
      }
    }
  },

  removeAccount: async (idv) => {
    set((state) => ({
      accounts: state.accounts.filter((x) => x.id !== idv),
    }));

    if (isSupabaseEnabled) {
      const user = (await supabase.auth.getUser()).data.user;
      if (user) {
        if (isOnline()) {
          const { error } = await supabase.from('accounts').delete().eq('id', idv);
          if (error) console.error('Supabase delete error (accounts):', sanitizeForLog(error));
        } else {
          queueMutation('accounts', 'DELETE', idv);
        }
      }
    }
  },

  mergeAccounts: (fromIds, intoId) => {
    set((state) => ({
      transactions: state.transactions.map((t) =>
        fromIds.includes(t.accountId ?? '') ? { ...t, accountId: intoId } : t
      ),
      accounts: state.accounts.filter((a) => !fromIds.includes(a.id) || a.id === intoId),
    }));
  },
});
