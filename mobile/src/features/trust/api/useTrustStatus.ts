import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/core/api/client';
import type { TrustStatusDto } from './dto';

// GET /api/v1/trust/status/ — statut de vérification + infos véhicule (TRANSPORTER).
async function fetchTrustStatus(): Promise<TrustStatusDto> {
  const res = await apiClient.get<TrustStatusDto>('trust/status/');
  return res.data;
}

export function useTrustStatus(enabled: boolean) {
  return useQuery({
    queryKey: ['trustStatus'],
    queryFn: fetchTrustStatus,
    enabled,
  });
}
