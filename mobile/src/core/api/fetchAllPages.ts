import { apiClient } from './client';

interface Paginated<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

// Garde-fou : à 20/page (PAGE_SIZE serveur), 10 pages couvrent 200 éléments —
// bien au-delà de ce qu'un seul transporteur ou client peut accumuler sur ces
// jeux de données personnels. Empêche une pagination cassée de boucler à l'infini.
const MAX_PAGES = 10;

// 5.2 (les 3 listes imbriquées dans un ScrollView, pas dans une FlatList) :
// `MissionsList`/`CompletedMissionsList` (accueil) et `MyRequestsList`
// (mes-demandes) sont rendues via `.map()`, pas `onEndReached` — un
// `useInfiniteQuery` piloté par le défilement n'a pas de prise dessus. Ces
// trois jeux de données restent personnels et bornés par nature (les
// missions d'UN transporteur, ses propres demandes), donc les récupérer en
// entier ici est correct ; un flux qui peut croître sans limite
// (messages, notifications) reste sur `useInfiniteQuery` (voir les hooks
// correspondants), piloté par le défilement plutôt que rapatrié d'un bloc.
export async function fetchAllPages<T>(
  url: string,
  params?: Record<string, string>,
): Promise<T[]> {
  const results: T[] = [];
  let next: string | null = null;
  let page = 1;

  do {
    const res: { data: Paginated<T> } = next
      ? await apiClient.get<Paginated<T>>(next)
      : await apiClient.get<Paginated<T>>(url, { params });
    results.push(...res.data.results);
    next = res.data.next;
    page += 1;
  } while (next && page <= MAX_PAGES);

  return results;
}
