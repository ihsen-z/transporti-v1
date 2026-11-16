import type { QueryClient } from '@tanstack/react-query';

// Ce qu'une livraison change à l'écran, au-delà de la liste des missions.
//
// Livrer une mission payée en espèces crée une dette de commission et augmente
// les gains. Sans rafraîchir ces requêtes, l'accueil gardait les anciens gains
// et un bandeau « 60 / 60 » alors que le serveur venait de bloquer le
// transporteur : il ne l'apprenait qu'en essayant de publier.
export const QUERIES_AFTER_DELIVERY: readonly (readonly string[])[] = [
  ['myMissions'],
  ['completedMissions'],
  ['transporterStats'], // gains affichés sur l'accueil
  ['wallet'], // dette de commission, plafond, blocage
];

// Ce qu'une mission qui démarre ou s'annule change : la liste seulement, plus
// les statistiques (une annulation compte dans le taux de complétion).
export const QUERIES_AFTER_MISSION_CHANGE: readonly (readonly string[])[] = [
  ['myMissions'],
  ['transporterStats'],
];

export function invalidateAll(
  qc: QueryClient,
  keys: readonly (readonly string[])[],
): void {
  for (const queryKey of keys) {
    void qc.invalidateQueries({ queryKey: [...queryKey] });
  }
}
