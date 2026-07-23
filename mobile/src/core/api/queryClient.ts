import { QueryClient } from '@tanstack/react-query';

// Client React Query partagé (état serveur). L'état client (auth, préférences)
// reste dans les stores Zustand — pas de mélange des deux responsabilités.
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 30_000,
      refetchOnWindowFocus: false,
    },
  },
});
