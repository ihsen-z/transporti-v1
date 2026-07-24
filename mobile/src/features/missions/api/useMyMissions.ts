import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/core/api/client';
import type { MissionDto, MissionStatus } from './dto';

interface Paginated<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

// Missions actives = à démarrer (MATCHED) ou en cours (IN_PROGRESS).
const ACTIVE: readonly MissionStatus[] = ['MATCHED', 'IN_PROGRESS'];

async function fetchMyMissions(): Promise<MissionDto[]> {
  const res = await apiClient.get<Paginated<MissionDto>>('jobs/transporter/');
  return res.data.results.filter((m) => ACTIVE.includes(m.status));
}

export function useMyMissions() {
  return useQuery({
    queryKey: ['myMissions'],
    queryFn: fetchMyMissions,
  });
}
