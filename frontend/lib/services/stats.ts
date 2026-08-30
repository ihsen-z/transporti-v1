/**
 * Indicateurs du transporteur — lot 4.2.
 *
 * CONTRAT (backend `logistics/stats.py`, `docs/DICTIONNAIRE_KPI.md`) : toute
 * figure montrée à un transporteur vient de `get_transporter_stats()`. Le
 * frontend ne recalcule JAMAIS. Ce module est le seul point d'entrée web vers
 * cet endpoint — il était appelé depuis deux écrans, chacun ne déclarant que
 * les champs qui l'intéressaient.
 */
import { apiClient } from "@/lib/api/client";

/** Une paire ORIENTEE de gouvernorats : l'aller et le retour sont distincts. */
export interface RevenuParCorridor {
  pickup_governorate: string;
  dropoff_governorate: string;
  /** Somme des `price_net`, meme base que K4 (escrow RELEASED). */
  revenue_net: number;
  missions: number;
  km: number;
  /** Combien de ces missions viennent d'un trajet retour. */
  return_trip_missions: number;
}

/** Un corridor ou la demande depasse l'offre, dans les zones du transporteur. */
export interface CorridorSousDesservi {
  pickup_governorate: string;
  dropoff_governorate: string;
  demandes: number;
}

export interface StatistiquesTransporteur {
  active_offers: number;
  potential_earnings: number;
  earnings_confirmed: number;
  /** B-3b — retrospectif. Livre au lot 1, consomme par T5.4 seulement. */
  revenue_by_corridor?: RevenuParCorridor[];
  /** B-3b — prospectif : ce qui transforme un bilan en invitation a publier. */
  underserved_corridors?: CorridorSousDesservi[];
}

/**
 * Rend `null` quand l'appel échoue, jamais des zéros.
 *
 * Un zéro se lit « aucune offre, aucun gain » ; l'absence se lit « chiffre
 * indisponible ». Confondre les deux ferait mentir le tableau de bord d'un
 * transporteur qui travaille.
 */
export async function getTransporterStats(): Promise<StatistiquesTransporteur | null> {
  try {
    return await apiClient.get<StatistiquesTransporteur>(
      "/api/transporter/stats/",
    );
  } catch {
    return null;
  }
}
