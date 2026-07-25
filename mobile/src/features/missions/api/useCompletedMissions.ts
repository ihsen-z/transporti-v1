import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/core/api/client';
import type { MissionDto } from './dto';

interface Paginated<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

// GET jobs/transporter/ filtré sur les missions TERMINÉES (pour laisser un avis).
async function fetchCompletedMissions(): Promise<MissionDto[]> {
  const res = await apiClient.get<Paginated<MissionDto>>('jobs/transporter/');
  return res.data.results.filter((m) => m.status === 'COMPLETED');
}

export function useCompletedMissions() {
  return useQuery({
    queryKey: ['completedMissions'],
    queryFn: fetchCompletedMissions,
  });
}
