import { useMutation, useQueryClient } from '@tanstack/react-query';
import { isAxiosError } from 'axios';
import { apiClient } from '@/core/api/client';
import { extractServerMessage } from '@/core/api/serverMessage';
import type { CreateDisputeBody } from './dto';

export type CreateDisputeErrorKind = 'validation' | 'forbidden' | 'network' | 'unknown';

export class CreateDisputeError extends Error {
  // `serverMessage` porte le texte exact du backend, déjà rédigé en
  // français. Le reformuler ici ferait deux sources pour une même règle.
  constructor(
    public readonly kind: CreateDisputeErrorKind,
    public readonly serverMessage?: string,
  ) {
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
      if (err.response?.status === 400) {
        throw new CreateDisputeError('validation', extractServerMessage(err.response.data) ?? undefined);
      }
      if (err.response?.status === 403 || err.response?.status === 404) {
        throw new CreateDisputeError('forbidden', extractServerMessage(err.response.data) ?? undefined);
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
