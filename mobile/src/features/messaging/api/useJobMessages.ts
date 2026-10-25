import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/core/api/client';
import { POLL_INTERVAL_MS } from '@/core/api/polling';
import type { JobMessagesResponse } from './dto';

// GET /api/v1/jobs/<id>/messages/ — fil de discussion. Sondé tant que le chat
// est ouvert (temps réel « pauvre » sans WebSocket, décision plan §7) ; la
// cadence vit dans core/api/polling.ts.
async function fetchJobMessages(jobId: number): Promise<JobMessagesResponse> {
  const res = await apiClient.get<JobMessagesResponse>(`jobs/${jobId}/messages/`);
  return res.data;
}

export function useJobMessages(jobId: number | null) {
  return useQuery({
    queryKey: ['jobMessages', jobId],
    queryFn: () => fetchJobMessages(jobId as number),
    enabled: jobId !== null,
    refetchInterval: jobId !== null ? POLL_INTERVAL_MS.jobMessages : false,
    refetchOnWindowFocus: true,
  });
}
