import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/core/api/client';
import type { MyRequestDto, Paginated } from './dto';

// GET /api/v1/trip-requests/my/ — les demandes envoyées par le client (récentes d'abord).
async function fetchMyRequests(): Promise<MyRequestDto[]> {
  const res = await apiClient.get<Paginated<MyRequestDto>>('trip-requests/my/');
  return res.data.results;
}

export function useMyRequests() {
  return useQuery({
    queryKey: ['myRequests'],
    queryFn: fetchMyRequests,
  });
}
