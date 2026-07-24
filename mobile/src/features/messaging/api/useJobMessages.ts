import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/core/api/client';
import type { JobMessagesResponse } from './dto';

// GET /api/v1/jobs/<id>/messages/ — fil de discussion. Polling 5s tant que le
// chat est ouvert (temps réel « pauvre » sans WebSocket, décision plan §7).
async function fetchJobMessages(jobId: number): Promise<JobMessagesResponse> {
  const res = await apiClient.get<JobMessagesResponse>(`jobs/${jobId}/messages/`);
  return res.data;
}

export function useJobMessages(jobId: number | null) {
  return useQuery({
    queryKey: ['jobMessages', jobId],
    queryFn: () => fetchJobMessages(jobId as number),
    enabled: jobId !== null,
    refetchInterval: jobId !== null ? 5_000 : false,
  });
}
