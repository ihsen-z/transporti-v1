import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/core/api/client';
import type { MyDisputeDto, Paginated } from './dto';

// GET /api/v1/disputes/my/ — litiges ouverts par (ou impliquant) l'utilisateur.
async function fetchMyDisputes(): Promise<MyDisputeDto[]> {
  const res = await apiClient.get<Paginated<MyDisputeDto>>('disputes/my/');
  return res.data.results;
}

// Activé seulement quand le panneau est ouvert.
export function useMyDisputes(enabled: boolean) {
  return useQuery({
    queryKey: ['myDisputes'],
    queryFn: fetchMyDisputes,
    enabled,
  });
}
