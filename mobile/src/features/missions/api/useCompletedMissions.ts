import { useQuery } from '@tanstack/react-query';
import { fetchAllPages } from '@/core/api/fetchAllPages';
import type { MissionDto } from './dto';

// GET jobs/transporter/?type=assigned, filtré sur les missions TERMINÉES
// (pour laisser un avis). Bug 5.1 : sans `?type=`, la pagination à 20 sur
// l'union assignées+retours pouvait reléguer les plus anciennes missions
// terminées hors de la première page.
//
// 5.2 : rendue via `.map()` dans le ScrollView de l'Accueil
// (CompletedMissionsList), pas une FlatList — `fetchAllPages` remplace la
// page unique pour ne pas perdre silencieusement les missions au-delà de 20.
async function fetchCompletedMissions(): Promise<MissionDto[]> {
  const results = await fetchAllPages<MissionDto>('jobs/transporter/', { type: 'assigned' });
  return results.filter((m) => m.status === 'COMPLETED');
}

export function useCompletedMissions() {
  return useQuery({
    queryKey: ['completedMissions'],
    queryFn: fetchCompletedMissions,
  });
}
