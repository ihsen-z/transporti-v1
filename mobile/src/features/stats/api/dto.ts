// Contrat des KPI transporteur.
// Source : backend/logistics/stats.py::get_transporter_stats, exposé par
// GET /api/v1/transporter/stats/ (TRANSPORTER uniquement).
//
// Les formules sont contractuelles (docs/DICTIONNAIRE_KPI.md, K1–K12) et le
// backend est explicite : « Frontends must never recompute these. » Ce module
// ne fait donc que transporter les valeurs — aucun calcul dérivé ici.
export interface TransporterStatsDto {
  available_missions: number; // K1
  active_offers: number; // K2
  pending_offers: number; // K3
  earnings_confirmed: number; // K4 — escrow libéré
  earnings_pending: number; // K11
  potential_earnings: number; // K5
  completed_missions: number; // K6
  /** K7 — `null` quand aucune donnée : afficher « — », jamais 100 %. */
  completion_rate: number | null;
  /** K8 — `null` quand aucun avis. */
  average_rating: number | null;
  review_count: number;
  profile_completion: number; // K9
  wallet_available: number; // K10
  verification_status: string;
  // K12 (pivot) — transformation des retours à vide en missions chargées.
  return_trips_published: number;
  return_trips_filled: number;
  /** K12 — `null` quand aucun trajet retour publié. */
  fill_rate: number | null;
  km_transformed: number;
}
