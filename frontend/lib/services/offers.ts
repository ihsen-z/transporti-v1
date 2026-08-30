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

export interface IndicateursDuTransporteur {
  active_offers: number;
  potential_earnings: number;
}

export async function getMyOffers(): Promise<OffreEnvoyee[]> {
  const reponse = await apiClient.get<
    OffreEnvoyee[] | { results?: OffreEnvoyee[] }
  >("/api/offers/my/");
  return Array.isArray(reponse) ? reponse : (reponse.results ?? []);
}

/**
 * Indicateurs affichés en tête de l'écran, ou `null`.
 *
 * CONTRAT `stats.py` : toute figure montrée à un transporteur vient du
 * serveur, jamais d'un calcul dans l'écran. Le `null` distingue « indicateurs
 * indisponibles » de « zéro offre active » — deux messages différents.
 */
export async function getTransporterKpis(): Promise<IndicateursDuTransporteur | null> {
  try {
    return await apiClient.get<IndicateursDuTransporteur>(
      "/api/transporter/stats/",
    );
  } catch {
    return null;
  }
}

export function withdrawOffer(offerId: number): Promise<unknown> {
  return apiClient.post(`/api/offers/${offerId}/withdraw/`, {});
}
