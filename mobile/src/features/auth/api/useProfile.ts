import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/core/api/client';
import { useAuthStore } from '@/core/auth/authStore';
import type { AuthUser } from '@/core/auth/authStore';
import type { UserDto } from './dto';
import { mapUserDto } from './mapper';

// GET /api/v1/auth/profile/ — ProfileView renvoie le UserDto (+ champs profil
// ignorés ici). Sert à recharger l'utilisateur au démarrage quand seul le
// token a survécu (hydrate) mais que le profil n'est plus en mémoire.
async function fetchProfile(): Promise<AuthUser> {
  const res = await apiClient.get<UserDto>('auth/profile/');
  return mapUserDto(res.data);
}

// N'est activé que si une session existe mais que le profil est manquant.
export function useProfile(enabled: boolean) {
  const setUser = useAuthStore((s) => s.setUser);
  return useQuery({
    queryKey: ['auth', 'profile'],
    queryFn: async () => {
      const user = await fetchProfile();
      setUser(user);
      return user;
    },
    enabled,
    staleTime: 5 * 60_000,
  });
}
