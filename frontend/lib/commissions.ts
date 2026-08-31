/**
 * Taux de commission annoncés publiquement.
 *
 * ⚠️ LA SOURCE DE VÉRITÉ EST `settings.COMMISSION_RATES` CÔTÉ BACKEND. Aucun
 * endpoint ne les expose, et la page « Devenir transporteur » doit les afficher
 * sans authentification : ils sont donc recopiés ici, et cette recopie peut
 * diverger.
 *
 * Un test backend (`payments/tests_commission_affichee.py`) lit CE fichier et
 * échoue si une valeur ne correspond plus. C'est délibéré : une page publique
 * qui annonce 8 % pendant que la plateforme prélève 12 % est une promesse
 * rompue, et rien dans l'interface ne le dirait. Le même défaut nous a déjà
 * coûté la grille tarifaire (repli `DEFAULT_GRIDS` resté sur l'ancien tarif).
 *
 * Ne PAS utiliser ces valeurs pour un calcul : le montant réel d'une offre
 * vient toujours de l'API (`offer.commission_rate`, `offer.price_net`).
 * Elles ne servent qu'à l'affichage éditorial.
 */
export const TAUX_COMMISSION_AFFICHES = {
  /** Mission née d'un trajet retour — le taux incitatif du pivot (D13). */
  RETURN_TRIP: 0.08,
  TRANSPORT: 0.12,
  MOVING: 0.15,
} as const;

/** « 8 % » à partir de 0.08. */
export function pourcentage(taux: number): string {
  return `${Math.round(taux * 100)} %`;
}
