import { useMutation, useQueryClient } from '@tanstack/react-query';
import { isAxiosError } from 'axios';
import { apiClient } from '@/core/api/client';
import { walletKey } from './useWallet';
import type { WithdrawalResponse } from './dto';

export type WithdrawalErrorKind = 'validation' | 'forbidden' | 'network' | 'unknown';

export class WithdrawalError extends Error {
  // `serverMessage` porte le texte exact du backend (montant minimum, solde
  // insuffisant, RIB manquant). On l'affiche tel quel : il est déjà en
  // français, et le dupliquer côté mobile ferait diverger les deux règles.
  constructor(
    public readonly kind: WithdrawalErrorKind,
    public readonly serverMessage?: string,
  ) {
    super(kind);
    this.name = 'WithdrawalError';
  }
}

interface Args {
  amount: string;
  bankDetails: string;
}

function firstFieldError(data: unknown): string | undefined {
  if (typeof data !== 'object' || data === null) return undefined;
  for (const value of Object.values(data as Record<string, unknown>)) {
    if (Array.isArray(value) && typeof value[0] === 'string') return value[0];
    if (typeof value === 'string') return value;
  }
  return undefined;
}

// POST /api/v1/wallet/withdrawals/ — demande de virement, traitée en
// back-office (décision D4 : aucun paiement automatique sortant).
async function postWithdrawal({ amount, bankDetails }: Args): Promise<WithdrawalResponse> {
  try {
    const res = await apiClient.post<WithdrawalResponse>('wallet/withdrawals/', {
      amount,
      bank_details: bankDetails,
    });
    return res.data;
  } catch (err) {
    if (isAxiosError(err)) {
      if (err.response?.status === 400) {
        throw new WithdrawalError('validation', firstFieldError(err.response.data));
      }
      if (err.response?.status === 403) throw new WithdrawalError('forbidden');
      if (!err.response) throw new WithdrawalError('network');
    }
    throw new WithdrawalError('unknown');
  }
}

export function useCreateWithdrawal() {
  const qc = useQueryClient();
  return useMutation<WithdrawalResponse, WithdrawalError, Args>({
    mutationFn: postWithdrawal,
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: walletKey });
      // Le solde retirable entre aussi dans les KPI de l'accueil.
      void qc.invalidateQueries({ queryKey: ['transporterStats'] });
    },
  });
}
