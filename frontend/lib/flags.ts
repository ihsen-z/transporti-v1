/**
 * Feature flags (pivot §8 — Phase B).
 *
 * RETURN_TRIPS_FIRST drives the inverted client funnel: return-trip search
 * becomes the primary client entry, the classic freight request the fallback.
 * Toggle per environment via NEXT_PUBLIC_RETURN_TRIPS_FIRST ("false" to
 * revert the surface in one variable — no redeploy of logic).
 */
export const RETURN_TRIPS_FIRST =
  process.env.NEXT_PUBLIC_RETURN_TRIPS_FIRST !== "false";

/**
 * Le parcours « trajet retour d'abord » s'applique-t-il ?
 *
 * Le réglage serveur `classic_channel_enabled` prime : canal classique fermé,
 * il n'y a plus d'autre parcours, quel que soit le drapeau de build. Le
 * drapeau ne garde de sens que canal ouvert, pour choisir l'ordre des deux.
 * Toujours passer par cette fonction plutôt que lire RETURN_TRIPS_FIRST.
 */
export function retourEnPremier(canalClassiqueOuvert: boolean): boolean {
  return !canalClassiqueOuvert || RETURN_TRIPS_FIRST;
}
