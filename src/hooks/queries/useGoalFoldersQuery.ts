import { useQuery } from '@tanstack/react-query';
import type { UseQueryResult } from '@tanstack/react-query';
import { useAuth } from '@/context/AuthContext';
import { isSupabaseEnabled } from '@/lib/supabase';
import { financeKeys } from '@/lib/queryKeys';
import { fetchGoalFolders } from '@/services/goalFolders.service';
import { AppError, ErrorCodes } from '@/lib/app-error';
import type { GoalFolder } from '@/lib/finance';

export function useGoalFoldersQuery(): UseQueryResult<GoalFolder[], Error> {
  const { session, loading } = useAuth();
  const userId = session?.user?.id;

  return useQuery({
    queryKey: [...financeKeys.goalFolders(), userId],
    queryFn: () => {
      if (!userId) {
        throw new AppError(
          ErrorCodes.AUTH_NOT_AUTHENTICATED,
          'Cannot fetch goal folders without session',
        );
      }
      return fetchGoalFolders(userId);
    },
    enabled: isSupabaseEnabled && !loading && !!session,
    staleTime: 1000 * 60 * 15, // 15 min
  });
}
