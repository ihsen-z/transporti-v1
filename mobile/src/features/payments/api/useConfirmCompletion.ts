import { useMutation, useQueryClient } from '@tanstack/react-query';
import { isAxiosError } from 'axios';
import { apiClient } from '@/core/api/client';
import { jobDetailKey } from '@/features/tracking/api/useJobDetail';

export type ConfirmCompletionErrorKind = 'state' | 'forbidden' | 'network' | 'unknown';

export class ConfirmCompletionError extends Error {
  constructor(public readonly kind: ConfirmCompletionErrorKind) {
    super(kind);
    this.name = 'ConfirmCompletionError';
  }
}

// POST /api/v1/payments/confirm-completion/ — le client confirme avoir reçu sa
// marchandise, ce qui LIBÈRE l'escrow vers le transporteur.
//
// C'est le maillon qui fermait mal la boucle : le mobile n'appelait ce endpoint
// nulle part, si bien que le cycle s'arrêtait à la complétion déclarée par le
// transporteur et que l'argent restait séquestré jusqu'à l'expiration du délai
// d'auto-libération.
async function postConfirmCompletion(jobId: number): Promise<void> {
  try {
    await apiClient.post('payments/confirm-completion/', { job_id: jobId });
  } catch (err) {
    if (isAxiosError(err)) {
      if (err.response?.status === 400) throw new ConfirmCompletionError('state');
      if (err.response?.status === 403 || err.response?.status === 404) {
        throw new ConfirmCompletionError('forbidden');
      }
      if (!err.response) throw new ConfirmCompletionError('network');
    }
    throw new ConfirmCompletionError('unknown');
  }
}

export function useConfirmCompletion() {
  const qc = useQueryClient();
  return useMutation<void, ConfirmCompletionError, number>({
    mutationFn: postConfirmCompletion,
    onSuccess: (_data, jobId) => {
      void qc.invalidateQueries({ queryKey: jobDetailKey(jobId) });
      void qc.invalidateQueries({ queryKey: ['jobEscrow', jobId] });
      void qc.invalidateQueries({ queryKey: ['myRequests'] });
    },
  });
}
