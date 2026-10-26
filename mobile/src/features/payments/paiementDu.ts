import type { UserRole } from '@/core/auth/authStore';

/**
 * La cliente doit-elle encore payer cette mission ?
 *
 * Cette fonction existe pour une raison précise. La condition était écrite en
 * ligne dans l'écran de mission, sous le nom `awaitingPayment`, et ne regardait
 * que le STATUT de la mission — le rôle était porté ailleurs, par le
 * branchement qui choisit le corps de l'écran. Tant que le bouton de paiement
 * vivait dans ce corps, les deux allaient ensemble.
 *
 * En sortant le paiement dans une barre d'action fixe (charte, §Barre d'action
 * fixe), il a quitté ce branchement — et « Payer maintenant » s'est affiché au
 * TRANSPORTEUR, sur une mission qu'il est censé encaisser. Vu sur émulateur le
 * 06/09, mission Sousse → Tunis.
 *
 * Le rôle fait donc partie de la décision, pas de son contexte de rendu.
 */
export function clientDoitPayer(
  role: UserRole | undefined,
  status: string | undefined,
  // `null` : le serveur n'a pas encore de réservation pour cette mission.
  paymentMethod: string | null | undefined,
): boolean {
  // `MATCHED` = demande acceptée, mission pas encore démarrée.
  // Le paiement séquestré n'existe que sur le chemin digital : une mission en
  // espèces se règle à la livraison, il n'y a rien à payer dans l'application.
  return role !== 'TRANSPORTER' && status === 'MATCHED' && paymentMethod === 'DIGITAL';
}
