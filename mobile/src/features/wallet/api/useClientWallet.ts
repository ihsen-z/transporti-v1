import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/core/api/client';
import type { ClientWalletDto } from './dto';

// GET client/wallet/ — ou en est l'argent du client.
async function fetchClientWallet(): Promise<ClientWalletDto> {
  const res = await apiClient.get<ClientWalletDto>('client/wallet/');
  return res.data;
}

// `enabled` doit valoir `false` pour un TRANSPORTEUR : la vue porte
// RequireRole('CLIENT') et repondrait 403.
export function useClientWallet(enabled: boolean) {
  return useQuery({
    queryKey: ['clientWallet'],
    queryFn: fetchClientWallet,
    enabled,
  });
}
