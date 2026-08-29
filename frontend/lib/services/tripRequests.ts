// Demandes reçues sur les trajets retour — couche service du domaine (T2.1).
//
// Pendant du domaine « trajets retour » côté demandes : un trajet est une
// offre de capacité, une demande est une transaction proposée dessus. Fichier
// dédié conformément au CLAUDE.md §4.

import { apiClient } from "@/lib/api/client";
import type { PaginatedResponse } from "./types";

export type TripRequestStatus =
  | "PENDING"
  | "COUNTERED"
  | "ACCEPTED"
  | "REJECTED"
  | "CANCELLED";

/** Une demande reçue, telle que renvoyée par ReturnTripRequestSerializer. */
export interface TripRequest {
  id: number;
  /** Identifiant du trajet retour concerné. */
  job: number;
  status: TripRequestStatus;
  description: string;
  photos: string[];
  proposed_price: string;
  payment_method: "DIGITAL" | "COD";
  counter_price: string | null;
  response_message: string;
  client_name: string;
  job_pickup: string;
  job_dropoff: string;
  job_date: string;
  created_at: string;
  updated_at: string;
}

/**
 * Les onglets de la boîte de réception, dans l'ordre de ce qui attend une
 * décision. Le tri primaire est « qui doit agir maintenant », pas la date.
 */
export const ONGLETS = {
  "a-decider": ["PENDING"] as TripRequestStatus[],
  negociation: ["COUNTERED"] as TripRequestStatus[],
  archivees: ["ACCEPTED", "REJECTED", "CANCELLED"] as TripRequestStatus[],
} as const;

export type OngletId = keyof typeof ONGLETS;

/**
 * Toutes les demandes reçues, tous trajets confondus (B-5).
 *
 * Avant cet endpoint, les demandes n'étaient lisibles que trajet par trajet :
 * un transporteur avec trois retours en ligne devait visiter trois écrans pour
 * savoir ce qui attendait sa décision.
 */
export async function getReceivedRequests(
  statuts?: TripRequestStatus[],
): Promise<TripRequest[]> {
  const requete = statuts?.length ? `?status=${statuts.join(",")}` : "";
  const reponse = await apiClient.get<
    PaginatedResponse<TripRequest> | TripRequest[]
  >(`/api/trip-requests/received/${requete}`);
  return Array.isArray(reponse) ? reponse : (reponse.results ?? []);
}

/** Accepter : ferme le trajet et bascule dans le circuit de paiement. */
export async function acceptRequest(id: number): Promise<unknown> {
  return apiClient.post(`/api/trip-requests/${id}/respond/`, {
    action: "accept",
  });
}

/** Refuser, avec un motif facultatif transmis au client. */
export async function rejectRequest(
  id: number,
  message?: string,
): Promise<unknown> {
  return apiClient.post(`/api/trip-requests/${id}/respond/`, {
    action: "reject",
    ...(message ? { message } : {}),
  });
}

/**
 * Contre-proposer un prix. La demande passe en COUNTERED : la balle est dans
 * le camp du client, et elle quitte l'onglet « à décider ».
 */
export async function counterRequest(
  id: number,
  prix: number,
  message?: string,
): Promise<unknown> {
  return apiClient.post(`/api/trip-requests/${id}/respond/`, {
    action: "counter",
    counter_price: prix,
    ...(message ? { message } : {}),
  });
}

/** Ancienneté lisible d'une demande — « il y a 2 h ». */
export function anciennete(demande: TripRequest): string {
  const minutes = Math.floor(
    (Date.now() - new Date(demande.created_at).getTime()) / 60000,
  );
  if (minutes < 1) return "à l'instant";
  if (minutes < 60) return `il y a ${minutes} min`;
  const heures = Math.floor(minutes / 60);
  if (heures < 24) return `il y a ${heures} h`;
  const jours = Math.floor(heures / 24);
  return `il y a ${jours} j`;
}
