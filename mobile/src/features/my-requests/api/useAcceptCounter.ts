import { useMutation, useQueryClient } from '@tanstack/react-query';
import { isAxiosError } from 'axios';
import { apiClient } from '@/core/api/client';
import type { AcceptCounterResponse } from './dto';

export type AcceptCounterErrorKind = 'state' | 'forbidden' | 'network' | 'unknown';

export class AcceptCounterError extends Error {
  constructor(public readonly kind: AcceptCounterErrorKind) {
    super(kind);
    this.name = 'AcceptCounterError';
  }
}

// POST /api/v1/trip-requests/<id>/accept-counter/ — le client accepte la
// contre-proposition. La réponse porte le job (avec delivery_pin).
async function postAcceptCounter(requestId: number): Promise<AcceptCounterResponse> {
  try {
    const res = await apiClient.post<AcceptCounterResponse>(
      `trip-requests/${requestId}/accept-counter/`,
    );
    return res.data;
  } catch (err) {
    if (isAxiosError(err)) {
      if (err.response?.status === 400) throw new AcceptCounterError('state');
      if (err.response?.status === 403) throw new AcceptCounterError('forbidden');
      if (!err.response) throw new AcceptCounterError('network');
    }
    throw new AcceptCounterError('unknown');
  }
}

export function useAcceptCounter() {
  const qc = useQueryClient();
  return useMutation<AcceptCounterResponse, AcceptCounterError, number>({
    mutationFn: postAcceptCounter,
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['myRequests'] });
    },
  });
}
