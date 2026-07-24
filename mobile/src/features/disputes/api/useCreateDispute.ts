import { useMutation, useQueryClient } from '@tanstack/react-query';
import { isAxiosError } from 'axios';
import { apiClient } from '@/core/api/client';
import type { CreateDisputeBody } from './dto';

export type CreateDisputeErrorKind = 'validation' | 'forbidden' | 'network' | 'unknown';

export class CreateDisputeError extends Error {
  constructor(public readonly kind: CreateDisputeErrorKind) {
    super(kind);
    this.name = 'CreateDisputeError';
  }
}

// POST /api/v1/disputes/ — ouvre un litige sur un job où l'utilisateur est impliqué.
async function postDispute(body: CreateDisputeBody): Promise<void> {
  try {
    await apiClient.post('disputes/', body);
  } catch (err) {
    if (isAxiosError(err)) {
      if (err.response?.status === 400) throw new CreateDisputeError('validation');
      if (err.response?.status === 403 || err.response?.status === 404) {
        throw new CreateDisputeError('forbidden');
      }
      if (!err.response) throw new CreateDisputeError('network');
    }
    throw new CreateDisputeError('unknown');
  }
}

export function useCreateDispute() {
  const qc = useQueryClient();
  return useMutation<void, CreateDisputeError, CreateDisputeBody>({
    mutationFn: postDispute,
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['myDisputes'] });
    },
  });
}
