import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/core/api/client';
import type { ReviewDto, Paginated } from '@/features/reviews/api/dto';

// GET reviews/user/<id>/ (ReviewListView) — avis reçus par CE transporteur,
// distinct de reviews/my/ (les avis reçus par l'utilisateur courant).
async function fetchTransporterReviews(userId: number): Promise<ReviewDto[]> {
  const res = await apiClient.get<Paginated<ReviewDto>>(`reviews/user/${userId}/`);
  return res.data.results;
}

export function useTransporterReviews(userId: number | null) {
  return useQuery({
    queryKey: ['transporterReviews', userId],
    queryFn: () => fetchTransporterReviews(userId as number),
    enabled: userId !== null,
  });
}
