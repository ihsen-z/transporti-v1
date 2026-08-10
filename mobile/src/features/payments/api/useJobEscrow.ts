import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/core/api/client';
import type { EscrowDetailDto } from './dto';

// GET /api/v1/jobs/<id>/escrow/ — transparence sur les fonds séquestrés.
// Lecture seule : le client voit où en est son argent, il n'agit pas dessus.
async function fetchJobEscrow(jobId: number): Promise<EscrowDetailDto[]> {
  const res = await apiClient.get<EscrowDetailDto[]>(`jobs/${jobId}/escrow/`);
  return res.data;
}

export function useJobEscrow(jobId: number | null, enabled = true) {
  return useQuery({
    queryKey: ['jobEscrow', jobId ?? 0],
    queryFn: () => fetchJobEscrow(jobId as number),
    enabled: jobId !== null && enabled,
  });
}
