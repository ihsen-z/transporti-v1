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

// Bug 5.1 : sans `?type=assigned`, l'endpoint renvoie l'union missions
// assignées + retours publiés, paginée à 20 — un transporteur dont les 20
// plus récents sont terminés ne voyait plus jamais ses missions actives,
// reléguées en page 2. `assigned` (livré en 0.9) ne contient déjà que les
// jobs où ce transporteur a une offre ACCEPTED, donc un ensemble bien plus
// petit ; le filtre de statut ci-dessous reste nécessaire (assigned couvre
// aussi COMPLETED).
async function fetchMyMissions(): Promise<MissionDto[]> {
  const res = await apiClient.get<Paginated<MissionDto>>('jobs/transporter/', {
    params: { type: 'assigned' },
  });
  return res.data.results.filter((m) => ACTIVE.includes(m.status));
}

export function useMyMissions() {
  return useQuery({
    queryKey: ['myMissions'],
    queryFn: fetchMyMissions,
  });
}
