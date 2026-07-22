import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase, isSupabaseEnabled } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { Account, Transaction, FixedItem, Goal, Debt } from '@/lib/finance';
import { AppError, ErrorCodes } from '@/lib/app-error';

const ACCOUNT_COLS = 'id, name, type, initial_balance, currency, denominations, clabe, bank, holder_name, created_at';
const TX_COLS = 'id, type, category, concept, amount, date, note, icon, payment_method, fixed_id, account_id, transfer_to_account_id, external_payee, receipt';
const FIXED_COLS = 'id, type, category, concept, amount, frequency, active, note, start_date, end_date, priority, pay_day, pay_week_day, icon, payment_method, account_id, created_at';
const GOAL_COLS = 'id, name, target, saved, emoji, color, deadline, icon, purchase_url, contributions, pinned, created_at';
const DEBT_COLS = 'id, person, concept, amount, date, due_date, note, icon, account_id, created_at, payments:debt_payments(id, amount, date, note, payment_method, account_id)';

const FIFTEEN_MIN = 1000 * 60 * 15;

export function useSupabaseQuery<T>(
  key: string[],
  queryFn: () => Promise<T>,
  options?: { enabled?: boolean; staleTime?: number }
) {
  const { session, loading } = useAuth();

  return useQuery({
    queryKey: [...key, session?.user?.id],
    queryFn,
    enabled: isSupabaseEnabled && !loading && !!session && (options?.enabled ?? true),
    staleTime: options?.staleTime ?? FIFTEEN_MIN,
  });
}

export async function fetchAccounts(userId: string) {
  const { data, error } = await supabase
    .from('accounts')
    .select(ACCOUNT_COLS)
    .eq('user_id', userId)
    .order('created_at', { ascending: true });

  if (error) throw new AppError(ErrorCodes.DB_QUERY_FAILED, 'Error fetching accounts', { originalError: error, context: { userId } });
  return (data ?? []).map(mapAccountFromDb);
}

export async function fetchTransactions(userId: string) {
  const { data, error } = await supabase
    .from('transactions')
    .select(TX_COLS)
    .eq('user_id', userId)
    .order('date', { ascending: false });

  if (error) throw new AppError(ErrorCodes.DB_QUERY_FAILED, 'Error fetching transactions', { originalError: error, context: { userId } });
  return (data ?? []).map(mapTransactionFromDb);
}

export async function fetchFixedItems(userId: string) {
  const { data, error } = await supabase
    .from('fixed_items')
    .select(FIXED_COLS)
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) throw new AppError(ErrorCodes.DB_QUERY_FAILED, 'Error fetching fixed items', { originalError: error, context: { userId } });
  return (data ?? []).map(mapFixedItemFromDb);
}

export async function fetchGoals(userId: string) {
  const { data, error } = await supabase
    .from('goals')
    .select(GOAL_COLS)
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) throw new AppError(ErrorCodes.DB_QUERY_FAILED, 'Error fetching goals', { originalError: error, context: { userId } });
  return (data ?? []).map(mapGoalFromDb);
}

export async function fetchDebts(userId: string) {
  const { data, error } = await supabase
    .from('debts')
    .select(DEBT_COLS)
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) throw new AppError(ErrorCodes.DB_QUERY_FAILED, 'Error fetching debts', { originalError: error, context: { userId } });
  return (data ?? []).map(mapDebtFromDb);
}

function mapAccountFromDb(row: any): Account {
  return {
    id: row.id,
    name: row.name,
    type: row.type,
    initialBalance: Number(row.initial_balance ?? 0),
    currency: row.currency,
    denominations: row.denominations ?? [],
    clabe: row.clabe,
    bank: row.bank,
    holderName: row.holder_name,
  };
}

