import { supabase } from '@/lib/supabase';
import { AppError, ErrorCodes } from '@/lib/app-error';
import type { GoalFolder } from '@/lib/finance';

// Capa de acceso a datos para carpetas de metas. Funciones puras contra Supabase SDK.
// NO importar React, NO importar hooks, NO importar Zustand.

export interface GoalFolderRow {
  id: string;
  name: string;
  color: string;
  icon: GoalFolder['icon'] | null;
  parent_id: string | null;
  order: number | null;
  user_id?: string;
  created_at?: string;
}

export interface GoalFolderInsertPayload {
  id: string;
  user_id: string;
  name: string;
  color: string;
  icon: GoalFolder['icon'] | undefined;
  parent_id: string | undefined;
  order: number;
}

export interface GoalFolderUpdatePayload
  extends Partial<Omit<GoalFolderInsertPayload, 'id' | 'user_id'>> {}

// Nota: "order" es palabra reservada en Postgres; se cita con comillas dobles.
const FOLDER_COLS = 'id, name, color, icon, parent_id, "order", created_at';

export function mapGoalFolderFromDb(row: GoalFolderRow): GoalFolder {
  return {
    id: row.id,
    name: row.name,
    color: row.color,
    icon: row.icon ?? undefined,
    parentId: row.parent_id ?? undefined,
    order: row.order ?? 0,
    createdAt: row.created_at ?? new Date().toISOString(),
  };
}

function toInsertPayload(userId: string, folder: GoalFolder): GoalFolderInsertPayload {
  return {
    id: folder.id,
    user_id: userId,
    name: folder.name,
    color: folder.color,
    icon: folder.icon,
    parent_id: folder.parentId,
    order: folder.order,
  };
}

function toUpdatePayload(patch: Partial<GoalFolder>): GoalFolderUpdatePayload {
  const payload: GoalFolderUpdatePayload = {};
  if ('name' in patch) payload.name = patch.name;
  if ('color' in patch) payload.color = patch.color;
  if ('icon' in patch) payload.icon = patch.icon;
  if ('parentId' in patch) payload.parent_id = patch.parentId;
  if ('order' in patch) payload.order = patch.order;
  return payload;
}

export async function fetchGoalFolders(userId: string): Promise<GoalFolder[]> {
  const { data, error } = await supabase
    .from('goal_folders')
    .select(FOLDER_COLS)
    .eq('user_id', userId)
    .order('"order"', { ascending: true });

  if (error) {
    throw new AppError(ErrorCodes.DB_QUERY_FAILED, 'Error fetching goal folders', {
      originalError: error,
      context: { userId },
    });
  }
  return ((data ?? []) as GoalFolderRow[]).map(mapGoalFolderFromDb);
}

export async function insertGoalFolder(userId: string, folder: GoalFolder): Promise<void> {
  const { error } = await supabase.from('goal_folders').insert(toInsertPayload(userId, folder));
  if (error) {
    throw new AppError(ErrorCodes.DB_INSERT_FAILED, 'Error inserting goal folder', {
      originalError: error,
      context: { userId, folderId: folder.id },
    });
  }
}

export async function updateGoalFolder(id: string, patch: Partial<GoalFolder>): Promise<void> {
  const { error } = await supabase.from('goal_folders').update(toUpdatePayload(patch)).eq('id', id);
  if (error) {
    throw new AppError(ErrorCodes.DB_UPDATE_FAILED, 'Error updating goal folder', {
      originalError: error,
      context: { folderId: id },
    });
  }
}

export async function deleteGoalFolder(id: string): Promise<void> {
  const { error } = await supabase.from('goal_folders').delete().eq('id', id);
  if (error) {
    throw new AppError(ErrorCodes.DB_DELETE_FAILED, 'Error deleting goal folder', {
      originalError: error,
      context: { folderId: id },
    });
  }
}

export async function reorderGoalFolders(
  userId: string,
  folders: GoalFolder[],
): Promise<void> {
  // Upsert the whole array to update 'order' (assuming bulk update using upsert)
  const payloads = folders.map(f => ({
    id: f.id,
    user_id: userId,
    name: f.name,
    color: f.color,
    icon: f.icon,
    parent_id: f.parentId,
    order: f.order,
  }));
  
  const { error } = await supabase.from('goal_folders').upsert(payloads, { onConflict: 'id' });
  
  if (error) {
    throw new AppError(ErrorCodes.DB_UPDATE_FAILED, 'Error reordering goal folders', {
      originalError: error,
      context: { userId, count: folders.length },
    });
  }
}
