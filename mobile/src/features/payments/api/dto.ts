// Contrats de paiement. Source : backend/payments/views.py
// (InitiatePaymentView, VerifyPaymentView, ConfirmCompletionView,
// JobEscrowDetailView).

export type EscrowStatus =
  | 'INITIATED'
  | 'HELD'
  | 'RELEASED'
  | 'REFUNDED'
  | 'BLOCKED';

export interface InitiatePaymentResponse {
  // En SANDBOX, le backend renvoie ici notre propre schéma
  // (`transporti://payment/callback?...`) et non une page web : il n'existe
  // aucune passerelle à afficher. Le code appelant doit le détecter plutôt que
  // d'ouvrir un navigateur sur un lien qui reboucle dans l'application.
  payment_url: string;
  gateway_ref: string;
}

export interface VerifyPaymentResponse {
  // Statut de l'escrow après vérification (HELD si le paiement est passé).
  status: EscrowStatus;
  job_id: number;
  job_status: string;
}

// GET jobs/<id>/escrow/ renvoie une LISTE (l'historique des séquestres du job,
// le plus récent d'abord), pas un objet.
export interface EscrowDetailDto {
  id: number;
  job_id: number;
  status: EscrowStatus;
  amount: string;
  gateway_reference: string;
  created_at: string;
  updated_at: string;
  client_name: string;
  transporter_name: string;
}
