import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/core/api/client';
import type { WalletDto } from './dto';

// GET /api/v1/wallet/ — solde, historique et dettes de commission.
// Source unique des montants : rien n'est recalculé côté mobile (règle projet —
// l'argent se calcule côté serveur).
async function fetchWallet(): Promise<WalletDto> {
  const res = await apiClient.get<WalletDto>('wallet/');
  return res.data;
}

export const walletKey = ['wallet'] as const;

// `enabled` doit valoir false pour un CLIENT : la vue est protégée par
// RequireRole('TRANSPORTER') et répondrait 403.
export function useWallet(enabled: boolean) {
  return useQuery({
    queryKey: walletKey,
    queryFn: fetchWallet,
    enabled,
  });
}
