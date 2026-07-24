import { useMutation } from '@tanstack/react-query';
import { isAxiosError } from 'axios';
import { apiClient } from '@/core/api/client';
import type { SendRequestBody } from './dto';

export type SendRequestErrorKind = 'validation' | 'network' | 'unknown';

export class SendRequestError extends Error {
  constructor(public readonly kind: SendRequestErrorKind) {
    super(kind);
    this.name = 'SendRequestError';
  }
}

interface SendArgs {
  jobId: number;
  body: SendRequestBody;
}

// POST jobs/<id>/requests/ — le client envoie une demande structurée.
async function postRequest({ jobId, body }: SendArgs): Promise<void> {
  try {
    await apiClient.post(`jobs/${jobId}/requests/`, body);
  } catch (err) {
    if (isAxiosError(err)) {
      // 400 couvre : prix invalide, COD > plafond, doublon, trajet indispo.
      if (err.response?.status === 400) throw new SendRequestError('validation');
      if (!err.response) throw new SendRequestError('network');
    }
    throw new SendRequestError('unknown');
  }
}

export function useSendTripRequest() {
  return useMutation<void, SendRequestError, SendArgs>({
    mutationFn: postRequest,
  });
}
