import { useMutation } from '@tanstack/react-query';
import { isAxiosError } from 'axios';
import { apiClient } from '@/core/api/client';
import { useAuthStore } from '@/core/auth/authStore';
import type { LoginRequestDto, LoginResponseDto } from './dto';
import { mapUserDto } from './mapper';
import { LoginError, classifyLoginError } from './loginError';

// Réexport : l'UI importait ces symboles depuis ce module avant l'extraction.
export { LoginError, type LoginErrorKind } from './loginError';

// Appel réseau + normalisation d'erreur. baseURL = .../api/v1 ; le slash final
// est requis (Django APPEND_SLASH).
async function postLogin(body: LoginRequestDto): Promise<LoginResponseDto> {
  try {
    const res = await apiClient.post<LoginResponseDto>('auth/login/', body);
    return res.data;
  } catch (err) {
    if (isAxiosError(err)) {
      // On ne distingue pas « e-mail inconnu » de « mauvais mot de passe » côté
      // UI (pas d'énumération de comptes) ; en revanche on distingue bien un
      // refus d'identifiants d'un 400 d'infrastructure — voir classifyLoginError.
      throw new LoginError(classifyLoginError(err.response?.status, err.response?.data));
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
