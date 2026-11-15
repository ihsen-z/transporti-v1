import { useMutation } from '@tanstack/react-query';
import { isAxiosError } from 'axios';
import { apiClient } from '@/core/api/client';
import { parseServerRefusal } from '@/core/api/serverRefusal';
import type { ReturnTripCreateRequest, ReturnTripCreateResponse } from './dto';

export type PublishErrorKind = 'validation' | 'forbidden' | 'network' | 'unknown';

export class PublishError extends Error {
  // `serverMessage` : texte exact du serveur (plafond de dette, pièces non
  // validées…). `code` : `KYC_REQUIRED`, `COMMISSION_DEBT_LIMIT`… quand il existe.
  constructor(
    public readonly kind: PublishErrorKind,
    public readonly serverMessage?: string,
    public readonly code?: string,
  ) {
    super(kind);
    this.name = 'PublishError';
  }
}

// Publication d'un trajet retour (réservation immédiate off par défaut, D11).
async function postPublish(
  body: ReturnTripCreateRequest,
): Promise<ReturnTripCreateResponse> {
  try {
    const res = await apiClient.post<ReturnTripCreateResponse>(
      'jobs/return-trip/',
      body,
    );
    return res.data;
  } catch (err) {
    if (isAxiosError(err)) {
      if (err.response?.status === 400) throw new PublishError('validation');
      if (err.response?.status === 403) {
        // Un 403 n'est plus toujours « pas transporteur » : dette de commission
        // et vérification d'identité refusent aussi, avec leur propre message.
        const refus = parseServerRefusal(err.response.data);
        throw new PublishError('forbidden', refus.message ?? undefined, refus.code ?? undefined);
      }
      if (!err.response) throw new PublishError('network');
    }
    throw new PublishError('unknown');
  }
}

export function usePublishReturnTrip() {
  return useMutation<ReturnTripCreateResponse, PublishError, ReturnTripCreateRequest>({
    mutationFn: postPublish,
  });
}
