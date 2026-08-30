import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/core/api/client';
import type { FideliteDto } from './dto';

// GET transporter/loyal-clients/ — T5.5, pendant de C5.3.
async function fetchLoyalClients(): Promise<FideliteDto> {
  const res = await apiClient.get<FideliteDto>('transporter/loyal-clients/');
  return res.data;
}

// `enabled` doit valoir `false` pour un CLIENT : la vue porte
// RequireRole('TRANSPORTER') et repondrait 403.
export function useLoyalClients(enabled: boolean) {
  return useQuery({
    queryKey: ['loyalClients'],
    queryFn: fetchLoyalClients,
    enabled,
  });
}
