import { StateCreator } from 'zustand';
import { Account, Transaction } from '@/lib/finance';
import { validateAndThrow, generateSecureId } from '@/lib/sanitizers';

export interface AccountSlice {
  accounts: Account[];
  addAccount: (a: Account) => void;
  updateAccount: (id: string, p: Partial<Account>) => void;
  removeAccount: (id: string) => void;
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

  addAccount: (a) => {
    const s = get();
    if (a.type === 'cash' && s.accounts.some((x) => x.type === 'cash')) {
      return;
    }
    const nv = { ...a } as Account;

    validateAndThrow('account', nv);

    set((state) => ({ accounts: [nv, ...state.accounts] }));
  },

  updateAccount: (idv, p) => {
    const s = get();
    const prev = s.accounts.find((x) => x.id === idv);
    if (!prev) return;

    set((state) => ({
      accounts: state.accounts.map((x) => (x.id === idv ? { ...x, ...p } : x)),
    }));
  },

  removeAccount: (idv) => {
    set((state) => ({
      accounts: state.accounts.filter((x) => x.id !== idv),
    }));
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
