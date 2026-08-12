import { useInfiniteQuery } from '@tanstack/react-query';
import { apiClient } from '@/core/api/client';
import type { MyDisputeDto, Paginated } from './dto';

// GET /api/v1/disputes/my/ — litiges ouverts par (ou impliquant) l'utilisateur.
// 5.2 : peut croître sans limite sur la durée de vie du compte —
// `useInfiniteQuery`, piloté par le défilement de la FlatList (DisputesPanel).
async function fetchMyDisputesPage(pageUrl: string | null): Promise<Paginated<MyDisputeDto>> {
  const res = pageUrl
    ? await apiClient.get<Paginated<MyDisputeDto>>(pageUrl)
    : await apiClient.get<Paginated<MyDisputeDto>>('disputes/my/');
  return res.data;
}

// Activé seulement quand le panneau est ouvert.
export function useMyDisputes(enabled: boolean) {
  return useInfiniteQuery({
    queryKey: ['myDisputes'],
    queryFn: ({ pageParam }) => fetchMyDisputesPage(pageParam),
    initialPageParam: null as string | null,
    getNextPageParam: (lastPage) => lastPage.next,
    enabled,
  });
}
