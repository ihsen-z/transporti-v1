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
  /**
   * Nombre de demandes en attente. Le champ s'appelle `pending_demands` cote
   * API — je l'avais type `demandes`, le nom INTERNE de l'annotation Django.
   * L'ecran aurait affiche « undefined demande(s) », defaut invisible tant
   * qu'aucun transporteur n'avait declare de zone.
   */
  pending_demands: number;
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

/* ------------------------------------------------------------------ */
/*  T5.5 — les clients fidèles (B-4, « favoris inversés »)             */
/* ------------------------------------------------------------------ */

export interface ClientFidele {
  client_id: number;
  client_name: string;
  /** Missions TERMINÉES ensemble. Une mission en cours ne compte pas. */
  missions: number;
  /** Le client a explicitement mis ce transporteur en favori. */
  is_favorite: boolean;
  /** `null` pour un favori qui n'a jamais réservé — distinction porteuse. */
  last_mission_at: string | null;
}

export interface Fidelite {
  /** Nombre de clients ayant mis ce transporteur en favori. */
  favorited_by: number;
  /** Clients avec AU MOINS DEUX missions terminées. Seuil délibéré. */
  repeat_clients: number;
  clients: ClientFidele[];
}

/**
 * Pendant transporteur de C5.3.
 *
 * Les deux signaux — favori déclaré, missions faites — restent SÉPARÉS. Le
 * backend ne renvoie aucun score combiné : un client à six missions sans
 * favori est plus fidèle qu'un favori qui n'a jamais réservé, et un chiffre
 * unique effacerait la différence.
 */
export async function getLoyalClients(): Promise<Fidelite | null> {
  try {
    return await apiClient.get<Fidelite>("/api/transporter/loyal-clients/");
  } catch {
    return null;
  }
}
