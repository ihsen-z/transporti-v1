import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/core/api/client';
import type { ScoreConfianceDto } from './dto';

// GET trust/score-breakdown/ — T5.3. Le score seul ne dit pas quoi corriger.
async function fetchMyTrustScore(): Promise<ScoreConfianceDto> {
  const res = await apiClient.get<ScoreConfianceDto>('trust/score-breakdown/');
  return res.data;
}

// Active seulement quand le panneau qui l'affiche est ouvert.
export function useMyTrustScore(enabled: boolean) {
  return useQuery({
    queryKey: ['myTrustScore'],
    queryFn: fetchMyTrustScore,
    enabled,
  });
}
