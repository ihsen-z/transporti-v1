import { useMutation } from '@tanstack/react-query';
import { isAxiosError } from 'axios';
import { apiClient } from '@/core/api/client';
import type { ChangePasswordRequestDto, ChangePasswordResponseDto } from './dto';

// Erreurs métier exposées à l'UI.
export type ChangePasswordErrorKind =
  | 'current_wrong'
  | 'new_weak'
  | 'validation'
  | 'network'
  | 'unknown';

export class ChangePasswordError extends Error {
  constructor(public readonly kind: ChangePasswordErrorKind) {
    super(kind);
    this.name = 'ChangePasswordError';
  }
}

// Le serveur renvoie {current_password} si l'actuel est faux, {new_password} si
// le nouveau échoue à la validation (force/longueur).
function mapValidation(data: unknown): ChangePasswordErrorKind {
  if (data && typeof data === 'object') {
    const errors = data as Record<string, unknown>;
    if ('current_password' in errors) return 'current_wrong';
    if ('new_password' in errors) return 'new_weak';
  }
  return 'validation';
}

// POST auth/change-password/ {current_password, new_password}. Les tokens JWT
// restent valides : pas de changement de session.
async function postChangePassword(
  body: ChangePasswordRequestDto,
): Promise<ChangePasswordResponseDto> {
  try {
    const res = await apiClient.post<ChangePasswordResponseDto>('auth/change-password/', body);
    return res.data;
  } catch (err) {
    if (isAxiosError(err)) {
      if (err.response?.status === 400) throw new ChangePasswordError(mapValidation(err.response.data));
      if (!err.response) throw new ChangePasswordError('network');
    }
    throw new ChangePasswordError('unknown');
  }
}

export function useChangePassword() {
  return useMutation<ChangePasswordResponseDto, ChangePasswordError, ChangePasswordRequestDto>({
    mutationFn: postChangePassword,
  });
}
