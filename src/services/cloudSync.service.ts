import { supabase } from '@/lib/supabase';
import { AppError, ErrorCodes } from '@/lib/app-error';
import { mapAccountFromDb } from '@/services/accounts.service';
import { mapTransactionFromDb } from '@/services/transactions.service';
import { mapFixedItemFromDb } from '@/services/fixedItems.service';
import { mapGoalFromDb } from '@/services/goals.service';
import { mapGoalFolderFromDb } from '@/services/goalFolders.service';
import { mapDebtFromDb } from '@/services/debts.service';
import { mapUserSettingsFromDb } from '@/services/settings.service';
import type {
  Account,
  Transaction,
  FixedItem,
  Goal,
  GoalFolder,
  Debt,
  ThemeMode,
  UserProfile,
} from '@/lib/finance';
// NO importar React, NO importar hooks, NO importar Zustand

// Resultado completo de una descarga desde la nube
export interface CloudSnapshot {
  accounts: Account[];
  transactions: Transaction[];
  fixedItems: FixedItem[];
  goals: Goal[];
  goalFolders: GoalFolder[];
  debts: Debt[];
}

// Resultado de settings remotos
export interface CloudSettings {
  theme: ThemeMode;
  profile: UserProfile;
}

// Resultado del sync masivo a la nube
export interface CloudSyncResult {
  /** Número total de registros sincronizados con éxito */
  syncedCount: number;
  /** Errores por entidad (vacío si todo OK) */
  errors: Array<{ entity: string; message: string }>;
}

// Input del sync masivo (snapshot local del store)
export interface CloudSyncInput {
  userId: string;
  accounts: Account[];
  transactions: Transaction[];
  fixedItems: FixedItem[];
  goals: Goal[];
  goalFolders: GoalFolder[];
  debts: Debt[];
  theme: ThemeMode;
  profile: UserProfile;
}

/**
 * Descarga todas las entidades de Supabase para el userId dado.
 * Usa los mappers existentes de cada servicio por entidad.
 * Lanza AppError(ErrorCodes.DB_QUERY_FAILED) si alguna de las 6 consultas falla.
 *
 * Internamente usa Promise.all([
 *   supabase.from('accounts')...,
 *   supabase.from('transactions')...,
 *   supabase.from('fixed_items')...,
 *   supabase.from('goals')...,
 *   supabase.from('debts')...,
 *   supabase.from('goal_folders')...,
 * ])
 * y aplica los mappers de cada servicio correspondiente.
 */
import { fetchUserSettings, upsertUserSettings } from '@/services/settings.service';

/**
 * Descarga todas las entidades de Supabase para el userId dado.
 * Usa los mappers existentes de cada servicio por entidad.
 * Lanza AppError(ErrorCodes.DB_QUERY_FAILED) si alguna de las 6 consultas falla.
 */
export async function downloadAllFromCloud(
  userId: string
): Promise<CloudSnapshot> {
  const [
    accountsRes,
    txRes,
    fixedRes,
    goalsRes,
    debtsRes,
    foldersRes,
  ] = await Promise.all([
    supabase.from('accounts').select('id, name, type, initial_balance, currency, denominations, clabe, bank, holder_name').eq('user_id', userId).order('created_at', { ascending: true }),
    supabase.from('transactions_safe').select('id, type, category, concept, amount, date, note, icon, payment_method, fixed_id, account_id, transfer_to_account_id, external_payee, receipt').eq('user_id', userId).order('date', { ascending: false }),
    supabase.from('fixed_items').select('id, type, category, concept, amount, frequency, active, note, start_date, end_date, priority, pay_day, pay_week_day, icon, payment_method, account_id').eq('user_id', userId).order('created_at', { ascending: false }),
    supabase.from('goals').select('id, name, target, saved, emoji, color, deadline, icon, purchase_url, contributions, pinned, folder_id, created_at').eq('user_id', userId).order('created_at', { ascending: false }),
    supabase.from('debts').select('id, person, concept, amount, date, due_date, note, icon, account_id, payments:debt_payments(id, amount, date, note, payment_method, account_id)').eq('user_id', userId).order('created_at', { ascending: false }),
    supabase.from('goal_folders').select('id, name, color, icon, parent_id, "order", created_at').eq('user_id', userId).order('"order"', { ascending: true }),
  ]);

  if (accountsRes.error || txRes.error || fixedRes.error || goalsRes.error || debtsRes.error || foldersRes.error) {
    throw new AppError(ErrorCodes.DB_QUERY_FAILED, 'Error descargando datos masivos', {
      context: { userId, accounts: accountsRes.error, tx: txRes.error, fixed: fixedRes.error, goals: goalsRes.error, debts: debtsRes.error, folders: foldersRes.error },
    });
  }

  return {
    accounts: (accountsRes.data ?? []).map((r: any) => mapAccountFromDb(r)),
    transactions: (txRes.data ?? []).map((r: any) => mapTransactionFromDb(r)),
    fixedItems: (fixedRes.data ?? []).map((r: any) => mapFixedItemFromDb(r)),
    goals: (goalsRes.data ?? []).map((r: any) => mapGoalFromDb(r)),
    goalFolders: (foldersRes.data ?? []).map((r: any) => mapGoalFolderFromDb(r)),
    debts: (debtsRes.data ?? []).map((r: any) => mapDebtFromDb(r)),
  };
}

