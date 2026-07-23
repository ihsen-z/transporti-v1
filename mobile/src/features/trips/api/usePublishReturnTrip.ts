import { useMutation } from '@tanstack/react-query';
import { isAxiosError } from 'axios';
import { apiClient } from '@/core/api/client';
import type { ReturnTripCreateRequest, ReturnTripCreateResponse } from './dto';

export type PublishErrorKind = 'validation' | 'forbidden' | 'network' | 'unknown';

export class PublishError extends Error {
  constructor(public readonly kind: PublishErrorKind) {
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
      if (err.response?.status === 403) throw new PublishError('forbidden');
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
