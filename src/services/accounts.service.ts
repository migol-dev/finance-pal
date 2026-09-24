import { supabase } from '@/lib/supabase';
import { AppError, ErrorCodes } from '@/lib/app-error';
import type { Account } from '@/lib/finance';

// Capa de acceso a datos para cuentas. Funciones puras contra Supabase SDK.
// NO importar React, NO importar hooks, NO importar Zustand.

// Tipo de fila cruda de Supabase (antes de mapear a dominio).
export interface AccountRow {
  id: string;
  name: string;
  type: string;
  initial_balance: number | null;
  currency: string | null;
  denominations: unknown[] | null;
  clabe: string | null;
  bank: string | null;
  holder_name: string | null;
  user_id?: string;
  created_at?: string;
}

// Payload para INSERT en Supabase.
export interface AccountInsertPayload {
  id: string;
  user_id: string;
  name: string;
  type: string;
  initial_balance: number | undefined;
  currency: string | undefined;
  denominations: unknown[] | undefined;
  clabe: string | undefined;
  bank: string | undefined;
  holder_name: string | undefined;
}

export interface AccountUpdatePayload extends Partial<Omit<AccountInsertPayload, 'id' | 'user_id'>> {}

const ACCOUNT_COLS =
  'id, name, type, initial_balance, currency, denominations, clabe, bank, holder_name, created_at';

export function mapAccountFromDb(row: AccountRow): Account {
  return {
    id: row.id,
    name: row.name,
    type: row.type as Account['type'],
    initialBalance: Number(row.initial_balance ?? 0),
    currency: row.currency ?? undefined,
    denominations: (row.denominations ?? []) as Account['denominations'],
    clabe: row.clabe ?? undefined,
    bank: row.bank ?? undefined,
    holderName: row.holder_name ?? undefined,
  };
}

function toInsertPayload(userId: string, account: Account): AccountInsertPayload {
  return {
    id: account.id,
    user_id: userId,
    name: account.name,
    type: account.type,
    initial_balance: account.initialBalance,
    currency: account.currency,
    denominations: account.denominations as unknown[] | undefined,
    clabe: account.clabe,
    bank: account.bank,
    holder_name: account.holderName,
  };
}

function toUpdatePayload(patch: Partial<Account>): AccountUpdatePayload {
  const payload: AccountUpdatePayload = {};
  if ('name' in patch) payload.name = patch.name;
  if ('type' in patch) payload.type = patch.type;
  if ('initialBalance' in patch) payload.initial_balance = patch.initialBalance;
  if ('currency' in patch) payload.currency = patch.currency === undefined ? undefined : patch.currency;
  if ('denominations' in patch) payload.denominations = patch.denominations as unknown[] | undefined;
  if ('clabe' in patch) payload.clabe = patch.clabe;
  if ('bank' in patch) payload.bank = patch.bank;
  if ('holderName' in patch) payload.holder_name = patch.holderName;
  return payload;
}

export async function fetchAccounts(userId: string): Promise<Account[]> {
  const { data, error } = await supabase
    .from('accounts_safe')
    .select(ACCOUNT_COLS)
    .eq('user_id', userId)
    .order('created_at', { ascending: true });

  if (error) {
    throw new AppError(ErrorCodes.DB_QUERY_FAILED, 'Error fetching accounts', {
      originalError: error,
      context: { userId },
    });
  }
  return ((data ?? []) as AccountRow[]).map(mapAccountFromDb);
}

export async function insertAccount(userId: string, account: Account): Promise<void> {
  const { error } = await supabase.from('accounts').upsert(toInsertPayload(userId, account));
  if (error) {
    throw new AppError(ErrorCodes.DB_INSERT_FAILED, 'Error inserting account', {
      originalError: error,
      context: { userId, accountId: account.id },
    });
  }
}

export async function updateAccount(userId: string, id: string, patch: Partial<Account>): Promise<void> {
  const { error } = await supabase.from('accounts').update(toUpdatePayload(patch)).eq("id", id).eq("user_id", userId);
  if (error) {
    throw new AppError(ErrorCodes.DB_UPDATE_FAILED, 'Error updating account', {
      originalError: error,
      context: { accountId: id },
    });
  }
}

export async function deleteAccount(userId: string, id: string): Promise<void> {
  const { error } = await supabase.from('accounts').delete().eq("id", id).eq("user_id", userId);
  if (error) {
    throw new AppError(ErrorCodes.DB_DELETE_FAILED, 'Error deleting account', {
      originalError: error,
      context: { accountId: id },
    });
  }
}
