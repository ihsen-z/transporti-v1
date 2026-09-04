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
      // Les champs absents ne sont pas envoyes : cote serveur, un filtre vide
      // et un filtre absent doivent se lire de la meme facon, et un `undefined`
      // serialise en chaine « undefined » filtrerait sur du vide.
      ...(params.date ? { date: params.date } : {}),
      ...(params.job_type ? { job_type: params.job_type } : {}),
      ...(params.weight_kg ? { weight_kg: params.weight_kg } : {}),
      ...(params.volume_m3 ? { volume_m3: params.volume_m3 } : {}),
      ...(params.offset ? { offset: params.offset } : {}),
      ...(params.limit ? { limit: params.limit } : {}),
    },
  });
  return res.data;
}

export function useReturnTripMatch() {
  return useMutation<MatchResponse, Error, MatchParams>({
    mutationFn: fetchMatch,
  });
}