/**
 * Sincroniza (delete+insert masivo) todas las entidades del usuario a Supabase.
 * Las transacciones con receipt en base64 deben ser manejadas externamente
 * (el caller debe resolver los uploads a Storage antes de llamar a esta función).
 *
 * Retorna CloudSyncResult con el conteo de registros sincronizados y errores parciales.
 * NO lanza excepción si hay errores en entidades individuales: los acumula en `errors`.
 */
export async function syncAllToCloud(
  input: CloudSyncInput
): Promise<CloudSyncResult> {
  let syncedCount = 0;
  const errors: Array<{ entity: string; message: string }> = [];
  const { userId } = input;

  // Accounts
  await supabase.from('accounts').delete().eq('user_id', userId);
  for (const a of input.accounts) {
    const { error } = await supabase.from('accounts').insert({
      id: a.id, user_id: userId, name: a.name, type: a.type,
      initial_balance: a.initialBalance, currency: a.currency,
      clabe: a.clabe, bank: a.bank, holder_name: a.holderName,
      denominations: a.denominations,
    });
    if (error) errors.push({ entity: 'accounts', message: error.message });
    else syncedCount++;
  }

  // Transactions
  await supabase.from('transactions').delete().eq('user_id', userId);
  for (const tx of input.transactions) {
    const { error } = await supabase.from('transactions').insert({
      id: tx.id, user_id: userId, type: tx.type, category: tx.category,
      concept: tx.concept, amount: tx.amount, date: tx.date,
      note: tx.note, icon: tx.icon, payment_method: tx.paymentMethod,
      fixed_id: tx.fixedId, account_id: tx.accountId,
      transfer_to_account_id: tx.transferToAccountId,
      external_payee: tx.externalPayee, receipt: tx.receipt,
    });
    if (error) errors.push({ entity: 'transactions', message: error.message });
    else syncedCount++;
  }

  // Fixed Items
  await supabase.from('fixed_items').delete().eq('user_id', userId);
  for (const f of input.fixedItems) {
    const { error } = await supabase.from('fixed_items').insert({
      id: f.id, user_id: userId, type: f.type, category: f.category,
      concept: f.concept, amount: f.amount, frequency: f.frequency,
      active: f.active, note: f.note, start_date: f.startDate,
      end_date: f.endDate, priority: f.priority, pay_day: f.payDay,
      pay_week_day: f.payWeekDay, icon: f.icon,
      payment_method: f.paymentMethod, account_id: f.accountId,
    });
    if (error) errors.push({ entity: 'fixed_items', message: error.message });
    else syncedCount++;
  }

  // Goals
  await supabase.from('goals').delete().eq('user_id', userId);
  for (const g of input.goals) {
    const { error } = await supabase.from('goals').insert({
      id: g.id, user_id: userId, name: g.name, target: g.target,
      saved: g.saved, emoji: g.emoji, color: g.color, icon: g.icon,
      deadline: g.deadline, purchase_url: g.purchaseUrl,
      contributions: g.contributions, pinned: g.pinned,
      folder_id: g.folderId,
    });
    if (error) errors.push({ entity: 'goals', message: error.message });
    else syncedCount++;
  }

  // Goal Folders
  await supabase.from('goal_folders').delete().eq('user_id', userId);
  for (const f of input.goalFolders) {
    const { error } = await supabase.from('goal_folders').insert({
      id: f.id, user_id: userId, name: f.name, color: f.color,
      icon: f.icon, parent_id: f.parentId, "order": f.order,
    });
    if (error) errors.push({ entity: 'goal_folders', message: error.message });
    else syncedCount++;
  }

  // Debts
  await supabase.from('debts').delete().eq('user_id', userId);
  for (const debt of input.debts) {
    const { error: debtErr } = await supabase.from('debts').insert({
      id: debt.id, user_id: userId, person: debt.person,
      concept: debt.concept, amount: debt.amount, date: debt.date,
      due_date: debt.dueDate, note: debt.note, icon: debt.icon,
      account_id: debt.accountId,
    });
    if (debtErr) {
      errors.push({ entity: 'debts', message: debtErr.message });
    } else {
      syncedCount++;
      for (const p of debt.payments) {
        const pay: Record<string, unknown> = {
          id: p.id, debt_id: debt.id, user_id: userId,
          amount: p.amount, date: p.date, note: p.note,
          payment_method: p.paymentMethod,
        };
        if (p.accountId) pay.account_id = p.accountId;
        if (p.transferToAccountId) pay.transfer_to_account_id = p.transferToAccountId;
        if (p.externalPayee) pay.external_payee = p.externalPayee;
        if (p.receipt && !p.receipt.startsWith('data:')) pay.receipt_url = p.receipt;
        
        const { error: payErr } = await supabase.from('debt_payments').insert(pay);
        if (payErr) errors.push({ entity: 'debt_payments', message: payErr.message });
        else syncedCount++;
      }
    }
  }

  // Settings
  try {
    await upsertUserSettings(userId, { theme: input.theme, profile: input.profile });
  } catch (error: any) {
    errors.push({ entity: 'user_settings', message: error?.message ?? 'Error upserting settings' });
  }

  return { syncedCount, errors };
}

/**
 * Carga theme y profile del usuario desde user_settings.
 * Delega a fetchUserSettings de settings.service.ts.
 * Retorna null si no hay registro aún.
 *
 * NOTA: Esta función existe solo por compatibilidad semántica.
 * En realidad es un wrapper de fetchUserSettings.
 */
export async function loadSettingsFromCloud(
  userId: string
): Promise<CloudSettings | null> {
  const settings = await fetchUserSettings(userId);
  if (!settings) return null;
  return {
    theme: settings.theme,
    profile: settings.profile,
  };
}
