import { useMutation, useQueryClient, type QueryClient } from '@tanstack/react-query';
import { isAxiosError } from 'axios';
import { apiClient } from '@/core/api/client';
import type { TransporterProfileDto } from './dto';

// Erreurs métier exposées à l'UI (pas de fuite d'axios dans l'écran) — même
// convention que `useUpdateProfile`.
export type UpdateServiceAreasErrorKind = 'validation' | 'network' | 'unknown';

export class UpdateServiceAreasError extends Error {
  constructor(public readonly kind: UpdateServiceAreasErrorKind) {
    super(kind);
    this.name = 'UpdateServiceAreasError';
  }
}

interface Reponse {
  message: string;
  profile: TransporterProfileDto;
}

/**
 * PATCH transporter/profile/me/ — les zones de service du transporteur.
 *
 * Endpoint DISTINCT de celui de `useUpdateProfile` (PUT auth/profile/), qui ne
 * porte que l'identité (prénom, nom, téléphone) et ignore `service_areas`.
 * Vérifié par appel réel sur les deux surfaces, /api/ et /api/v1/ : les deux
 * répondent 200 et la valeur persiste.
 *
 * On n'envoie QUE `service_areas`. Le sérialiseur accepte un PATCH partiel, et
 * réémettre les autres champs risquerait d'écraser une valeur modifiée
 * ailleurs entre-temps.
 */
export async function patchServiceAreas(zones: readonly string[]): Promise<Reponse> {
  try {
    const res = await apiClient.patch<Reponse>('transporter/profile/me/', {
      service_areas: zones,
    });
    return res.data;
  } catch (err) {
    if (isAxiosError(err)) {
      if (err.response?.status === 400) throw new UpdateServiceAreasError('validation');
      if (!err.response) throw new UpdateServiceAreasError('network');
    }
    throw new UpdateServiceAreasError('unknown');
  }
}

/**
 * Range la réponse du PATCH dans le cache, au lieu de relire le profil.
 *
 * ON ÉCRIT, ON N'INVALIDE PAS. Le profil public est mis en cache 120 s CÔTÉ
 * SERVEUR (`CACHE_TTL_PROFILE`) : une invalidation déclencherait une relecture
 * qui rendrait la valeur d'AVANT pendant deux minutes. Constaté par appel réel —
 * après un PATCH à `[]`, le GET renvoyait encore les anciennes zones. En
 * rouvrant le panneau dans cet intervalle, le transporteur aurait vu ses
 * anciennes zones et, en enregistrant, annulé sa propre modification, sans le
 * moindre signal.
 *
 * Le PATCH, lui, renvoie le profil à jour : c'est la seule source qui ne peut
 * pas être périmée.
 *
 * Fonction exportée à part, et non écrite dans `onSuccess` : la vérifier
 * autrement demanderait de rendre un hook, ce qui laisse des écouteurs
 * react-query actifs et fait échouer jest sur une fuite de worker.
 */
export function rangerProfilDansLeCache(
  queryClient: QueryClient,
  userId: number | null,
  profil: TransporterProfileDto,
): void {
  if (userId !== null) {
    queryClient.setQueryData(['transporterProfile', userId], profil);
  }
  // `performance` calcule les corridors sous-desservis À PARTIR des zones :
  // elle doit bien être recalculée.
  void queryClient.invalidateQueries({ queryKey: ['performance'] });
}

/**
 * @param userId le transporteur connecté, pour ranger la réponse dans le cache
 *   sous la même clé que `useTransporterProfile`.
 */
export function useUpdateServiceAreas(userId: number | null) {
  const queryClient = useQueryClient();

  return useMutation<Reponse, UpdateServiceAreasError, readonly string[]>({
    mutationFn: patchServiceAreas,
    onSuccess: (data) => rangerProfilDansLeCache(queryClient, userId, data.profile),
  });
}
