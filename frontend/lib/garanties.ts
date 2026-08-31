/**
 * Chiffres des garanties annoncés publiquement (page « Confiance et sécurité »).
 *
 * ⚠️ MÊME AVERTISSEMENT QUE `lib/commissions.ts` : la source de vérité est le
 * backend. Aucun endpoint ne les expose, et la page doit s'afficher sans
 * authentification — ils sont donc recopiés ici, et cette recopie peut diverger.
 *
 * Un test backend (`payments/tests_chiffres_affiches.py`) lit CE fichier et
 * échoue si une valeur ne correspond plus. Une page qui promet « 48 heures »
 * pendant que la plateforme en applique 24 est une promesse rompue, et rien
 * dans l'interface ne le dirait.
 */
export const GARANTIES_AFFICHEES = {
  /**
   * Délai après lequel l'escrow est versé au transporteur si le client n'a pas
   * confirmé la réception. Source : `settings.ESCROW_AUTO_RELEASE_HOURS`.
   *
   * Un litige ouvert (OPEN / INVESTIGATING) EMPÊCHE cette libération : c'est ce
   * qui rend le délai acceptable, et c'est dit sur la page.
   */
  ESCROW_AUTO_RELEASE_HOURS: 48,
  /**
   * Score de confiance minimum exigé d'un transporteur pour encaisser en
   * espèces à la livraison. Source : `settings.COD_MIN_TRUST_SCORE`.
   */
  COD_MIN_TRUST_SCORE: 50,
} as const;
