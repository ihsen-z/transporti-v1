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

export interface StatistiquesTransporteur {
  active_offers: number;
  potential_earnings: number;
  earnings_confirmed: number;
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
