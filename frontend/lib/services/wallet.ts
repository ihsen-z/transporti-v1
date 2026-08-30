/**
 * Portefeuille du transporteur — lot 4.2.
 *
 * Les figures d'argent viennent TOUTES du serveur, jamais d'un calcul dans
 * l'écran : c'est le contrat que `stats.py` pose côté backend et que
 * `docs/DICTIONNAIRE_KPI.md` documente. Ce module ne fait que les transporter.
 * Aucune addition, aucune soustraction ici — un net recalculé côté client
 * finirait par diverger du montant réellement versé.
 */
import { apiClient } from "@/lib/api/client";

export interface LigneHistoriquePortefeuille {
  kind: "ESCROW" | "WITHDRAWAL";
  status: string;
  job_id?: number;
  id?: number;
  gross?: number;
  net?: number;
  amount?: number;
  bank_details?: string;
  date: string;
}

export interface Portefeuille {
  available: number;
  pending_net: number;
  released_net: number;
  cod_debt: number;
  withdrawals_total: number;
  cod_debts: { job_id: number; amount: number }[];
  history: LigneHistoriquePortefeuille[];
}

export function getWallet(): Promise<Portefeuille> {
  return apiClient.get<Portefeuille>("/api/wallet/");
}

/**
 * Demande de retrait.
 *
 * Le montant part en CHAÎNE à deux décimales : le backend le lit en `Decimal`,
 * et un flottant JSON y perdrait des centimes sur certaines valeurs.
 */
export function requestWithdrawal(
  montant: number,
  coordonneesBancaires: string,
): Promise<unknown> {
  return apiClient.post("/api/wallet/withdrawals/", {
    amount: montant.toFixed(2),
    bank_details: coordonneesBancaires,
  });
}

/* ------------------------------------------------------------------ */
/*  C5.1 — le portefeuille du CLIENT                                   */
/* ------------------------------------------------------------------ */

export interface LigneHistoriqueClient {
  id: number;
  job_id: number;
  status: string;
  amount: number;
  pickup_governorate: string;
  dropoff_governorate: string;
  date: string;
}

/**
 * Où en est l'argent d'un client. PAS un solde : il n'a rien à retirer.
 *
 * Quatre figures qui ne s'additionnent PAS, et c'est voulu :
 * `held` (séquestré sur des missions en cours), `released` (versé après
 * confirmation), `refunded`, et `cod_pending` (ce qu'il paiera en espèces).
 * Les cumuler donnerait un chiffre sans réalité comptable — le service
 * backend ne renvoie donc aucun total, et l'écran n'en fabrique pas.
 */
export interface PortefeuilleClient {
  held: number;
  released: number;
  refunded: number;
  cod_pending: number;
  history: LigneHistoriqueClient[];
}

export function getClientWallet(): Promise<PortefeuilleClient> {
  return apiClient.get<PortefeuilleClient>("/api/client/wallet/");
}
