import { useMutation, useQueryClient } from '@tanstack/react-query';
import { isAxiosError } from 'axios';
import { apiClient } from '@/core/api/client';

export type TransporterCancelErrorKind = 'state' | 'forbidden' | 'network' | 'unknown';

export class TransporterCancelError extends Error {
  constructor(public readonly kind: TransporterCancelErrorKind) {
    super(kind);
    this.name = 'TransporterCancelError';
  }
}

interface Args {
  jobId: number;
  reason: string;
}

// POST /api/v1/jobs/<id>/transporter-cancel/ — le transporteur assigné annule
// une mission MATCHED/IN_PROGRESS. Endpoint opérationnel côté serveur
// (TransporterCancelView : reverse l'offre, remet le job en PUBLISHED,
// rembourse l'escrow le cas échéant), jamais appelé par le mobile jusqu'ici.
// Le motif est obligatoire côté serveur (alimente JobEvent -> K7).
async function postTransporterCancel({ jobId, reason }: Args): Promise<void> {
  try {
    await apiClient.post(`jobs/${jobId}/transporter-cancel/`, { reason });
  } catch (err) {
    if (isAxiosError(err)) {
      if (err.response?.status === 400) throw new TransporterCancelError('state');
      if (err.response?.status === 403) throw new TransporterCancelError('forbidden');
      if (!err.response) throw new TransporterCancelError('network');
    }
    throw new TransporterCancelError('unknown');
  }
}

export function useTransporterCancel() {
  const qc = useQueryClient();
  return useMutation<void, TransporterCancelError, Args>({
    mutationFn: postTransporterCancel,
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['myMissions'] });
    },
  });
}
