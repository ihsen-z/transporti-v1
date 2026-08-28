import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/core/api/client';
import { fetchAllPages } from '@/core/api/fetchAllPages';
import type { ReturnTripDto } from './dto';

// T1.3 (lot 1) — l'inventaire des trajets retour du transporteur.
//
// Pendant mobile de `frontend/lib/services/returnTrips.ts`. Sémantique
// identique des deux côtés : la décision 6 impose de livrer chaque écran sur
// les deux plateformes, et deux règles divergentes sur le cycle de vie de
// l'inventaire produiraient deux comportements différents pour le même trajet.
//
// Le pivot classe ce cycle de vie en Core : « un inventaire non gérable pollue
// la recherche client ».

const CLE = ['myReturnTrips'] as const;

// `?type=owned` est indispensable : sans lui l'endpoint renvoie l'union des
// missions assignées et des retours publiés, paginée à 20 — c'est le bug 5.1
// déjà rencontré sur useMyMissions. Le filtre sur `is_return_trip` en dessous
// est une seconde ligne de défense : si le paramètre était un jour ignoré,
// l'inventaire afficherait des missions étrangères.
async function fetchMyReturnTrips(): Promise<ReturnTripDto[]> {
  const resultats = await fetchAllPages<ReturnTripDto>('jobs/transporter/', {
    type: 'owned',
  });
  return resultats.filter((trajet) => trajet.is_return_trip);
}

export function useMyReturnTrips() {
  return useQuery({ queryKey: CLE, queryFn: fetchMyReturnTrips });
}

/** Invalide l'inventaire après toute mutation, pour éviter un écran périmé. */
function useInvalidation() {
  const client = useQueryClient();
  return () => client.invalidateQueries({ queryKey: CLE });
}

/**
 * Prolonger : repousser la date de départ. Ce n'est pas un endpoint dédié mais
 * une édition de `scheduled_time`. Le geste mérite un nom propre côté produit :
 * un trajet qui expire sans que le transporteur s'en aperçoive disparaît de la
 * recherche client.
 */
export function useExtendReturnTrip() {
  const invalider = useInvalidation();
  return useMutation({
    mutationFn: async ({
      trajet,
      jours = 7,
    }: {
      trajet: ReturnTripDto;
      jours?: number;
    }) => {
      const date = new Date(trajet.scheduled_time);
      date.setDate(date.getDate() + jours);
      const res = await apiClient.patch(`jobs/${trajet.id}/return-trip/`, {
        scheduled_time: date.toISOString(),
      });
      return res.data;
    },
    onSuccess: invalider,
  });
}

/**
 * Dupliquer : republier le même corridor à une date future. Pas d'endpoint de
 * duplication côté backend — c'est une création ordinaire dont les champs sont
 * repris.
 */
export function useDuplicateReturnTrip() {
  const invalider = useInvalidation();
  return useMutation({
    mutationFn: async ({
      trajet,
      joursApres = 7,
    }: {
      trajet: ReturnTripDto;
      joursApres?: number;
    }) => {
      const date = new Date(trajet.scheduled_time);
      date.setDate(date.getDate() + joursApres);

      const charge: Record<string, unknown> = {
        job_type: trajet.job_type,
        pickup_address: trajet.pickup_address,
        pickup_governorate: trajet.pickup_governorate,
        dropoff_address: trajet.dropoff_address,
        dropoff_governorate: trajet.dropoff_governorate,
        scheduled_time: date.toISOString(),
        description: trajet.description,
        available_capacity: trajet.available_capacity,
      };

      // La capacité structurée n'est reprise que si elle existe : on ne
      // fabrique jamais un chiffre absent de l'original.
      if (trajet.available_capacity_kg !== null) {
        charge.available_capacity_kg = Number(trajet.available_capacity_kg);
      }
      if (trajet.available_capacity_m3 !== null) {
        charge.available_capacity_m3 = Number(trajet.available_capacity_m3);
      }

      const res = await apiClient.post('jobs/return-trip/', charge);
      return res.data;
    },
    onSuccess: invalider,
  });
}

/**
 * Dépublier. Suppression douce côté backend (statut CANCELLED), qui rejette et
 * notifie les demandes en attente — d'où la confirmation exigée dans l'écran.
 */
export function useUnpublishReturnTrip() {
  const invalider = useInvalidation();
  return useMutation({
    mutationFn: async (id: number) => {
      const res = await apiClient.delete(`jobs/${id}/return-trip/`);
      return res.data;
    },
    onSuccess: invalider,
  });
}

/** Un trajet dont la date est passée n'est plus visible dans la recherche. */
export function isExpired(trajet: ReturnTripDto): boolean {
  return new Date(trajet.scheduled_time).getTime() < Date.now();
}

/** Jours restants avant expiration. Négatif si déjà expiré. */
export function daysUntilExpiry(trajet: ReturnTripDto): number {
  const parJour = 24 * 60 * 60 * 1000;
  return Math.ceil(
    (new Date(trajet.scheduled_time).getTime() - Date.now()) / parJour,
  );
}
