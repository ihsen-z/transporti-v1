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
  /** Faux en mode « espèces seules » : l'option en ligne est masquée. */
  online_payment_enabled: boolean;
}

/**
 * Valeurs par défaut du serveur, affichées tant que la réponse n'est pas là.
 * Elles ne décident de rien : le serveur refuse lui-même un montant au-delà
 * de son plafond.
 */
export const PAYMENT_CONFIG_DEFAUT: PaymentConfig = {
  cod_max_amount: 300,
  commission_debt_limit: 60,
  // Faux tant que le serveur n'a pas répondu : les espèces marchent toujours,
  // alors qu'un paiement en ligne proposé à tort serait refusé.
  online_payment_enabled: false,
};

/** Moyen proposé d'abord : en ligne s'il existe, sinon espèces. */
export function moyenDePaiementParDefaut(
  config: PaymentConfig,
): "DIGITAL" | "COD" {
  return config.online_payment_enabled ? "DIGITAL" : "COD";
}

export function getPaymentConfig(): Promise<PaymentConfig> {
  return apiClient.get<PaymentConfig>("/api/payments/config/");
}
