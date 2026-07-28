import type { BadgeVariant } from './Badge';

// Mappe un statut métier (string des enums missions/requests/disputes/…)
// vers une variante de Badge de la charte. Centralisé pour rester cohérent
// entre toutes les cartes (couleur = sémantique, pas décision par écran).
//   warning (ambre)  = en attente / en cours d'action
//   brand (bleu)     = négociation / traitement en cours
//   verified (vert)  = issue positive (accepté / résolu / terminé)
//   urgent (rouge)   = refus
//   neutral (gris)   = annulé / brouillon
const STATUS_VARIANT: Record<string, BadgeVariant> = {
  PENDING: 'warning',
  OPEN: 'warning',
  MATCHED: 'warning',
  COUNTERED: 'brand',
  INVESTIGATING: 'brand',
  IN_PROGRESS: 'brand',
  ACCEPTED: 'verified',
  RESOLVED: 'verified',
  COMPLETED: 'verified',
  PUBLISHED: 'neutral',
  CANCELLED: 'neutral',
  REJECTED: 'urgent',
};

export function statusVariant(status: string): BadgeVariant {
  return STATUS_VARIANT[status] ?? 'neutral';
}