function mapTransactionFromDb(row: any): Transaction {
  return {
    id: row.id,
    type: row.type,
    category: row.category,
    concept: row.concept,
    amount: Number(row.amount),
    date: row.date,
    note: row.note,
    icon: row.icon,
    paymentMethod: row.payment_method,
    fixedId: row.fixed_id,
    accountId: row.account_id,
    transferToAccountId: row.transfer_to_account_id,
    externalPayee: row.external_payee,
    receipt: row.receipt,
  };
}

function mapFixedItemFromDb(row: any): FixedItem {
  return {
    id: row.id,
    type: row.type,
    category: row.category,
    concept: row.concept,
    amount: Number(row.amount),
    frequency: row.frequency,
    active: row.active,
    note: row.note,
    startDate: row.start_date,
    endDate: row.end_date,
    priority: row.priority,
    payDay: row.pay_day,
    payWeekDay: row.pay_week_day,
    icon: row.icon,
    paymentMethod: row.payment_method,
    accountId: row.account_id,
  };
}

function mapGoalFromDb(row: any): Goal {
  return {
    id: row.id,
    name: row.name,
    target: Number(row.target),
    saved: Number(row.saved ?? 0),
    emoji: row.emoji,
    color: row.color,
    deadline: row.deadline,
    icon: row.icon,
    purchaseUrl: row.purchase_url,
    contributions: row.contributions ?? [],
    pinned: row.pinned,
    createdAt: row.created_at,
  };
}

function mapDebtFromDb(row: any): Debt {
  return {
    id: row.id,
    person: row.person,
    concept: row.concept,
    amount: Number(row.amount),
    date: row.date,
    dueDate: row.due_date,
    note: row.note,
    icon: row.icon,
    payments: (row.payments ?? []).map((p: any) => ({
      id: p.id,
      amount: Number(p.amount),
      date: p.date,
      note: p.note,
      paymentMethod: p.payment_method,
      accountId: p.account_id,
    })),
    accountId: row.account_id,
  };
}

export function useAccounts() {
  const { session } = useAuth();
  return useSupabaseQuery(['accounts'], () => {
    if (!session?.user?.id) throw new AppError(ErrorCodes.AUTH_NOT_AUTHENTICATED, 'Cannot fetch accounts without session');
    return fetchAccounts(session.user.id);
  });
}

export function useTransactions() {
  const { session } = useAuth();
  return useSupabaseQuery(['transactions'], () => {
    if (!session?.user?.id) throw new AppError(ErrorCodes.AUTH_NOT_AUTHENTICATED, 'Cannot fetch transactions without session');
    return fetchTransactions(session.user.id);
  });
}

export function useFixedItems() {
  const { session } = useAuth();
  return useSupabaseQuery(['fixed_items'], () => {
    if (!session?.user?.id) throw new AppError(ErrorCodes.AUTH_NOT_AUTHENTICATED, 'Cannot fetch fixed items without session');
    return fetchFixedItems(session.user.id);
  });
}

export function useGoals() {
  const { session } = useAuth();
  return useSupabaseQuery(['goals'], () => {
    if (!session?.user?.id) throw new AppError(ErrorCodes.AUTH_NOT_AUTHENTICATED, 'Cannot fetch goals without session');
    return fetchGoals(session.user.id);
  });
}

export function useDebts() {
  const { session } = useAuth();
  return useSupabaseQuery(['debts'], () => {
    if (!session?.user?.id) throw new AppError(ErrorCodes.AUTH_NOT_AUTHENTICATED, 'Cannot fetch debts without session');
    return fetchDebts(session.user.id);
  });
}

export function useInvalidateAll() {
  const queryClient = useQueryClient();
  return () => {
    queryClient.invalidateQueries({ queryKey: ['accounts'] });
    queryClient.invalidateQueries({ queryKey: ['transactions'] });
    queryClient.invalidateQueries({ queryKey: ['fixed_items'] });
    queryClient.invalidateQueries({ queryKey: ['goals'] });
    queryClient.invalidateQueries({ queryKey: ['debts'] });
  };
}
