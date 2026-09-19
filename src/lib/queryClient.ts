import { QueryClient } from '@tanstack/react-query';

// Instancia singleton de QueryClient.
// Extraída de `src/App.tsx`. Importar desde aquí en lugar de instanciar inline:
//   import { queryClient } from '@/lib/queryClient';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      gcTime: 1000 * 60 * 60 * 24, // 24 hours
      staleTime: 1000 * 60 * 10, // 10 minutes
      retry: (attemptIndex, error: any) => {
        if (error?.status === 401 || error?.status === 409 || error?.code === '23503') return false;
        return attemptIndex < 2;
      },
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 10000),
      refetchOnWindowFocus: false,
    },
    mutations: {
      retry: (attemptIndex, error: any) => {
        if (error?.status === 401 || error?.status === 409 || error?.code === '23503') return false;
        return attemptIndex < 1;
      },
    },
  },
});
