import { useQuery } from '@tanstack/react-query';
import { fetchAllPages } from '@/core/api/fetchAllPages';
import type { MyRequestDto } from './dto';

// GET /api/v1/trip-requests/my/ — les demandes envoyées par le client (récentes
// d'abord). 5.2 : rendue via `.map()` (MyRequestsList, dans le ScrollView de
// mes-demandes.tsx) — `fetchAllPages` évite de perdre silencieusement les
// demandes au-delà de la première page de 20 (jeu de données personnel et
// borné, pas de raison de plafonner à une page).
async function fetchMyRequests(): Promise<MyRequestDto[]> {
  return fetchAllPages<MyRequestDto>('trip-requests/my/');
}

export function useMyRequests() {
  return useQuery({
    queryKey: ['myRequests'],
    queryFn: fetchMyRequests,
  });
}
