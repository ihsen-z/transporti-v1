/**
 * Réservation, escrow et initiation de paiement — lot 4.2.
 *
 * L'écran `/reservation/[jobId]` déclarait `BookingData`, `JobData` et
 * `EscrowData`… puis appelait l'API en `any`. Les types étaient écrits et
 * ignorés : le pire des deux mondes, puisqu'ils donnaient l'illusion d'un
 * contrat vérifié.
 */
import { apiClient } from "@/lib/api/client";

export interface Reservation {
  id: number;
  job: number;
  final_price: string;
  commission_rate: string;
  payment_method: "DIGITAL" | "COD";
  cod_allowed: boolean;
  created_at: string;
  accepted_offer: number;
}

export interface TransportReserve {
  id: number;
  job_type: string;
  status: string;
  pickup_address: string;
  dropoff_address: string;
  pickup_governorate: string;
  dropoff_governorate: string;
  /**
   * DATE DU TRANSPORT. Le champ s'appelle `scheduled_time` cote API ; l'ecran
   * de reservation declarait `scheduled_date`, qui n'existe pas, et n'a donc
   * JAMAIS affiche la date — le bloc conditionnel etait toujours faux.
   */
  scheduled_time: string;
  accepted_transporter?: {
    name: string;
    phone?: string;
    total_price: number;
  };
  owner?: {
    id: number;
  };
}

export interface Escrow {
  id: number;
  status: string;
  amount: string;
  created_at: string;
}

/**
 * Le transport, pour les ecrans de reservation et de paiement.
 *
 * Generique : l'ecran /jobs/<id>/book en lit davantage de champs. Unifier les
 * deux formes est un chantier a part — elles decrivent le meme endpoint et
 * divergeaient deja sur le nom de la date.
 */
export function getReservedJob<T = TransportReserve>(
  jobId: number,
): Promise<T> {
  return apiClient.get<T>(`/api/jobs/${jobId}/`);
}

/**
 * La réservation d'un transport, ou `null` s'il n'y en a pas encore.
 *
 * L'absence est un état NORMAL : un transport attribué n'est pas encore payé.
 * L'échec est donc traduit en `null` plutôt que propagé — mais seulement ici,
 * là où l'absence a un sens.
 */
export async function getBooking(jobId: number): Promise<Reservation | null> {
  try {
    return await apiClient.get<Reservation>(`/api/jobs/${jobId}/booking/`);
  } catch {
    return null;
  }
}

/** L'escrow du transport, ou `null`. Même raisonnement que la réservation. */
export async function getEscrow(jobId: number): Promise<Escrow | null> {
  try {
    const reponse = await apiClient.get<Escrow[] | { results?: Escrow[] }>(
      `/api/jobs/${jobId}/escrow/`,
    );
    if (Array.isArray(reponse)) return reponse[0] ?? null;
    return reponse.results?.[0] ?? null;
  } catch {
    return null;
  }
}

/**
 * Démarre un paiement et rend l'URL de la passerelle.
 *
 * DÉFINITION UNIQUE : cet appel existait en double, dans l'écran de détail
 * (avec `platform: "web"`) et dans l'écran de réservation (sans). Deux charges
 * utiles différentes sur le même endpoint, sans que rien ne dise laquelle
 * faisait foi. Le paramètre est ici explicite et les deux appelants passent
 * par cette fonction.
 */
export function initiatePayment(
  jobId: number,
  plateforme?: "web",
): Promise<{ payment_url?: string }> {
  return apiClient.post<{ payment_url?: string }>("/api/payments/initiate/", {
    job_id: jobId,
    ...(plateforme ? { platform: plateforme } : {}),
  });
}

/** Confirme la reservation : c'est elle qui engage le paiement. */
export function createBooking(
  jobId: number,
  offerId: number | undefined,
  moyenDePaiement: "DIGITAL" | "COD",
): Promise<unknown> {
  return apiClient.post("/api/bookings/", {
    job_id: jobId,
    offer_id: offerId,
    payment_method: moyenDePaiement,
  });
}

/**
 * L'offre d'un trajet, lue dans la LISTE des offres.
 *
 * Il n'existe PAS de route de detail `/api/jobs/<id>/offers/<offerId>/` : la
 * version precedente l'appelait quand meme, recevait un 404 et l'avalait —
 * l'ecran de paiement affichait « introuvable » sans dire pourquoi, et le
 * client qui venait d'accepter une contre-proposition ne pouvait jamais payer.
 *
 * Leve quand l'offre demandee n'appartient pas au trajet : c'est une
 * incoherence, pas une absence.
 */
export async function getJobOffer<T extends { id: number }>(
  jobId: number,
  offerId: number,
): Promise<T> {
  const reponse = await apiClient.get<T[] | { results: T[] }>(
    `/api/jobs/${jobId}/offers/`,
  );
  const liste = Array.isArray(reponse) ? reponse : reponse.results;
  const trouvee = liste.find((o) => o.id === offerId);
  if (!trouvee) {
    throw new Error(`L'offre ${offerId} n'appartient pas au trajet ${jobId}.`);
  }
  return trouvee;
}
