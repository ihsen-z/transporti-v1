import { useMutation } from '@tanstack/react-query';
import { isAxiosError } from 'axios';
import { apiClient } from '@/core/api/client';
import type { PasswordResetConfirmRequestDto, PasswordResetConfirmResponseDto } from './dto';

// Le serveur renvoie 400 pour un lien invalide/expiré (uid ou token) OU pour
// un mot de passe trop court — deux causes distinctes, deux messages.
export type PasswordResetConfirmErrorKind = 'invalid_link' | 'weak_password' | 'network' | 'unknown';

export class PasswordResetConfirmError extends Error {
  constructor(public readonly kind: PasswordResetConfirmErrorKind) {
    super(kind);
    this.name = 'PasswordResetConfirmError';
  }
}

function mapError(data: unknown): PasswordResetConfirmErrorKind {
  const message = data && typeof data === 'object' ? (data as { error?: string }).error : undefined;
  if (typeof message === 'string' && message.toLowerCase().includes('caractères')) {
    return 'weak_password';
  }
  return 'invalid_link';
}

// POST auth/password-reset/confirm/ {uid, token, new_password}.
async function postPasswordResetConfirm(
  body: PasswordResetConfirmRequestDto,
): Promise<PasswordResetConfirmResponseDto> {
  try {
    const res = await apiClient.post<PasswordResetConfirmResponseDto>(
      'auth/password-reset/confirm/',
      body,
    );
    return res.data;
  } catch (err) {
    if (isAxiosError(err)) {
      if (err.response?.status === 400) throw new PasswordResetConfirmError(mapError(err.response.data));
      if (!err.response) throw new PasswordResetConfirmError('network');
    }
    throw new PasswordResetConfirmError('unknown');
  }
}

export function usePasswordResetConfirm() {
  return useMutation<
    PasswordResetConfirmResponseDto,
    PasswordResetConfirmError,
    PasswordResetConfirmRequestDto
  >({
    mutationFn: postPasswordResetConfirm,
  });
}
