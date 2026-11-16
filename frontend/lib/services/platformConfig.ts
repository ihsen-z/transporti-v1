/**
 * Lecture des réglages de la plateforme depuis le navigateur.
 *
 * Le plafond d'une course payable en espèces était écrit « 300 » en dur dans
 * trois composants : relever settings.COD_MAX_AMOUNT côté serveur aurait laissé
 * le site refuser d'avance des montants que le serveur acceptait. Le même
 * point d'API dit aujourd'hui si le paiement en ligne et le canal classique
 * sont ouverts. Le type et les valeurs par défaut vivent dans
 * lib/platform/config.ts (module pur, partagé avec middleware.ts).
 */
import { apiClient } from "@/lib/api/client";
import {
  normaliserPlatformConfig,
  type PlatformConfig,
} from "@/lib/platform/config";

export {
  PLATFORM_CONFIG_DEFAUT,
  moyenDePaiementParDefaut,
  type PlatformConfig,
} from "@/lib/platform/config";

export async function getPlatformConfig(): Promise<PlatformConfig> {
  // `unknown` : la réponse est normalisée champ par champ plutôt que crue.
  const brut = await apiClient.get<unknown>("/api/payments/config/");
  return normaliserPlatformConfig(brut);
}
