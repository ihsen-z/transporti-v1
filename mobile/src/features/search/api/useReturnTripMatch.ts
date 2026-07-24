import { useMutation } from '@tanstack/react-query';
import { apiClient } from '@/core/api/client';
import type { MatchParams, MatchResponse } from './dto';

// GET return-trips/match/ déclenché à la demande (bouton Rechercher) : useMutation
// donne un déclenchement impératif + état isPending/data, tout en restant un GET.
async function fetchMatch(params: MatchParams): Promise<MatchResponse> {
  const res = await apiClient.get<MatchResponse>('return-trips/match/', {
    params: {
      pickup_governorate: params.pickup_governorate,
      dropoff_governorate: params.dropoff_governorate,
      ...(params.date ? { date: params.date } : {}),
    },
  });
  return res.data;
}

export function useReturnTripMatch() {
  return useMutation<MatchResponse, Error, MatchParams>({
    mutationFn: fetchMatch,
  });
}
