// Contrats du portefeuille transporteur.
// Source : backend/payments/views.py::TransporterWalletView (GET wallet/) et
// WithdrawalRequestCreateView (POST wallet/withdrawals/).
//
// Distinction essentielle, et c'est tout l'intérêt de cet écran :
//   available          — ce que la PLATEFORME doit au transporteur, retirable ;
//   cod_collected_net  — ce qu'il a déjà encaissé EN ESPÈCES sur les missions
//                        COD livrées. Cet argent est dans sa poche : il n'entre
//                        pas dans `available` et ne se retire pas ;
//   cod_debt           — la commission qu'il doit en retour à la plateforme,
//                        déduite de `available`.

export type WalletEntryKind = 'ESCROW' | 'WITHDRAWAL' | 'COD';

export interface WalletHistoryEntry {
  kind: WalletEntryKind;
  status: string;
  date: string;
  job_id?: number;
  id?: number;
  gross?: number;
  net?: number;
  amount?: number;
  bank_details?: string;
}

export interface CodDebtEntry {
  job_id: number;
  amount: number;
}

export interface WalletDto {
  available: number;
  pending_net: number;
  released_net: number;
  cod_collected_net: number;
  cod_debt: number;
  withdrawals_total: number;
  cod_debts: CodDebtEntry[];
  history: WalletHistoryEntry[];
}

export interface WithdrawalResponse {
  message: string;
  withdrawal: {
    id: number;
    amount: number;
    status: string;
    requested_at: string;
  };
}

// Montant minimum imposé par le serveur (WithdrawalRequestCreateView).
// Dupliqué ici uniquement pour informer l'utilisateur AVANT l'envoi ; le
// serveur reste l'autorité, l'erreur 400 est affichée telle quelle.
export const MIN_WITHDRAWAL_TND = 10;

/* ------------------------------------------------------------------ */
/*  C5.1 — le portefeuille du CLIENT                                   */
/* ------------------------------------------------------------------ */

// Source : backend/payments/views.py::ClientWalletView (GET client/wallet/).
//
// Endpoint DISTINCT de `wallet/`, qui porte RequireRole('TRANSPORTER') et
// repond 403 a un client. Un client n'a pas de solde : il n'a rien a retirer.
// Les quatre montants ci-dessous NE S'ADDITIONNENT PAS — ils decrivent des
// situations differentes, et le backend ne renvoie deliberement aucun total.

export interface ClientWalletHistoryEntry {
  id: number;
  job_id: number;
  status: string;
  amount: number;
  pickup_governorate: string;
  dropoff_governorate: string;
  date: string;
}

export interface ClientWalletDto {
  /** Seques­tre sur des missions en cours : ni depense, ni recuperable. */
  held: number;
  /** Verse aux transporteurs apres confirmation de livraison. */
  released: number;
  /** Annulations et litiges tranches en faveur du client. */
  refunded: number;
  /** Especes non encore livrees. La plateforme n'a jamais tenu cet argent. */
  cod_pending: number;
  history: ClientWalletHistoryEntry[];
}
