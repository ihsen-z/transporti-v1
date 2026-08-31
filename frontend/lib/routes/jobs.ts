/**
 * URL canonique d'un job.
 *
 * Un job est soit une DEMANDE classique publiee par un client, soit un TRAJET
 * RETOUR publie par un transporteur. Les deux vivaient sous /jobs/<id>, une
 * route unique qui se recomposait selon le role du lecteur. L'URL ne disait
 * donc rien de ce qu'on regardait, et un lien partage ne renseignait pas son
 * destinataire.
 *
 * L'URL decrit desormais CE QU'ON REGARDE, jamais QUI REGARDE : elle reste
 * identique pour le proprietaire et pour un visiteur, et reste partageable
 * entre les deux roles. Chacune des deux routes porte toujours deux
 * compositions (proprietaire / visiteur), ce qui n'a pas change.
 *
 * Pourquoi pas une redirection cote serveur. Le jeton JWT vit dans
 * `localStorage` (lib/api/tokenManager.ts) : ni `middleware.ts` ni un
 * composant serveur ne peuvent s'authentifier, et `GET /api/jobs/<id>/`
 * repond 401 sans jeton. Le serveur ne peut donc lire ni le role ni la
 * nature. Les appelants construisent l'URL eux-memes, depuis la nature que
 * leur charge utile porte deja.
 */

/** Nature d'un job, telle qu'elle apparait dans les URLs. */
export type NatureDeJob = "demande" | "trajet";

/** Segment de route pour chaque nature. Source unique. */
export const SEGMENT_PAR_NATURE: Record<NatureDeJob, string> = {
  demande: "/demandes",
  trajet: "/trajets",
};

export function natureDepuisRetour(isReturnTrip: boolean): NatureDeJob {
  return isReturnTrip ? "trajet" : "demande";
}

/**
 * URL canonique d'un job.
 *
 * `isReturnTrip` accepte `null` / `undefined` a dessein : certaines charges
 * utiles peuvent ne pas connaitre la nature (notification dont le job a ete
 * supprime depuis). On renvoie alors la route de RESOLUTION /jobs/<id>, qui
 * charge le job puis remplace l'URL. C'est le seul chemin ou un ecran
 * d'attente subsiste, et il est volontaire : deviner « demande » enverrait le
 * lecteur sur une URL fausse sans aucun signal.
 */
export function urlJob(
  id: number | string,
  isReturnTrip: boolean | null | undefined,
): string {
  if (isReturnTrip === null || isReturnTrip === undefined) {
    return `/jobs/${id}`;
  }
  return `${SEGMENT_PAR_NATURE[natureDepuisRetour(isReturnTrip)]}/${id}`;
}

/** URL de l'ecran de choix du moyen de paiement pour un job. */
export function urlReservationJob(id: number | string): string {
  // Volontairement sous /jobs/ : c'est une ETAPE DE PAIEMENT, pas une vue du
  // job. La dupliquer par nature clonerait un ecran de 477 lignes sans qu'une
  // seule ligne differe.
  return `/jobs/${id}/book`;
}
