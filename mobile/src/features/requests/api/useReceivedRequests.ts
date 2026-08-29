import { useQuery } from '@tanstack/react-query';
import { fetchAllPages } from '@/core/api/fetchAllPages';
import type { TripRequestDto, TripRequestStatus } from './dto';

// T2.1 (lot 2) — toutes les demandes reçues, tous trajets confondus.
//
// Pendant mobile de `frontend/lib/services/tripRequests.ts`. Avant l'endpoint
// B-5, les demandes n'étaient lisibles que trajet par trajet : cet écran
// listait les TRAJETS et il fallait en taper un pour voir ses demandes.
//
// Le tri primaire est « qui doit agir maintenant » et non la date, d'où les
// onglets par statut plutôt qu'une liste unique.

/** Les onglets, dans l'ordre de ce qui attend une décision. */
export const ONGLETS = {
  'a-decider': ['PENDING'] as TripRequestStatus[],
  negociation: ['COUNTERED'] as TripRequestStatus[],
  archivees: ['ACCEPTED', 'REJECTED', 'CANCELLED'] as TripRequestStatus[],
};

export type OngletId = keyof typeof ONGLETS;

async function fetchReceived(statuts: TripRequestStatus[]): Promise<TripRequestDto[]> {
  return fetchAllPages<TripRequestDto>('trip-requests/received/', {
    status: statuts.join(','),
  });
}

// Le parametre de type est explicite : sans lui, l'inference retombe sur `any`
// chez les appelants et un `.filter` y devient une erreur d'implicit any
// difficile a rattacher a sa cause.
export function useReceivedRequests(onglet: OngletId) {
  return useQuery<TripRequestDto[]>({
    queryKey: ['receivedRequests', onglet],
    queryFn: () => fetchReceived(ONGLETS[onglet]),
  });
}
