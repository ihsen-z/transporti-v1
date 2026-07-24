import { useMutation, useQueryClient } from '@tanstack/react-query';
import { isAxiosError } from 'axios';
import { apiClient } from '@/core/api/client';
import type { CompleteRequest } from './dto';

export type CompleteErrorKind =
  | 'pin_required'
  | 'pin_invalid'
  | 'state'
  | 'forbidden'
  | 'network'
  | 'unknown';

export class CompleteError extends Error {
  constructor(public readonly kind: CompleteErrorKind) {
    super(kind);
    this.name = 'CompleteError';
  }
}

interface CompleteArgs {
  jobId: number;
  body: CompleteRequest;
}

// POST jobs/<id>/complete/ — clôture par PIN (D7). Le backend renvoie
// un `code` (PIN_REQUIRED / PIN_INVALID) qu'on remonte en type métier.
async function postComplete({ jobId, body }: CompleteArgs): Promise<void> {
  try {
    await apiClient.post(`jobs/${jobId}/complete/`, body);
  } catch (err) {
    if (isAxiosError(err)) {
      // data est typé unknown par axios : cast ciblé sur le champ `code`.
      const code = (err.response?.data as { code?: string } | undefined)?.code;
      if (err.response?.status === 400) {
        if (code === 'PIN_REQUIRED') throw new CompleteError('pin_required');
        if (code === 'PIN_INVALID') throw new CompleteError('pin_invalid');
        throw new CompleteError('state');
      }
      if (err.response?.status === 403) throw new CompleteError('forbidden');
      if (!err.response) throw new CompleteError('network');
    }
    throw new CompleteError('unknown');
  }
}

export function useCompleteJob() {
  const qc = useQueryClient();
  return useMutation<void, CompleteError, CompleteArgs>({
    mutationFn: postComplete,
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['myMissions'] });
    },
  });
}
