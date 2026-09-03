import { useMutation, useQueryClient } from '@tanstack/react-query';
import { isAxiosError } from 'axios';
import { apiClient } from '@/core/api/client';
import { extractServerMessage } from '@/core/api/serverMessage';

export type CancelRequestErrorKind = 'state' | 'network' | 'unknown';

export class CancelRequestError extends Error {
  // `serverMessage` porte le texte exact du backend, déjà rédigé en français.
  // Le reformuler ici ferait deux sources pour une même règle.
  constructor(
    public readonly kind: CancelRequestErrorKind,
    public readonly serverMessage?: string,
  ) {
    super(kind);
    this.name = 'CancelRequestError';
  }
}

// POST /api/v1/trip-requests/<id>/cancel/ — le client retire une demande
// encore PENDING ou COUNTERED. Endpoint déjà opérationnel côté serveur
// (TripRequestCancelView), jamais appelé par le mobile jusqu'ici.
async function postCancelRequest(requestId: number): Promise<void> {
  try {
    await apiClient.post(`trip-requests/${requestId}/cancel/`);
  } catch (err) {
    if (isAxiosError(err)) {
      if (err.response?.status === 400) {
        throw new CancelRequestError('state', extractServerMessage(err.response.data) ?? undefined);
      }
      if (!err.response) throw new CancelRequestError('network');
    }
    throw new CancelRequestError('unknown');
  }
}

export function useCancelRequest() {
  const qc = useQueryClient();
  return useMutation<void, CancelRequestError, number>({
    mutationFn: postCancelRequest,
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['myRequests'] });
    },
  });
}
