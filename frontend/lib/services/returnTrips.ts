// Trajets retour — couche service du domaine (T1.3, lot 1).
//
// Fichier dédié plutôt qu'ajouté à `jobs.ts` : le CLAUDE.md §4 impose une
// couche service par domaine, et le lot 4 doit pouvoir extraire les autres
// domaines sur ce modèle.
//
// Aucun appel réseau ne doit vivre dans une page : c'est ici que passent la
// liste, l'édition, la prolongation, la duplication et la dépublication.

import { apiClient } from "@/lib/api/client";
import type { PaginatedResponse } from "./types";

/** Un trajet retour tel que renvoyé par GET /api/jobs/transporter/?type=owned */
export interface ReturnTrip {
  id: number;
  job_type: "TRANSPORT" | "MOVING";
  status:
    | "PUBLISHED"
    | "MATCHED"
    | "IN_PROGRESS"
    | "COMPLETED"
    | "CANCELLED"
    | "DISPUTED";
  pickup_address: string;
  pickup_governorate: string;
  dropoff_address: string;
  dropoff_governorate: string;
  scheduled_time: string;
  description: string;
  is_return_trip: boolean;
  available_capacity: string;
  /** B-2 — capacité structurée. `null` quand seul le libellé texte existe. */
  available_capacity_kg: string | null;
  available_capacity_m3: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * L'inventaire du transporteur : ses trajets retour, les plus récents d'abord.
 *
 * `?type=owned` est indispensable — sans lui l'endpoint renvoie l'union des
 * missions assignées et des retours publiés, paginée à 20. Un transporteur
 * ayant beaucoup de missions terminées ne verrait pas ses propres trajets.
 */
export async function getMyReturnTrips(): Promise<ReturnTrip[]> {
  const reponse = await apiClient.get<
    PaginatedResponse<ReturnTrip> | ReturnTrip[]
  >("/api/jobs/transporter/?type=owned");
  const liste = Array.isArray(reponse) ? reponse : (reponse.results ?? []);
  // L'endpoint renvoie l'union quand le paramètre est ignoré : on se protège
  // d'un retour trop large plutôt que d'afficher des missions dans l'inventaire.
  return liste.filter((trajet) => trajet.is_return_trip);
}

/** Édition d'un trajet publié. Le backend refuse tout autre statut. */
export async function updateReturnTrip(
  id: number,
  champs: Partial<
    Pick<
      ReturnTrip,
      | "pickup_governorate"
      | "dropoff_governorate"
      | "scheduled_time"
      | "description"
      | "available_capacity"
    >
  > & { available_capacity_kg?: number; available_capacity_m3?: number },
): Promise<unknown> {
  return apiClient.patch(`/api/jobs/${id}/return-trip/`, champs);
}

/**
 * Prolonger : repousser la date de départ de `jours`.
 *
 * Ce n'est pas un endpoint dédié mais une édition de `scheduled_time`. Le geste
 * mérite malgré tout un nom propre côté produit : un trajet qui expire sans que
 * le transporteur s'en aperçoive disparaît de la recherche client, ce que le
 * pivot classe comme létal pour l'inventaire.
 */
export async function extendReturnTrip(
  trajet: ReturnTrip,
  jours = 7,
): Promise<unknown> {
  const nouvelleDate = new Date(trajet.scheduled_time);
  nouvelleDate.setDate(nouvelleDate.getDate() + jours);
  return updateReturnTrip(trajet.id, {
    scheduled_time: nouvelleDate.toISOString(),
  });
}

/**
 * Dupliquer : republier le même corridor à une date future.
 *
 * Pas d'endpoint de duplication côté backend — c'est une création ordinaire
 * dont les champs sont repris. Utile pour un transporteur qui refait le même
 * trajet chaque semaine, en attendant les trajets récurrents (classés Future).
 */
export async function duplicateReturnTrip(
  trajet: ReturnTrip,
  joursApres = 7,
): Promise<unknown> {
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

  // La capacité structurée n'est reprise que si elle existe : on ne fabrique
  // jamais un chiffre absent de l'original.
  if (trajet.available_capacity_kg !== null) {
    charge.available_capacity_kg = Number(trajet.available_capacity_kg);
  }
  if (trajet.available_capacity_m3 !== null) {
    charge.available_capacity_m3 = Number(trajet.available_capacity_m3);
  }

  return apiClient.post("/api/jobs/return-trip/", charge);
}

/**
 * Dépublier. Suppression douce côté backend (statut CANCELLED), qui rejette et
 * notifie les demandes en attente — d'où la confirmation exigée dans l'écran.
 */
export async function unpublishReturnTrip(id: number): Promise<unknown> {
  return apiClient.delete(`/api/jobs/${id}/return-trip/`);
}

/** Un trajet dont la date est passée n'est plus visible dans la recherche. */
export function isExpired(trajet: ReturnTrip): boolean {
  return new Date(trajet.scheduled_time).getTime() < Date.now();
}

/** Jours restants avant expiration. Négatif si déjà expiré. */
export function daysUntilExpiry(trajet: ReturnTrip): number {
  const millisecondesParJour = 24 * 60 * 60 * 1000;
  const ecart = new Date(trajet.scheduled_time).getTime() - Date.now();
  return Math.ceil(ecart / millisecondesParJour);
}

/**
 * Estimation de prix a partir de coordonnees.
 *
 * `estimate_price` cote backend n'accepte QUE des coordonnees, jamais des
 * gouvernorats : la resolution des centroides se fait avant l'appel.
 */
export interface EstimationDePrix {
  min: number;
  max: number;
  distance_km: number;
  grid_source: string;
}

export function estimatePrice(
  coordonnees: {
    pickup_lat: number;
    pickup_lng: number;
    dropoff_lat: number;
    dropoff_lng: number;
  },
  jobType: string,
): Promise<EstimationDePrix> {
  return apiClient.post<EstimationDePrix>("/api/jobs/estimate-price/", {
    ...coordonnees,
    job_type: jobType,
  });
}

/**
 * Publie une annonce : trajet retour ou demande classique.
 *
 * L'endpoint DIFFERE selon le cas, et c'est la seule chose qui change. Le
 * choix vivait dans l'ecran, en une ligne facile a manquer.
 */
export async function publishJob(
  estUnTrajetRetour: boolean,
  charge: Record<string, unknown>,
): Promise<{ message: string; job: { id: number } }> {
  return apiClient.post<{ message: string; job: { id: number } }>(
    estUnTrajetRetour ? "/api/jobs/return-trip/" : "/api/jobs/",
    charge,
  );
}

/**
 * Publie un trajet retour et rend les demandes ouvertes du corridor.
 *
 * Le backend repond avec `matching_requests` : ce sont les demandes deja en
 * attente sur ce corridor, que le transporteur peut monetiser tout de suite.
 * C'est le rapprochement inverse du Sprint 5 — le rendre au meme moment que
 * la publication est ce qui lui donne sa valeur.
 */
export async function publishReturnTrip<TDemande>(
  charge: Record<string, unknown>,
): Promise<{
  matching_requests_count?: number;
  matching_requests?: TDemande[];
}> {
  return apiClient.post(`/api/jobs/return-trip/`, charge);
}

/**
 * Combien de trajets retour couvrent ce corridor.
 *
 * Sert a dire au client, AVANT qu'il publie, qu'un retour existe deja sur son
 * trajet — c'est la promesse du pivot prise a l'endroit ou elle compte.
 * La date est facultative : sans elle, le compte porte sur tout le corridor.
 */
export async function countMatchingReturnTrips(
  depart: string,
  arrivee: string,
  date?: string,
): Promise<number> {
  const parametres = new URLSearchParams({
    pickup_governorate: depart,
    dropoff_governorate: arrivee,
  });
  if (date) parametres.append("date", date);
  const reponse = await apiClient.get<{ count: number }>(
    `/api/return-trips/match/?${parametres.toString()}`,
  );
  return reponse.count ?? 0;
}
