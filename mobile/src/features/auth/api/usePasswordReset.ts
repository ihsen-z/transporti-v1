import { useMutation } from '@tanstack/react-query';
import { isAxiosError } from 'axios';
import { apiClient } from '@/core/api/client';
import type { PasswordResetRequestDto, PasswordResetResponseDto } from './dto';

// Erreurs métier exposées à l'UI. Le serveur répond toujours 200 quand l'e-mail
// est fourni (anti-énumération) ; il ne reste donc que réseau / inattendu.
export type PasswordResetErrorKind = 'network' | 'unknown';

export class PasswordResetError extends Error {
  constructor(public readonly kind: PasswordResetErrorKind) {
    super(kind);
    this.name = 'PasswordResetError';
  }
}

// POST auth/password-reset/ {email}. baseURL = .../api/v1, slash final requis.
async function postPasswordReset(
  body: PasswordResetRequestDto,
): Promise<PasswordResetResponseDto> {
  try {
    const res = await apiClient.post<PasswordResetResponseDto>('auth/password-reset/', body);
    return res.data;
  } catch (err) {
    if (isAxiosError(err) && !err.response) throw new PasswordResetError('network');
    throw new PasswordResetError('unknown');
  }
}

// Hook de demande de réinitialisation. Pas de session ouverte : l'étape de
// confirmation (uid + token) passe par un lien e-mail / deep link (différé).
export function usePasswordReset() {
  return useMutation<PasswordResetResponseDto, PasswordResetError, PasswordResetRequestDto>({
    mutationFn: postPasswordReset,
  });
}
