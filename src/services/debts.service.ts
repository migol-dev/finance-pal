import { supabase } from '@/lib/supabase';
import { AppError, ErrorCodes } from '@/lib/app-error';
import type { Debt, DebtPayment } from '@/lib/finance';

// Capa de acceso a datos para deudas. Funciones puras contra Supabase SDK.
// NO importar React, NO importar hooks, NO importar Zustand.

export interface DebtPaymentRow {
  id: string;
  amount: number;
  date: string;
  note: string | null;
  payment_method: string | null;
  account_id: string | null;
  transfer_to_account_id?: string | null;
  external_payee?: DebtPayment['externalPayee'] | null;
  receipt_url?: string | null;
}

export interface DebtRow {
  id: string;
  person: string;
  concept: string;
  amount: number;
  date: string;
  due_date: string | null;
  note: string | null;
  icon: Debt['icon'] | null;
  account_id: string | null;
  payments: DebtPaymentRow[] | null;
  user_id?: string;
  created_at?: string;
}

export interface DebtInsertPayload {
  id: string;
  user_id: string;
  person: string;
  concept: string;
  amount: number;
  date: string;
  due_date: string | undefined;
  note: string | undefined;
  icon: Debt['icon'] | undefined;
  account_id: string | undefined;
}

export interface DebtUpdatePayload extends Partial<Omit<DebtInsertPayload, 'id' | 'user_id'>> {}

export interface DebtPaymentInsertPayload {
  id: string;
  user_id: string;
  debt_id: string;
  amount: number;
  date: string;
  note: string | undefined;
  payment_method: string | undefined;
  account_id: string | undefined;
  transfer_to_account_id: string | undefined;
  external_payee: DebtPayment['externalPayee'] | undefined;
  receipt_url: string | undefined;
}

const DEBT_COLS =
  'id, person, concept, amount, date, due_date, note, icon, account_id, created_at, payments:debt_payments_safe(id, amount, date, note, payment_method, account_id)';

export function mapDebtPaymentFromDb(row: DebtPaymentRow): DebtPayment {
  return {
    id: row.id,
    amount: Number(row.amount),
    date: row.date,
    note: row.note ?? undefined,
    paymentMethod: (row.payment_method ?? undefined) as DebtPayment['paymentMethod'],
    accountId: row.account_id ?? undefined,
    transferToAccountId: row.transfer_to_account_id ?? undefined,
    externalPayee: row.external_payee ?? undefined,
    receipt: row.receipt_url ?? undefined,
  };
}

export function mapDebtFromDb(row: DebtRow): Debt {
  return {
    id: row.id,
    person: row.person,
    concept: row.concept,
    amount: Number(row.amount),
    date: row.date,
    dueDate: row.due_date ?? undefined,
    note: row.note ?? undefined,
    icon: row.icon ?? undefined,
    payments: (row.payments ?? []).map(mapDebtPaymentFromDb),
    accountId: row.account_id ?? undefined,
  };
}

function toInsertPayload(userId: string, debt: Debt): DebtInsertPayload {
  return {
    id: debt.id,
    user_id: userId,
    person: debt.person,
    concept: debt.concept,
    amount: debt.amount,
    date: debt.date,
    due_date: debt.dueDate,
    note: debt.note,
    icon: debt.icon,
    account_id: debt.accountId,
  };
}

function toUpdatePayload(patch: Partial<Debt>): DebtUpdatePayload {
  const payload: DebtUpdatePayload = {};
  if ('person' in patch) payload.person = patch.person;
  if ('concept' in patch) payload.concept = patch.concept;
  if ('amount' in patch) payload.amount = patch.amount;
  if ('date' in patch) payload.date = patch.date;
  if ('dueDate' in patch) payload.due_date = patch.dueDate;
  if ('note' in patch) payload.note = patch.note;
  if ('icon' in patch) payload.icon = patch.icon;
  if ('accountId' in patch) payload.account_id = patch.accountId;
  return payload;
}

export async function fetchDebts(userId: string): Promise<Debt[]> {
  const { data, error } = await supabase
    .from('debts')
    .select(DEBT_COLS)
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) {
    throw new AppError(ErrorCodes.DB_QUERY_FAILED, 'Error fetching debts', {
      originalError: error,
      context: { userId },
    });
  }
  return ((data ?? []) as DebtRow[]).map(mapDebtFromDb);
}

export async function insertDebt(userId: string, debt: Debt): Promise<void> {
  const { error } = await supabase.from('debts').upsert(toInsertPayload(userId, debt));
  if (error) {
    throw new AppError(ErrorCodes.DB_INSERT_FAILED, 'Error inserting debt', {
      originalError: error,
      context: { userId, debtId: debt.id },
    });
  }
}

export async function updateDebt(id: string, patch: Partial<Debt>): Promise<void> {
  const { error } = await supabase.from('debts').update(toUpdatePayload(patch)).eq('id', id);
  if (error) {
    throw new AppError(ErrorCodes.DB_UPDATE_FAILED, 'Error updating debt', {
      originalError: error,
      context: { debtId: id },
    });
  }
}

export async function deleteDebt(id: string): Promise<void> {
  const { error } = await supabase.from('debts').delete().eq('id', id);
  if (error) {
    throw new AppError(ErrorCodes.DB_DELETE_FAILED, 'Error deleting debt', {
      originalError: error,
      context: { debtId: id },
    });
  }
}

export async function insertDebtPayment(
  userId: string,
  debtId: string,
  payment: DebtPayment,
): Promise<void> {
  const payload = {
    id: payment.id,
    debt_id: debtId,
    user_id: userId,
    amount: payment.amount,
    date: payment.date,
    payment_method: payment.paymentMethod,
    account_id: payment.accountId,
    transfer_to_account_id: payment.transferToAccountId,
    external_payee: payment.externalPayee,
    receipt_url: payment.receipt,
    note: payment.note,
  };

  // Safe table vs standard table mapping?
  // According to `deleteDebtPayment` it's 'debt_payments'.
  const { error } = await supabase.from('debt_payments').upsert(payload);

  if (error) {
    throw new AppError(ErrorCodes.DB_INSERT_FAILED, 'Error inserting debt payment', {
      originalError: error,
      context: { userId, debtId, paymentId: payment.id },
    });
  }
}

export async function deleteDebtPayment(paymentId: string): Promise<void> {
  const { error } = await supabase.from('debt_payments').delete().eq('id', paymentId);
  if (error) {
    throw new AppError(ErrorCodes.DB_DELETE_FAILED, 'Error deleting debt payment', {
      originalError: error,
      context: { paymentId },
    });
  }
}
