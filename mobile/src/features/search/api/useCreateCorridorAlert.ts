import { useMutation } from '@tanstack/react-query';
import { isAxiosError } from 'axios';
import { apiClient } from '@/core/api/client';
import type { CorridorAlertBody } from './dto';

export type CorridorAlertErrorKind = 'validation' | 'network' | 'unknown';

export class CorridorAlertError extends Error {
  constructor(public readonly kind: CorridorAlertErrorKind) {
    super(kind);
    this.name = 'CorridorAlertError';
  }
}

// POST corridor-alerts/ — D14 : abonnement à un corridor (Cas B, aucun résultat).
async function postAlert(body: CorridorAlertBody): Promise<void> {
  try {
    await apiClient.post('corridor-alerts/', body);
  } catch (err) {
    if (isAxiosError(err)) {
      if (err.response?.status === 400) throw new CorridorAlertError('validation');
      if (!err.response) throw new CorridorAlertError('network');
    }
    throw new CorridorAlertError('unknown');
  }
}

export function useCreateCorridorAlert() {
  return useMutation<void, CorridorAlertError, CorridorAlertBody>({
    mutationFn: postAlert,
  });
}
