import { useMutation, useQueryClient } from '@tanstack/react-query';
import { isAxiosError } from 'axios';
import { apiClient } from '@/core/api/client';

export type CancelRequestErrorKind = 'state' | 'network' | 'unknown';

export class CancelRequestError extends Error {
  constructor(public readonly kind: CancelRequestErrorKind) {
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
      if (err.response?.status === 400) throw new CancelRequestError('state');
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
