import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/core/api/client';
import type { MissionDto } from './dto';

interface Paginated<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

// GET jobs/transporter/?type=assigned, filtré sur les missions TERMINÉES
// (pour laisser un avis). Bug 5.1 : sans `?type=`, la pagination à 20 sur
// l'union assignées+retours pouvait reléguer les plus anciennes missions
// terminées hors de la première page.
async function fetchCompletedMissions(): Promise<MissionDto[]> {
  const res = await apiClient.get<Paginated<MissionDto>>('jobs/transporter/', {
    params: { type: 'assigned' },
  });
  return res.data.results.filter((m) => m.status === 'COMPLETED');
}

export function useCompletedMissions() {
  return useQuery({
    queryKey: ['completedMissions'],
    queryFn: fetchCompletedMissions,
  });
}
