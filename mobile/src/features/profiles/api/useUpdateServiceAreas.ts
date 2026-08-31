import { useMutation, useQueryClient } from '@tanstack/react-query';
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
async function patchServiceAreas(zones: readonly string[]): Promise<Reponse> {
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

export function useUpdateServiceAreas() {
  const queryClient = useQueryClient();

  return useMutation<Reponse, UpdateServiceAreasError, readonly string[]>({
    mutationFn: patchServiceAreas,
    onSuccess: () => {
      // Le profil public est MIS EN CACHE 120 s côté serveur
      // (CACHE_TTL_PROFILE) : invalider ici ne garantit donc pas de relire la
      // valeur qu'on vient d'écrire. C'est pourquoi l'écran s'appuie sur le
      // profil RENVOYÉ par ce PATCH, et non sur une relecture. L'invalidation
      // reste utile pour les écrans qui rouvriront plus tard.
      void queryClient.invalidateQueries({ queryKey: ['transporterProfile'] });
      void queryClient.invalidateQueries({ queryKey: ['performance'] });
    },
  });
}
