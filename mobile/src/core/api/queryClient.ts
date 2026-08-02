import { QueryClient } from '@tanstack/react-query';
import { CACHE_MAX_AGE } from './queryPersister';

// Client React Query partagé (état serveur). L'état client (auth, préférences)
// reste dans les stores Zustand — pas de mélange des deux responsabilités.
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 30_000,
      refetchOnWindowFocus: false,
      // Aligné sur la durée de vie du cache persisté : avec le gcTime par
      // défaut (5 min), les requêtes inactives seraient supprimées de la
      // mémoire avant d'avoir pu être écrites dans MMKV.
      gcTime: CACHE_MAX_AGE,
    },
  },
});
