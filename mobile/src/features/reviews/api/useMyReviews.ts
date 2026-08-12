import { useInfiniteQuery } from '@tanstack/react-query';
import { apiClient } from '@/core/api/client';
import type { Paginated, ReviewDto } from './dto';

// GET reviews/my/ — avis REÇUS par l'utilisateur (target=moi), pas ceux écrits.
// 5.2 : peut croître sans limite sur la durée de vie du compte —
// `useInfiniteQuery`, piloté par le défilement de la FlatList (ReviewsPanel).
async function fetchMyReviewsPage(pageUrl: string | null): Promise<Paginated<ReviewDto>> {
  const res = pageUrl
    ? await apiClient.get<Paginated<ReviewDto>>(pageUrl)
    : await apiClient.get<Paginated<ReviewDto>>('reviews/my/');
  return res.data;
}

// Activé seulement quand le panneau « Mes avis » est ouvert.
export function useMyReviews(enabled: boolean) {
  return useInfiniteQuery({
    queryKey: ['myReviews'],
    queryFn: ({ pageParam }) => fetchMyReviewsPage(pageParam),
    initialPageParam: null as string | null,
    getNextPageParam: (lastPage) => lastPage.next,
    enabled,
  });
}
