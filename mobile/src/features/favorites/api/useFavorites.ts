import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/core/api/client';
import type { FavoriDto } from './dto';

// GET favorites/ — les transporteurs favoris du client.
async function fetchFavorites(): Promise<FavoriDto[]> {
  const res = await apiClient.get<FavoriDto[]>('favorites/');
  return res.data;
}

// `enabled` doit valoir `false` pour un TRANSPORTEUR : la vue est protegee par
// RequireRole('CLIENT') et repondrait 403.
export function useFavorites(enabled: boolean) {
  return useQuery({
    queryKey: ['favorites'],
    queryFn: fetchFavorites,
    enabled,
  });
}
