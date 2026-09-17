import { useQuery } from '@tanstack/react-query';
import type { UseQueryResult } from '@tanstack/react-query';
import { useAuth } from '@/context/AuthContext';
import { isSupabaseEnabled } from '@/lib/supabase';
import { financeKeys } from '@/lib/queryKeys';
import { fetchAccounts } from '@/services/accounts.service';
import { AppError, ErrorCodes } from '@/lib/app-error';
import type { Account } from '@/lib/finance';

export function useAccountsQuery(): UseQueryResult<Account[], Error> {
  const { session, loading } = useAuth();
  const userId = session?.user?.id;

  return useQuery({
    queryKey: [...financeKeys.accounts(), userId],
    queryFn: () => {
      if (!userId) {
        throw new AppError(ErrorCodes.AUTH_NOT_AUTHENTICATED, 'Cannot fetch accounts without session');
      }
      return fetchAccounts(userId);
    },
    enabled: isSupabaseEnabled && !loading && !!session,
    staleTime: 1000 * 60 * 30, // 30 min (cuentas cambian poco)
  });
}
