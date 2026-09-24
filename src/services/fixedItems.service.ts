import { supabase } from '@/lib/supabase';
import { AppError, ErrorCodes } from '@/lib/app-error';
import type { FixedItem } from '@/lib/finance';

// Capa de acceso a datos para items fijos. Funciones puras contra Supabase SDK.
// NO importar React, NO importar hooks, NO importar Zustand.

export interface FixedItemRow {
  id: string;
  type: string;
  category: string;
  concept: string;
  amount: number;
  frequency: string;
  active: boolean;
  note: string | null;
  start_date: string;
  end_date: string;
  priority: string;
  pay_day: number | null;
  pay_week_day: number | null;
  icon: FixedItem['icon'] | null;
  payment_method: string | null;
  account_id: string | null;
  user_id?: string;
  created_at?: string;
}

export interface FixedItemInsertPayload {
  id: string;
  user_id: string;
  type: string;
  category: string;
  concept: string;
  amount: number;
  frequency: string;
  active: boolean;
  note: string | undefined;
  start_date: string;
  end_date: string;
  priority: string;
  pay_day: number | undefined;
  pay_week_day: number | undefined;
  icon: FixedItem['icon'] | undefined;
  payment_method: string | undefined;
  account_id: string | undefined;
}

export interface FixedItemUpdatePayload
  extends Partial<Omit<FixedItemInsertPayload, 'id' | 'user_id'>> {}

const FIXED_COLS =
  'id, type, category, concept, amount, frequency, active, note, start_date, end_date, priority, pay_day, pay_week_day, icon, payment_method, account_id, created_at';

export function mapFixedItemFromDb(row: FixedItemRow): FixedItem {
  return {
    id: row.id,
    type: row.type as FixedItem['type'],
    category: row.category,
    concept: row.concept,
    amount: Number(row.amount),
    frequency: row.frequency as FixedItem['frequency'],
    active: row.active,
    note: row.note ?? undefined,
    startDate: row.start_date,
    endDate: row.end_date,
    priority: row.priority as FixedItem['priority'],
    payDay: row.pay_day ?? undefined,
    payWeekDay: row.pay_week_day ?? undefined,
    icon: row.icon ?? undefined,
    paymentMethod: (row.payment_method ?? undefined) as FixedItem['paymentMethod'],
    accountId: row.account_id ?? undefined,
  };
}

function toInsertPayload(userId: string, item: FixedItem): FixedItemInsertPayload {
  return {
    id: item.id,
    user_id: userId,
    type: item.type,
    category: item.category,
    concept: item.concept,
    amount: item.amount,
    frequency: item.frequency,
    active: item.active,
    note: item.note,
    start_date: item.startDate,
    end_date: item.endDate,
    priority: item.priority,
    pay_day: item.payDay,
    pay_week_day: item.payWeekDay,
    icon: item.icon,
    payment_method: item.paymentMethod,
    account_id: item.accountId,
  };
}

function toUpdatePayload(patch: Partial<FixedItem>): FixedItemUpdatePayload {
  const payload: FixedItemUpdatePayload = {};
  if ('type' in patch) payload.type = patch.type;
  if ('category' in patch) payload.category = patch.category;
  if ('concept' in patch) payload.concept = patch.concept;
  if ('amount' in patch) payload.amount = patch.amount;
  if ('frequency' in patch) payload.frequency = patch.frequency;
  if ('active' in patch) payload.active = patch.active;
  if ('note' in patch) payload.note = patch.note;
  if ('startDate' in patch) payload.start_date = patch.startDate;
  if ('endDate' in patch) payload.end_date = patch.endDate;
  if ('priority' in patch) payload.priority = patch.priority;
  if ('payDay' in patch) payload.pay_day = patch.payDay;
  if ('payWeekDay' in patch) payload.pay_week_day = patch.payWeekDay;
  if ('icon' in patch) payload.icon = patch.icon;
  if ('paymentMethod' in patch) payload.payment_method = patch.paymentMethod;
  if ('accountId' in patch) payload.account_id = patch.accountId;
  return payload;
}

export async function fetchFixedItems(userId: string): Promise<FixedItem[]> {
  const { data, error } = await supabase
    .from('fixed_items')
    .select(FIXED_COLS)
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) {
    throw new AppError(ErrorCodes.DB_QUERY_FAILED, 'Error fetching fixed items', {
      originalError: error,
      context: { userId },
    });
  }
  return ((data ?? []) as FixedItemRow[]).map(mapFixedItemFromDb);
}

export async function insertFixedItem(userId: string, item: FixedItem): Promise<void> {
  const { error } = await supabase.from('fixed_items').upsert(toInsertPayload(userId, item));
  if (error) {
    throw new AppError(ErrorCodes.DB_INSERT_FAILED, 'Error inserting fixed item', {
      originalError: error,
      context: { userId, fixedItemId: item.id },
    });
  }
}

export async function updateFixedItem(userId: string, id: string, patch: Partial<FixedItem>): Promise<void> {
  const { error } = await supabase.from('fixed_items').update(toUpdatePayload(patch)).eq("id", id).eq("user_id", userId);
  if (error) {
    throw new AppError(ErrorCodes.DB_UPDATE_FAILED, 'Error updating fixed item', {
      originalError: error,
      context: { fixedItemId: id },
    });
  }
}

export async function deleteFixedItem(userId: string, id: string): Promise<void> {
  const { error } = await supabase.from('fixed_items').delete().eq("id", id).eq("user_id", userId);
  if (error) {
    throw new AppError(ErrorCodes.DB_DELETE_FAILED, 'Error deleting fixed item', {
      originalError: error,
      context: { fixedItemId: id },
    });
  }
}

export async function toggleFixedItemActive(id: string, active: boolean): Promise<void> {
  const { error } = await supabase.from('fixed_items').update({ active }).eq("id", id).eq("user_id", userId);
  if (error) {
    throw new AppError(ErrorCodes.DB_UPDATE_FAILED, 'Error toggling fixed item', {
      originalError: error,
      context: { fixedItemId: id, active },
    });
  }
}
