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
