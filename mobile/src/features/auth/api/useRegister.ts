import { useMutation } from '@tanstack/react-query';
import { isAxiosError } from 'axios';
import { apiClient } from '@/core/api/client';
import { useAuthStore } from '@/core/auth/authStore';
import type { RegisterRequestDto, RegisterResponseDto } from './dto';
import { mapUserDto } from './mapper';

// Types d'erreur métier exposés à l'UI (pas de fuite d'axios dans l'écran).
export type RegisterErrorKind =
  | 'email_taken'
  | 'phone_taken'
  | 'validation'
  | 'network'
  | 'unknown';

export class RegisterError extends Error {
  constructor(public readonly kind: RegisterErrorKind) {
    super(kind);
    this.name = 'RegisterError';
  }
}

// Traduit les erreurs de champ du serializer (400) en une cause métier. On
// privilégie les cas connus (email/téléphone déjà pris) ; sinon `validation`.
function mapValidation(data: unknown): RegisterErrorKind {
  if (data && typeof data === 'object') {
    const errors = data as Record<string, unknown>;
    if ('email' in errors) return 'email_taken';
    if ('phone' in errors) return 'phone_taken';
  }
  return 'validation';
}

// Appel réseau + normalisation d'erreur. baseURL = .../api/v1 ; slash final
// requis (Django APPEND_SLASH). 201 = inscription réussie (auto-login).
async function postRegister(body: RegisterRequestDto): Promise<RegisterResponseDto> {
  try {
    const res = await apiClient.post<RegisterResponseDto>('auth/register/', body);
    return res.data;
  } catch (err) {
    if (isAxiosError(err)) {
      if (err.response?.status === 400) throw new RegisterError(mapValidation(err.response.data));
      if (!err.response) throw new RegisterError('network');
    }
    throw new RegisterError('unknown');
  }
}

// Hook d'inscription : sur succès, ouvre la session (comme le login).
export function useRegister() {
  const setSession = useAuthStore((s) => s.setSession);
  return useMutation<RegisterResponseDto, RegisterError, RegisterRequestDto>({
    mutationFn: postRegister,
    onSuccess: async (data) => {
      await setSession(
        mapUserDto(data.user),
        data.tokens.access,
        data.tokens.refresh,
      );
    },
  });
}
