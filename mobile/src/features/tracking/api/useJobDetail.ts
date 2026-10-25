import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/core/api/client';
import { POLL_INTERVAL_MS } from '@/core/api/polling';
import type { JobDetailDto } from './dto';

// GET /api/v1/jobs/<id>/ — détail d'une mission, côté client engagé.
async function fetchJobDetail(jobId: number): Promise<JobDetailDto> {
  const res = await apiClient.get<JobDetailDto>(`jobs/${jobId}/`);
  return res.data;
}

export const jobDetailKey = (jobId: number) => ['jobDetail', jobId] as const;

export function useJobDetail(jobId: number | null) {
  return useQuery({
    queryKey: jobDetailKey(jobId ?? 0),
    queryFn: () => fetchJobDetail(jobId as number),
    enabled: jobId !== null,
    // Une mission bouge côté transporteur (départ, livraison) sans que le
    // client fasse quoi que ce soit. Sans push fiable, l'écran ouvert se
    // rafraîchit périodiquement — et uniquement lui, pas toute l'app.
    refetchInterval: POLL_INTERVAL_MS.jobDetail,
    refetchOnWindowFocus: true,
  });
}
