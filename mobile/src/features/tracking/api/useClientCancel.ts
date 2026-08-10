import { useMutation, useQueryClient } from '@tanstack/react-query';
import { isAxiosError } from 'axios';
import { apiClient } from '@/core/api/client';
import { jobDetailKey } from './useJobDetail';

export type ClientCancelErrorKind = 'state' | 'forbidden' | 'network' | 'unknown';

export class ClientCancelError extends Error {
  constructor(public readonly kind: ClientCancelErrorKind) {
    super(kind);
    this.name = 'ClientCancelError';
  }
}

interface Args {
  jobId: number;
  reason: string;
}

// POST /api/v1/jobs/<id>/client-cancel/ — sortie du client après acceptation.
// Le motif est obligatoire côté serveur : il alimente la trace JobEvent, donc
// le taux d'annulation (K7).
async function postClientCancel({ jobId, reason }: Args): Promise<void> {
  try {
    await apiClient.post(`jobs/${jobId}/client-cancel/`, { reason });
  } catch (err) {
    if (isAxiosError(err)) {
      if (err.response?.status === 400) throw new ClientCancelError('state');
      if (err.response?.status === 403) throw new ClientCancelError('forbidden');
      if (!err.response) throw new ClientCancelError('network');
    }
    throw new ClientCancelError('unknown');
  }
}

export function useClientCancel() {
  const qc = useQueryClient();
  return useMutation<void, ClientCancelError, Args>({
    mutationFn: postClientCancel,
    onSuccess: (_data, { jobId }) => {
      void qc.invalidateQueries({ queryKey: jobDetailKey(jobId) });
      void qc.invalidateQueries({ queryKey: ['myRequests'] });
    },
  });
}
