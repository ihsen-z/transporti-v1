import { useQuery } from '@tanstack/react-query';
import { fetchAllPages } from '@/core/api/fetchAllPages';
import type { MissionDto, MissionStatus } from './dto';

// Missions actives = à démarrer (MATCHED) ou en cours (IN_PROGRESS).
const ACTIVE: readonly MissionStatus[] = ['MATCHED', 'IN_PROGRESS'];

// Bug 5.1 : sans `?type=assigned`, l'endpoint renvoie l'union missions
// assignées + retours publiés, paginée à 20 — un transporteur dont les 20
// plus récents sont terminés ne voyait plus jamais ses missions actives,
// reléguées en page 2. `assigned` (livré en 0.9) ne contient déjà que les
// jobs où ce transporteur a une offre ACCEPTED, donc un ensemble bien plus
// petit ; le filtre de statut ci-dessous reste nécessaire (assigned couvre
// aussi COMPLETED).
//
// 5.2 : rendue via `.map()` dans le ScrollView de l'Accueil (MissionsList),
// pas une FlatList — pas de prise pour `onEndReached`. `fetchAllPages`
// rapatrie tout (borné : les missions d'UN seul transporteur) au lieu de
// perdre silencieusement tout ce qui dépasse la première page de 20.
async function fetchMyMissions(): Promise<MissionDto[]> {
  const results = await fetchAllPages<MissionDto>('jobs/transporter/', { type: 'assigned' });
  return results.filter((m) => ACTIVE.includes(m.status));
}

export function useMyMissions() {
  return useQuery({
    queryKey: ['myMissions'],
    queryFn: fetchMyMissions,
  });
}
