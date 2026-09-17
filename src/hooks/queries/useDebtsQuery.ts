import { useQuery } from '@tanstack/react-query';
import type { UseQueryResult } from '@tanstack/react-query';
import { useAuth } from '@/context/AuthContext';
import { isSupabaseEnabled } from '@/lib/supabase';
import { financeKeys } from '@/lib/queryKeys';
import { fetchDebts } from '@/services/debts.service';
import { AppError, ErrorCodes } from '@/lib/app-error';
import type { Debt } from '@/lib/finance';

export function useDebtsQuery(): UseQueryResult<Debt[], Error> {
  const { session, loading } = useAuth();
  const userId = session?.user?.id;

  return useQuery({
    queryKey: [...financeKeys.debts(), userId],
    queryFn: () => {
      if (!userId) {
        throw new AppError(ErrorCodes.AUTH_NOT_AUTHENTICATED, 'Cannot fetch debts without session');
      }
      return fetchDebts(userId);
    },
    enabled: isSupabaseEnabled && !loading && !!session,
    staleTime: 1000 * 60 * 15, // 15 min
  });
}
