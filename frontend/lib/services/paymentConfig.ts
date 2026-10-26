/**
 * Plafonds d'argent fixés par le serveur (GET /api/payments/config/).
 *
 * Le plafond d'une course payable en espèces était écrit « 300 » en dur dans
 * trois composants : relever settings.COD_MAX_AMOUNT côté serveur aurait laissé
 * le site refuser d'avance des montants que le serveur acceptait.
 */
import { apiClient } from "@/lib/api/client";

export interface PaymentConfig {
  cod_max_amount: number;
  commission_debt_limit: number;
}

/**
 * Valeurs par défaut du serveur, affichées tant que la réponse n'est pas là.
 * Elles ne décident de rien : le serveur refuse lui-même un montant au-delà
 * de son plafond.
 */
export const PAYMENT_CONFIG_DEFAUT: PaymentConfig = {
  cod_max_amount: 300,
  commission_debt_limit: 60,
};

export function getPaymentConfig(): Promise<PaymentConfig> {
  return apiClient.get<PaymentConfig>("/api/payments/config/");
}
