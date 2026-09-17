import { useQuery } from '@tanstack/react-query';
import type { UseQueryResult } from '@tanstack/react-query';
import { useAuth } from '@/context/AuthContext';
import { isSupabaseEnabled } from '@/lib/supabase';
import { financeKeys } from '@/lib/queryKeys';
import { fetchGoals } from '@/services/goals.service';
import { AppError, ErrorCodes } from '@/lib/app-error';
import type { Goal } from '@/lib/finance';

export function useGoalsQuery(): UseQueryResult<Goal[], Error> {
  const { session, loading } = useAuth();
  const userId = session?.user?.id;

  return useQuery({
    queryKey: [...financeKeys.goals(), userId],
    queryFn: () => {
      if (!userId) {
        throw new AppError(ErrorCodes.AUTH_NOT_AUTHENTICATED, 'Cannot fetch goals without session');
      }
      return fetchGoals(userId);
    },
    enabled: isSupabaseEnabled && !loading && !!session,
    staleTime: 1000 * 60 * 15, // 15 min
  });
}
