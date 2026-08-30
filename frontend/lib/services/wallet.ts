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
