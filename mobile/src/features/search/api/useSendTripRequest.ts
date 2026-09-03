import { useMutation } from '@tanstack/react-query';
import { isAxiosError } from 'axios';
import { apiClient } from '@/core/api/client';
import type { SendRequestBody } from './dto';
import { SendRequestError, classifySendRequestError } from './requestError';

interface SendArgs {
  jobId: number;
  body: SendRequestBody;
}

// POST jobs/<id>/requests/ — le client envoie une demande sur un trajet retour.
//
// La classification vit dans `requestError.ts` (fonction pure, testée) : ce
// hook ne fait que porter la réponse du serveur jusqu'à l'écran sans la
// remplacer par un message générique.
async function postRequest({ jobId, body }: SendArgs): Promise<void> {
  try {
    await apiClient.post(`jobs/${jobId}/requests/`, body);
  } catch (err) {
    if (isAxiosError(err)) {
      throw new SendRequestError(
        classifySendRequestError(err.response?.status, err.response?.data),
      );
    }
    throw new SendRequestError({ kind: 'unknown', field: null, serverMessage: null });
  }
}

export function useSendTripRequest() {
  return useMutation<void, SendRequestError, SendArgs>({
    mutationFn: postRequest,
  });
}
