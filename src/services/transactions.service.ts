import { supabase } from '@/lib/supabase';
import { AppError, ErrorCodes } from '@/lib/app-error';
import type { Transaction } from '@/lib/finance';

// Capa de acceso a datos para transacciones. Funciones puras contra Supabase SDK.
// NO importar React, NO importar hooks, NO importar Zustand.

export interface TransactionRow {
  id: string;
  type: string;
  category: string;
  concept: string;
  amount: number;
  date: string;
  note: string | null;
  icon: Transaction['icon'] | null;
  payment_method: string | null;
  fixed_id: string | null;
  account_id: string | null;
  transfer_to_account_id: string | null;
  external_payee: Transaction['externalPayee'] | null;
  receipt: string | null;
  user_id?: string;
  created_at?: string;
}

export interface TransactionInsertPayload {
  id: string;
  user_id: string;
  type: string;
  category: string;
  concept: string;
  amount: number;
  date: string;
  note: string | undefined;
  icon: Transaction['icon'] | undefined;
  payment_method: string | undefined;
  fixed_id: string | undefined;
  account_id: string | undefined;
  transfer_to_account_id: string | undefined;
  external_payee: Transaction['externalPayee'] | undefined;
  receipt: string | undefined;
}

export interface TransactionUpdatePayload
  extends Partial<Omit<TransactionInsertPayload, 'id' | 'user_id'>> {}

const TX_COLS =
  'id, type, category, concept, amount, date, note, icon, payment_method, fixed_id, account_id, transfer_to_account_id, external_payee, receipt';

export function mapTransactionFromDb(row: TransactionRow): Transaction {
  return {
    id: row.id,
    type: row.type as Transaction['type'],
    category: row.category,
    concept: row.concept,
    amount: Number(row.amount),
    date: row.date,
    note: row.note ?? undefined,
    icon: row.icon ?? undefined,
    paymentMethod: (row.payment_method ?? undefined) as Transaction['paymentMethod'],
    fixedId: row.fixed_id ?? undefined,
    accountId: row.account_id ?? undefined,
    transferToAccountId: row.transfer_to_account_id ?? undefined,
    externalPayee: row.external_payee ?? undefined,
    receipt: row.receipt ?? undefined,
  };
}

function toInsertPayload(userId: string, tx: Transaction): TransactionInsertPayload {
  return {
    id: tx.id,
    user_id: userId,
    type: tx.type,
    category: tx.category,
    concept: tx.concept,
    amount: tx.amount,
    date: tx.date,
    note: tx.note,
    icon: tx.icon,
    payment_method: tx.paymentMethod,
    fixed_id: tx.fixedId,
    account_id: tx.accountId,
    transfer_to_account_id: tx.transferToAccountId,
    external_payee: tx.externalPayee,
    receipt: tx.receipt,
  };
}

function toUpdatePayload(patch: Partial<Transaction>): TransactionUpdatePayload {
  const payload: TransactionUpdatePayload = {};
  if ('type' in patch) payload.type = patch.type;
  if ('category' in patch) payload.category = patch.category;
  if ('concept' in patch) payload.concept = patch.concept;
  if ('amount' in patch) payload.amount = patch.amount;
  if ('date' in patch) payload.date = patch.date;
  if ('note' in patch) payload.note = patch.note;
  if ('icon' in patch) payload.icon = patch.icon;
  if ('paymentMethod' in patch) payload.payment_method = patch.paymentMethod;
  if ('fixedId' in patch) payload.fixed_id = patch.fixedId;
  if ('accountId' in patch) payload.account_id = patch.accountId;
  if ('transferToAccountId' in patch) payload.transfer_to_account_id = patch.transferToAccountId;
  if ('externalPayee' in patch) payload.external_payee = patch.externalPayee;
  if ('receipt' in patch) payload.receipt = patch.receipt;
  return payload;
}

export async function fetchTransactions(userId: string): Promise<Transaction[]> {
  const { data, error } = await supabase
    .from('transactions_safe')
    .select(TX_COLS)
    .eq('user_id', userId)
    .order('date', { ascending: false });

  if (error) {
    throw new AppError(ErrorCodes.DB_QUERY_FAILED, 'Error fetching transactions', {
      originalError: error,
      context: { userId },
    });
  }
  return ((data ?? []) as TransactionRow[]).map(mapTransactionFromDb);
}

export async function insertTransaction(userId: string, tx: Transaction): Promise<void> {
  const { error } = await supabase.from('transactions').upsert(toInsertPayload(userId, tx));
  if (error) {
    throw new AppError(ErrorCodes.DB_INSERT_FAILED, 'Error inserting transaction', {
      originalError: error,
      context: { userId, transactionId: tx.id },
    });
  }
}

export async function updateTransaction(userId: string, id: string, patch: Partial<Transaction>): Promise<void> {
  const { error } = await supabase.from('transactions').update(toUpdatePayload(patch)).eq("id", id).eq("user_id", userId);
  if (error) {
    throw new AppError(ErrorCodes.DB_UPDATE_FAILED, 'Error updating transaction', {
      originalError: error,
      context: { transactionId: id },
    });
  }
}

export async function deleteTransaction(userId: string, id: string): Promise<void> {
  const { error } = await supabase.from('transactions').delete().eq("id", id).eq("user_id", userId);
  if (error) {
    throw new AppError(ErrorCodes.DB_DELETE_FAILED, 'Error deleting transaction', {
      originalError: error,
      context: { transactionId: id },
    });
  }
}
