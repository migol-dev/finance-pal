import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { isSupabaseEnabled } from '@/lib/supabase';
import { financeKeys } from '@/lib/queryKeys';
import { parseReceiptRef } from '@/lib/receipt-ref';
import { getReceiptSignedUrl } from '@/services/storage.service';

export interface ReceiptUrlResult {
  url: string | undefined;
  isLoading: boolean;
  isError: boolean;
  isStorage: boolean;
  storagePath: string | undefined;
}

/**
 * Resuelve bajo demanda la URL visible de un comprobante:
 * - Si es `sb:receipts/<path>` o una URL firmada legada, solicita una URL firmada fresca (1h) y la cachea 45 min.
 * - Si es `data:image/...` o `blob:...`, la devuelve directamente sin red.
 */
export function useReceiptUrl(receipt?: string | null): ReceiptUrlResult {
  const parsed = useMemo(() => parseReceiptRef(receipt), [receipt]);
  const storagePath = parsed?.kind === 'storage' ? parsed.path : undefined;

  const query = useQuery({
    queryKey: financeKeys.receiptUrl(storagePath ?? ''),
    queryFn: () => getReceiptSignedUrl(storagePath!, 3600),
    enabled: Boolean(storagePath && isSupabaseEnabled),
    staleTime: 45 * 60 * 1000,
    gcTime: 55 * 60 * 1000,
    retry: 1,
  });

  if (!parsed) {
    return {
      url: undefined,
      isLoading: false,
      isError: false,
      isStorage: false,
      storagePath: undefined,
    };
  }

  if (parsed.kind === 'inline' || parsed.kind === 'external') {
    return {
      url: parsed.url,
      isLoading: false,
      isError: false,
      isStorage: false,
      storagePath: undefined,
    };
  }

  return {
    url: query.data,
    isLoading: isSupabaseEnabled ? query.isLoading : false,
    isError: isSupabaseEnabled ? query.isError : false,
    isStorage: true,
    storagePath,
  };
}
