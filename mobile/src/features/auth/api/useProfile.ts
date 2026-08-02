import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/core/api/client';
import { useAuthStore } from '@/core/auth/authStore';
import type { AuthUser } from '@/core/auth/authStore';
import type { ProfileResponseDto } from './dto';
import { mapUserDto } from './mapper';

// GET /api/v1/auth/profile/ — ProfileView renvoie { user: UserDto }. Sert à
// recharger l'utilisateur au démarrage quand seul le token a survécu (hydrate)
// mais que le profil n'est plus en mémoire.
//
// L'enveloppe `user` est essentielle : lire `res.data` directement rend toutes
// les clés `undefined`, et le garde-fou de mapUserDto rétrograde alors le rôle
// en CLIENT sans erreur — un transporteur se retrouve avec l'UI client.
async function fetchProfile(): Promise<AuthUser> {
  const res = await apiClient.get<ProfileResponseDto>('auth/profile/');
  return mapUserDto(res.data.user);
}

// N'est activé que si une session existe mais que le profil est manquant.
export function useProfile(enabled: boolean) {
  const setUser = useAuthStore((s) => s.setUser);
  const query = useQuery({
    queryKey: ['auth', 'profile'],
    queryFn: fetchProfile,
    enabled,
    staleTime: 5 * 60_000,
  });

  // Le store est alimenté depuis `data`, et NON depuis queryFn. Le cache est
  // persisté dans MMKV : au démarrage React Query le réhydrate en statut
  // `success` sans jamais exécuter queryFn. Un setUser placé dans la requête
  // ne se déclencherait donc pas, et l'app repartirait sans rôle — visible
  // surtout hors ligne, où le rafraîchissement de fond échoue en plus.
  const user = query.data;
  useEffect(() => {
    if (user !== undefined) setUser(user);
  }, [user, setUser]);

  return query;
}
