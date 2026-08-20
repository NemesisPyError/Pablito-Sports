import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 2,
      retry: (failureCount, error) => {
        // Solo reintentar errores de red en GET idempotentes (06_FRONTEND.md §10.3).
        if (error?.isNetworkFailure && failureCount < 2) return true;
        return false;
      },
    },
  },
});

export function QueryProvider({ children }) {
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}
