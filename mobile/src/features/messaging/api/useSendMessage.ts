import { useMutation, useQueryClient } from '@tanstack/react-query';
import { isAxiosError } from 'axios';
import { apiClient } from '@/core/api/client';

export type SendMessageErrorKind = 'locked' | 'forbidden' | 'network' | 'unknown';

export class SendMessageError extends Error {
  constructor(public readonly kind: SendMessageErrorKind) {
    super(kind);
    this.name = 'SendMessageError';
  }
}

interface SendArgs {
  jobId: number;
  content: string;
}

// POST /api/v1/jobs/<id>/messages/ — envoi d'un message.
async function postMessage({ jobId, content }: SendArgs): Promise<void> {
  try {
    await apiClient.post(`jobs/${jobId}/messages/`, { content });
  } catch (err) {
    if (isAxiosError(err)) {
      // 400 = conversation verrouillée / contenu invalide.
      if (err.response?.status === 400) throw new SendMessageError('locked');
      // 403 ou 404 = on n'est pas (ou plus) participant de la mission : le
      // serveur répond 404 à un tiers pour ne pas révéler que la mission existe.
      const status = err.response?.status;
      if (status === 403 || status === 404) throw new SendMessageError('forbidden');
      if (!err.response) throw new SendMessageError('network');
    }
    throw new SendMessageError('unknown');
  }
}

export function useSendMessage() {
  const qc = useQueryClient();
  return useMutation<void, SendMessageError, SendArgs>({
    mutationFn: postMessage,
    onSuccess: (_data, vars) => {
      void qc.invalidateQueries({ queryKey: ['jobMessages', vars.jobId] });
      void qc.invalidateQueries({ queryKey: ['conversations'] });
    },
  });
}
