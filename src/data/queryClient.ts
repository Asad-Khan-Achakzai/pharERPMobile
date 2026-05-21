import { QueryClient } from '@tanstack/react-query';
import { ApiError } from '@/api/client';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: (failureCount, err) => {
        if (err instanceof ApiError) {
          if (err.status === 401 || err.status === 403) return false;
          if (err.status >= 500) return failureCount < 2;
          return failureCount < 1;
        }
        return failureCount < 2;
      },
      staleTime: 30_000,
      gcTime: 5 * 60_000,
      refetchOnWindowFocus: false,
      refetchOnReconnect: true,
    },
    mutations: {
      retry: false,
    },
  },
});
