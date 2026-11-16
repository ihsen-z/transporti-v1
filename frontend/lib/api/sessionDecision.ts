/**
 * Décision pure : après un échec de rafraîchissement, la session est-elle
 * vraiment morte, ou un AUTRE onglet a-t-il déjà renouvelé les jetons ?
 *
 * Les jetons vivent dans le `localStorage`, partagé entre onglets, et le
 * serveur met l'ancien refresh token sur liste noire à chaque rotation. Si
 * deux onglets rafraîchissent en même temps, le second présente un jeton déjà
 * révoqué et reçoit 401 : sans cette vérification il effacerait les jetons
 * neufs du premier et déconnecterait tout le monde.
 *
 * Fichier sans dépendance (ni DOM ni réseau) : la logique est ici, le
 * `tokenManager` ne fait que lire le `localStorage` et appliquer la décision.
 */

export interface JetonsStockes {
  access: string;
  refresh: string;
}

export type DecisionSession =
  | { morte: true }
  | { morte: false; jetons: JetonsStockes };

/**
 * @param refreshAuDebut  refresh token lu AVANT la tentative (avant l'attente
 *                        du verrou et avant l'appel réseau).
 * @param refreshActuel   refresh token présent maintenant dans le stockage.
 * @param accessActuel    access token présent maintenant dans le stockage.
 */
export function decideSessionApresEchec(
  refreshAuDebut: string,
  refreshActuel: string | null,
  accessActuel: string | null,
): DecisionSession {
  const renouveleAilleurs =
    refreshActuel !== null &&
    refreshActuel !== refreshAuDebut &&
    accessActuel !== null;
  if (renouveleAilleurs) {
    return {
      morte: false,
      jetons: { access: accessActuel, refresh: refreshActuel },
    };
  }
  return { morte: true };
}
