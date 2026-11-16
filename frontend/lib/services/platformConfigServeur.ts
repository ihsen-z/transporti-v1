/**
 * Réglages de la plateforme lus côté serveur, pour les pages publiques
 * rendues par Next.js (ex. /aide) : elles n'ont ni session ni hook React.
 *
 * La page est mise en cache et la valeur relue au plus une fois par heure :
 * un réglage serveur change rarement, et l'aide ne doit pas attendre l'API.
 */
import { config } from "@/lib/config";
import {
  CHEMIN_CONFIG_PLATEFORME,
  normaliserPlatformConfig,
  PLATFORM_CONFIG_DEFAUT,
  type PlatformConfig,
} from "@/lib/platform/config";

const UNE_HEURE = 3600;
const DELAI_MAX_MS = 3000;

/** Réglages du serveur, ou les valeurs par défaut (fermées) s'il ne répond pas. */
export async function lirePlatformConfigServeur(): Promise<PlatformConfig> {
  try {
    const reponse = await fetch(
      `${config.API_BASE_URL}${CHEMIN_CONFIG_PLATEFORME}`,
      {
        next: { revalidate: UNE_HEURE },
        // Au build (CI sans API) comme en production, une API lente ne doit
        // pas bloquer la page : passé ce délai, on affiche le défaut.
        signal: AbortSignal.timeout(DELAI_MAX_MS),
      },
    );
    if (!reponse.ok) return PLATFORM_CONFIG_DEFAUT;
    return normaliserPlatformConfig(await reponse.json());
  } catch {
    return PLATFORM_CONFIG_DEFAUT;
  }
}
