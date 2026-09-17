import { useQuery } from '@tanstack/react-query';
import type { UseQueryResult } from '@tanstack/react-query';
import { useAuth } from '@/context/AuthContext';
import { isSupabaseEnabled } from '@/lib/supabase';
import { financeKeys } from '@/lib/queryKeys';
import { fetchTransactions } from '@/services/transactions.service';
import { AppError, ErrorCodes } from '@/lib/app-error';
import type { Transaction } from '@/lib/finance';

export function useTransactionsQuery(): UseQueryResult<Transaction[], Error> {
  const { session, loading } = useAuth();
  const userId = session?.user?.id;

  return useQuery({
    queryKey: [...financeKeys.transactions(), userId],
    queryFn: () => {
      if (!userId) {
        throw new AppError(
          ErrorCodes.AUTH_NOT_AUTHENTICATED,
          'Cannot fetch transactions without session',
        );
      }
      return fetchTransactions(userId);
    },
    enabled: isSupabaseEnabled && !loading && !!session,
    staleTime: 1000 * 60 * 5, // 5 min (alta frecuencia de cambio)
  });
}
