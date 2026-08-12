import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/core/api/client';
import type { CountResults, TripRequestDto } from './dto';

// GET /api/v1/jobs/<id>/requests/ — demandes reçues sur un trajet (owner only).
// 5.2 audit finding: cet endpoint est une APIView nue qui renvoie déjà TOUT
// (count + results, sans next/previous — cf. CountResults dans dto.ts) : pas
// de pagination DRF ici, donc rien à migrer en useInfiniteQuery. Le plan
// listait « demandes reçues » parmi les 8 hooks plafonnés à 20 en supposant
// le PAGE_SIZE global partout ; ce n'est pas le cas pour cette vue précise.
async function fetchJobRequests(jobId: number): Promise<TripRequestDto[]> {
  const res = await apiClient.get<CountResults<TripRequestDto>>(
    `jobs/${jobId}/requests/`,
  );
  return res.data.results;
}

// Activé seulement quand un trajet est sélectionné.
export function useJobRequests(jobId: number | null) {
  return useQuery({
    queryKey: ['jobRequests', jobId],
    queryFn: () => fetchJobRequests(jobId as number),
    enabled: jobId !== null,
  });
}
