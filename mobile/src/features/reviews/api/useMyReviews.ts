import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/core/api/client';
import type { Paginated, ReviewDto } from './dto';

// GET reviews/my/ — avis REÇUS par l'utilisateur (target=moi), pas ceux écrits.
async function fetchMyReviews(): Promise<ReviewDto[]> {
  const res = await apiClient.get<Paginated<ReviewDto>>('reviews/my/');
  return res.data.results;
}

// Activé seulement quand le panneau « Mes avis » est ouvert.
export function useMyReviews(enabled: boolean) {
  return useQuery({
    queryKey: ['myReviews'],
    queryFn: fetchMyReviews,
    enabled,
  });
}
