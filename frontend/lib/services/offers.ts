/**
 * Offres envoyées par un transporteur — lot 4.2.
 */
import { apiClient } from "@/lib/api/client";

/** Une offre telle que la renvoie `/api/offers/my/`. */
export interface OffreEnvoyee {
  id: number;
  job: number;
  status: string;
  total_price: string;
  price_net: string;
  commission_amount: string;
  message: string;
  job_pickup: string;
  job_dropoff: string;
  job_type: string;
  job_date: string;
  /** Nature du job — construit son URL canonique sans le recharger. */
  job_is_return_trip?: boolean;
  client_name: string;
  valid_until: string;
  created_at: string;
}

export async function getMyOffers(): Promise<OffreEnvoyee[]> {
  const reponse = await apiClient.get<
    OffreEnvoyee[] | { results?: OffreEnvoyee[] }
  >("/api/offers/my/");
  return Array.isArray(reponse) ? reponse : (reponse.results ?? []);
}

/**
 * Indicateurs affiches en tete de l'ecran, ou `null`.
 *
 * Delegue a `stats.ts`, seul point d'entree vers `/api/transporter/stats/` :
 * l'endpoint etait appele depuis deux ecrans, chacun ne declarant que les
 * champs qui l'interessaient.
 */
export { getTransporterStats as getTransporterKpis } from "./stats";
export type { StatistiquesTransporteur as IndicateursDuTransporteur } from "./stats";

export function withdrawOffer(offerId: number): Promise<unknown> {
  return apiClient.post(`/api/offers/${offerId}/withdraw/`, {});
}

/** Les offres reçues sur un transport, vues par son propriétaire. */
export async function getOffersForJob<T>(jobId: number): Promise<T[]> {
  const reponse = await apiClient.get<T[] | { results?: T[] }>(
    `/api/jobs/${jobId}/offers/`,
  );
  return Array.isArray(reponse) ? reponse : (reponse.results ?? []);
}

/** Accepter une offre : ferme le transport et engage le moyen de paiement. */
export function acceptOffer(
  offerId: number,
  moyenDePaiement: "DIGITAL" | "COD",
): Promise<unknown> {
  return apiClient.post(`/api/offers/${offerId}/accept/`, {
    payment_method: moyenDePaiement,
  });
}

/**
 * Combien d'offres en attente ce transporteur a-t-il ?
 *
 * Rend `null` en cas d'échec, et l'appelant laisse alors passer la
 * soumission : c'est un garde-fou d'interface, la validation qui FAIT foi est
 * celle du serveur. Un zéro ferait croire à un quota libre.
 */
export async function countActiveOffers(): Promise<number | null> {
  try {
    const reponse = await apiClient.get<{ count?: number }>(
      "/api/offers/my/?status=PENDING&page_size=1",
    );
    return typeof reponse?.count === "number" ? reponse.count : null;
  } catch {
    return null;
  }
}

/**
 * Soumettre une offre.
 *
 * D1 « net garanti » : on envoie le NET que le transporteur touchera. Le
 * serveur calcule la commission et le total client — source unique. Envoyer
 * un total ici inverserait le sens du contrat.
 */
export function submitOffer(
  jobId: number,
  prixNet: number,
  message: string,
  valableJusquAu: string,
): Promise<unknown> {
  return apiClient.post("/api/offers/", {
    job: jobId,
    price_net: prixNet,
    message,
    valid_until: valableJusquAu,
  });
}
