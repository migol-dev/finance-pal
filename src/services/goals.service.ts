import { supabase } from '@/lib/supabase';
import { AppError, ErrorCodes } from '@/lib/app-error';
import type { Goal, Transaction } from '@/lib/finance';
import { insertTransaction } from '@/services/transactions.service';

// Capa de acceso a datos para metas. Funciones puras contra Supabase SDK.
// NO importar React, NO importar hooks, NO importar Zustand.

export interface GoalContributionRow {
  id: string;
  date: string;
  amount: number;
}

export interface GoalRow {
  id: string;
  name: string;
  target: number;
  saved: number | null;
  emoji: string;
  color: string;
  deadline: string | null;
  icon: Goal['icon'] | null;
  purchase_url: string | null;
  contributions: GoalContributionRow[] | null;
  pinned: boolean | null;
  folder_id: string | null;
  user_id?: string;
  created_at?: string;
}

export interface GoalInsertPayload {
  id: string;
  user_id: string;
  name: string;
  target: number;
  saved: number;
  emoji: string;
  color: string;
  deadline: string | undefined;
  icon: Goal['icon'] | undefined;
  purchase_url: string | undefined;
  contributions: GoalContributionRow[] | undefined;
  pinned: boolean | undefined;
  folder_id: string | undefined;
}

export interface GoalUpdatePayload extends Partial<Omit<GoalInsertPayload, 'id' | 'user_id'>> {}

export interface GoalContributionInput {
  amount: number;
  date?: string;
  accountId?: string;
  goalName?: string;
  txId?: string;
}

const GOAL_COLS =
  'id, name, target, saved, emoji, color, deadline, icon, purchase_url, contributions, pinned, folder_id, created_at';

export function mapGoalFromDb(row: GoalRow): Goal {
  return {
    id: row.id,
    name: row.name,
    target: Number(row.target),
    saved: Number(row.saved ?? 0),
    emoji: row.emoji,
    color: row.color,
    deadline: row.deadline ?? undefined,
    icon: row.icon ?? undefined,
    purchaseUrl: row.purchase_url ?? undefined,
    contributions: row.contributions ?? [],
    pinned: row.pinned ?? undefined,
    folderId: row.folder_id ?? undefined,
    createdAt: row.created_at,
  };
}

function toInsertPayload(userId: string, goal: Goal): GoalInsertPayload {
  return {
    id: goal.id,
    user_id: userId,
    name: goal.name,
    target: goal.target,
    saved: goal.saved,
    emoji: goal.emoji,
    color: goal.color,
    deadline: goal.deadline,
    icon: goal.icon,
    purchase_url: goal.purchaseUrl,
    contributions: goal.contributions as GoalContributionRow[] | undefined,
    pinned: goal.pinned,
    folder_id: goal.folderId,
  };
}

function toUpdatePayload(patch: Partial<Goal>): GoalUpdatePayload {
  const payload: GoalUpdatePayload = {};
  if ('name' in patch) payload.name = patch.name;
  if ('target' in patch) payload.target = patch.target;
  if ('saved' in patch) payload.saved = patch.saved;
  if ('emoji' in patch) payload.emoji = patch.emoji;
  if ('color' in patch) payload.color = patch.color;
  if ('deadline' in patch) payload.deadline = patch.deadline;
  if ('icon' in patch) payload.icon = patch.icon;
  if ('purchaseUrl' in patch) payload.purchase_url = patch.purchaseUrl;
  if ('contributions' in patch)
    payload.contributions = patch.contributions as GoalContributionRow[] | undefined;
  if ('pinned' in patch) payload.pinned = patch.pinned;
  if ('folderId' in patch) payload.folder_id = patch.folderId;
  return payload;
}

export async function fetchGoals(userId: string): Promise<Goal[]> {
  const { data, error } = await supabase
    .from('goals')
    .select(GOAL_COLS)
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) {
    throw new AppError(ErrorCodes.DB_QUERY_FAILED, 'Error fetching goals', {
      originalError: error,
      context: { userId },
    });
  }
  return ((data ?? []) as GoalRow[]).map(mapGoalFromDb);
}

export async function insertGoal(userId: string, goal: Goal): Promise<void> {
  const { error } = await supabase.from('goals').upsert(toInsertPayload(userId, goal));
  if (error) {
    throw new AppError(ErrorCodes.DB_INSERT_FAILED, 'Error inserting goal', {
      originalError: error,
      context: { userId, goalId: goal.id },
    });
  }
}

export async function updateGoal(userId: string, id: string, patch: Partial<Goal>): Promise<void> {
  const { error } = await supabase.from('goals').update(toUpdatePayload(patch)).eq("id", id).eq("user_id", userId);
  if (error) {
    throw new AppError(ErrorCodes.DB_UPDATE_FAILED, 'Error updating goal', {
      originalError: error,
      context: { goalId: id },
    });
  }
}

export async function deleteGoal(userId: string, id: string): Promise<void> {
  const { error } = await supabase.from('goals').delete().eq("id", id).eq("user_id", userId);
  if (error) {
    throw new AppError(ErrorCodes.DB_DELETE_FAILED, 'Error deleting goal', {
      originalError: error,
      context: { goalId: id },
    });
  }
}

export async function addGoalContribution(
  userId: string,
  goalId: string,
  input: GoalContributionInput,
): Promise<void> {
  const { data: goals, error: fetchError } = await supabase
    .from('goals')
    .select('saved, contributions')
    .eq('id', goalId)
    .single();

  if (fetchError || !goals) {
    throw new AppError(ErrorCodes.DB_QUERY_FAILED, 'Error fetching goal for contribution', {
      originalError: fetchError,
      context: { userId, goalId },
    });
  }

  const currentContributions = (goals.contributions as GoalContributionRow[]) ?? [];
  const newContribution = {
    id: crypto.randomUUID(),
    date: input.date ?? new Date().toISOString(),
    amount: input.amount,
  };

  const newSaved = Math.max(0, (goals.saved ?? 0) + input.amount);

  const { error: updateError } = await supabase
    .from('goals')
    .update({
      saved: newSaved,
      contributions: [...currentContributions, newContribution]
    })
    .eq('id', goalId);

  if (updateError) {
    throw new AppError(ErrorCodes.DB_UPDATE_FAILED, 'Error adding goal contribution', {
      originalError: updateError,
      context: { userId, goalId },
    });
  }

  const method: Transaction['paymentMethod'] = input.accountId
    ? (input.amount >= 0 ? 'transfer' : 'cash')
    : 'cash';

  const tx: Transaction = {
    id: input.txId ?? crypto.randomUUID(),
    type: input.amount >= 0 ? 'saving' : 'income',
    category: 'Meta',
    concept: `${input.amount >= 0 ? 'Aporte' : 'Retiro'} ${input.goalName ?? 'Meta'}`,
    amount: Math.abs(input.amount),
    date: input.date ?? new Date().toISOString(),
    accountId: input.accountId,
    paymentMethod: method,
  };

  await insertTransaction(userId, tx);
}

