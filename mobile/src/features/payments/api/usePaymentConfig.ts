import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/core/api/client';

// GET /api/v1/payments/config/ — plafonds d'argent fixés par le serveur.
// Le plafond espèces était écrit « 300 » en dur dans le libellé du mode de
// paiement : relever le réglage serveur aurait laissé l'écran annoncer 300.
export interface PaymentConfig {
  cod_max_amount: number;
  commission_debt_limit: number;
}

// Valeurs par défaut du serveur, affichées tant que la réponse n'est pas là
// (premier lancement hors ligne). Elles ne décident de rien : le serveur
// refuse lui-même un montant au-delà de son plafond.
export const PAYMENT_CONFIG_DEFAUT: PaymentConfig = {
  cod_max_amount: 300,
  commission_debt_limit: 60,
};

async function fetchPaymentConfig(): Promise<PaymentConfig> {
  const res = await apiClient.get<PaymentConfig>('payments/config/');
  return res.data;
}

export function usePaymentConfig(): PaymentConfig {
  const query = useQuery({
    queryKey: ['paymentConfig'],
    queryFn: fetchPaymentConfig,
    // Un réglage serveur change rarement : une heure suffit.
    staleTime: 60 * 60 * 1000,
  });
  return query.data ?? PAYMENT_CONFIG_DEFAUT;
}
