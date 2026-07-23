import { useMutation } from '@tanstack/react-query';
import { isAxiosError } from 'axios';
import { apiClient } from '@/core/api/client';
import { useAuthStore } from '@/core/auth/authStore';
import type { LoginRequestDto, LoginResponseDto } from './dto';
import { mapUserDto } from './mapper';

// Types d'erreur métier exposés à l'UI (pas de fuite d'axios dans l'écran).
export type LoginErrorKind = 'invalid_credentials' | 'network' | 'unknown';

export class LoginError extends Error {
  constructor(public readonly kind: LoginErrorKind) {
    super(kind);
    this.name = 'LoginError';
  }
}

// Appel réseau + normalisation d'erreur. baseURL = .../api/v1 ; le slash final
// est requis (Django APPEND_SLASH).
async function postLogin(body: LoginRequestDto): Promise<LoginResponseDto> {
  try {
    const res = await apiClient.post<LoginResponseDto>('auth/login/', body);
    return res.data;
  } catch (err) {
    if (isAxiosError(err)) {
      // 400 = identifiants invalides (serializer.errors). On ne distingue pas
      // "email inconnu" de "mauvais mot de passe" côté UI (pas d'énumération).
      if (err.response?.status === 400) throw new LoginError('invalid_credentials');
      if (!err.response) throw new LoginError('network');
    }
    throw new LoginError('unknown');
  }
}

// Hook de connexion : sur succès, ouvre la session (tokens + user en store).
export function useLogin() {
  const setSession = useAuthStore((s) => s.setSession);
  return useMutation<LoginResponseDto, LoginError, LoginRequestDto>({
    mutationFn: postLogin,
    onSuccess: async (data) => {
      await setSession(
        mapUserDto(data.user),
        data.tokens.access,
        data.tokens.refresh,
      );
    },
  });
}
