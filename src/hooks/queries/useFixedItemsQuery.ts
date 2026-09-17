import { useQuery } from '@tanstack/react-query';
import type { UseQueryResult } from '@tanstack/react-query';
import { useAuth } from '@/context/AuthContext';
import { isSupabaseEnabled } from '@/lib/supabase';
import { financeKeys } from '@/lib/queryKeys';
import { fetchFixedItems } from '@/services/fixedItems.service';
import { AppError, ErrorCodes } from '@/lib/app-error';
import type { FixedItem } from '@/lib/finance';

export function useFixedItemsQuery(): UseQueryResult<FixedItem[], Error> {
  const { session, loading } = useAuth();
  const userId = session?.user?.id;

  return useQuery({
    queryKey: [...financeKeys.fixedItems(), userId],
    queryFn: () => {
      if (!userId) {
        throw new AppError(
          ErrorCodes.AUTH_NOT_AUTHENTICATED,
          'Cannot fetch fixed items without session',
        );
      }
      return fetchFixedItems(userId);
    },
    enabled: isSupabaseEnabled && !loading && !!session,
    staleTime: 1000 * 60 * 15, // 15 min
  });
}
