import { useMutation, useQueryClient } from '@tanstack/react-query';
import { isAxiosError } from 'axios';
import { apiClient } from '@/core/api/client';

export type ConfirmStartErrorKind = 'state' | 'forbidden' | 'network' | 'unknown';

export class ConfirmStartError extends Error {
  constructor(public readonly kind: ConfirmStartErrorKind) {
    super(kind);
    this.name = 'ConfirmStartError';
  }
}

// POST jobs/<id>/confirm-start/ — COD uniquement : MATCHED -> IN_PROGRESS.
// (Le digital démarre automatiquement quand l'escrow est HELD.)
async function postConfirmStart(jobId: number): Promise<void> {
  try {
    await apiClient.post(`jobs/${jobId}/confirm-start/`);
  } catch (err) {
    if (isAxiosError(err)) {
      if (err.response?.status === 400) throw new ConfirmStartError('state');
      if (err.response?.status === 403) throw new ConfirmStartError('forbidden');
      if (!err.response) throw new ConfirmStartError('network');
    }
    throw new ConfirmStartError('unknown');
  }
}

export function useConfirmStart() {
  const qc = useQueryClient();
  return useMutation<void, ConfirmStartError, number>({
    mutationFn: postConfirmStart,
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['myMissions'] });
    },
  });
}
