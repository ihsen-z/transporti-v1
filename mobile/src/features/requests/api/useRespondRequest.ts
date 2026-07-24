import { useMutation, useQueryClient } from '@tanstack/react-query';
import { isAxiosError } from 'axios';
import { apiClient } from '@/core/api/client';
import type { RespondRequest } from './dto';

export type RespondErrorKind = 'validation' | 'forbidden' | 'network' | 'unknown';

export class RespondError extends Error {
  constructor(public readonly kind: RespondErrorKind) {
    super(kind);
    this.name = 'RespondError';
  }
}

interface RespondArgs {
  requestId: number;
  jobId: number; // pour l'invalidation ciblée
  body: RespondRequest;
}

// POST /api/v1/trip-requests/<id>/respond/ — accept | reject | counter.
async function postRespond({ requestId, body }: RespondArgs): Promise<void> {
  try {
    await apiClient.post(`trip-requests/${requestId}/respond/`, body);
  } catch (err) {
    if (isAxiosError(err)) {
      if (err.response?.status === 400) throw new RespondError('validation');
      if (err.response?.status === 403) throw new RespondError('forbidden');
      if (!err.response) throw new RespondError('network');
    }
    throw new RespondError('unknown');
  }
}

export function useRespondRequest() {
  const qc = useQueryClient();
  return useMutation<void, RespondError, RespondArgs>({
    mutationFn: postRespond,
    onSuccess: (_data, vars) => {
      // Rafraîchit les demandes du trajet + la liste des trajets (une
      // acceptation ferme le trajet -> il quitte la liste PUBLISHED).
      void qc.invalidateQueries({ queryKey: ['jobRequests', vars.jobId] });
      void qc.invalidateQueries({ queryKey: ['myReturnTrips'] });
    },
  });
}
