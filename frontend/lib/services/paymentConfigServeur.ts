/**
 * Plafonds d'argent lus côté serveur, pour les pages publiques rendues par
 * Next.js (ex. /aide) : elles n'ont ni session ni hook React.
 *
 * La page est mise en cache et la valeur relue au plus une fois par heure :
 * un réglage serveur change rarement, et l'aide ne doit pas attendre l'API.
 */
import { config } from "@/lib/config";
import {
  PAYMENT_CONFIG_DEFAUT,
  type PaymentConfig,
} from "@/lib/services/paymentConfig";

const UNE_HEURE = 3600;
const DELAI_MAX_MS = 3000;

/** Plafonds du serveur, ou ses valeurs par défaut s'il ne répond pas. */
export async function lirePaymentConfigServeur(): Promise<PaymentConfig> {
  try {
    const reponse = await fetch(
      `${config.API_BASE_URL}/api/v1/payments/config/`,
      {
        next: { revalidate: UNE_HEURE },
        // Au build (CI sans API) comme en production, une API lente ne doit
        // pas bloquer la page : passé ce délai, on affiche le défaut.
        signal: AbortSignal.timeout(DELAI_MAX_MS),
      },
    );
    if (!reponse.ok) return PAYMENT_CONFIG_DEFAUT;
    return (await reponse.json()) as PaymentConfig;
  } catch {
    return PAYMENT_CONFIG_DEFAUT;
  }
}
