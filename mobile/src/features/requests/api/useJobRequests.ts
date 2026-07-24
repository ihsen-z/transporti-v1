import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/core/api/client';
import type { CountResults, TripRequestDto } from './dto';

// GET /api/v1/jobs/<id>/requests/ — demandes reçues sur un trajet (owner only).
async function fetchJobRequests(jobId: number): Promise<TripRequestDto[]> {
  const res = await apiClient.get<CountResults<TripRequestDto>>(
    `jobs/${jobId}/requests/`,
  );
  return res.data.results;
}

// Activé seulement quand un trajet est sélectionné.
export function useJobRequests(jobId: number | null) {
  return useQuery({
    queryKey: ['jobRequests', jobId],
    queryFn: () => fetchJobRequests(jobId as number),
    enabled: jobId !== null,
  });
}
