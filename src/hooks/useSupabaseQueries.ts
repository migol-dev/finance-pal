import { useQuery, useQueryClient, UseQueryOptions } from '@tanstack/react-query';
import { supabase, isSupabaseEnabled } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';

export function useSupabaseQuery<T>(
  key: string[],
  queryFn: () => Promise<T>,
  options?: Partial<UseQueryOptions<T, Error, T, string[]>>
) {
  const { session, loading } = useAuth();
  
  return useQuery({
    queryKey: [...key, session?.user?.id],
    queryFn,
    enabled: isSupabaseEnabled && !loading && !!session,
    staleTime: 1000 * 60 * 5, // 5 minutes
    ...options,
  });
}

export async function fetchAccounts(userId: string) {
  const { data, error } = await supabase
    .from('accounts')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: true });
  
  if (error) throw error;
  return data;
}

export async function fetchTransactions(userId: string) {
  const { data, error } = await supabase
    .from('transactions')
    .select('*')
    .eq('user_id', userId)
    .order('date', { ascending: false });
  
  if (error) throw error;
  return data;
}

export async function fetchFixedItems(userId: string) {
  const { data, error } = await supabase
    .from('fixed_items')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
  
  if (error) throw error;
  return data;
}

export async function fetchGoals(userId: string) {
  const { data, error } = await supabase
    .from('goals')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
  
  if (error) throw error;
  return data;
}

export async function fetchDebts(userId: string) {
  const { data, error } = await supabase
    .from('debts')
    .select(`
      *,
      payments:debt_payments(*)
    `)
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
  
  if (error) throw error;
  return data;
}

export function useAccounts() {
  const { session } = useAuth();
  return useSupabaseQuery(['accounts'], () => fetchAccounts(session!.user.id));
}

export function useTransactions() {
  const { session } = useAuth();
  return useSupabaseQuery(['transactions'], () => fetchTransactions(session!.user.id));
}

export function useFixedItems() {
  const { session } = useAuth();
  return useSupabaseQuery(['fixed_items'], () => fetchFixedItems(session!.user.id));
}

export function useGoals() {
  const { session } = useAuth();
  return useSupabaseQuery(['goals'], () => fetchGoals(session!.user.id));
}

export function useDebts() {
  const { session } = useAuth();
  return useSupabaseQuery(['debts'], () => fetchDebts(session!.user.id));
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