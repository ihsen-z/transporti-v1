/**
 * Garde commun des routes fermées par un interrupteur de la plateforme
 * (canal classique, paiement en ligne). Voir lib/platform/routesFermees.ts.
 *
 * Pourquoi un middleware et pas un garde dans chaque page : la redirection a
 * lieu AVANT tout rendu, y compris lors d'une navigation côté client. Aucune
 * page fermée n'est donc affichée, même une fraction de seconde, pendant que
 * les réglages se chargent. Les réglages sont publics (GET sans jeton), ce
 * qui permet de les lire ici alors que la session, elle, vit dans le
 * navigateur.
 *
 * Ordre Next.js 14 : les `redirects` de next.config.mjs passent AVANT ce
 * middleware ; /jobs/new -> /demandes/nouvelle (308) puis, si le canal est
 * fermé, /demandes/nouvelle -> /recherche (307).
 */
import { NextResponse, type NextRequest } from "next/server";
import { config as configApi } from "@/lib/config";
import {
  CHEMIN_CONFIG_PLATEFORME,
  normaliserPlatformConfig,
  PLATFORM_CONFIG_DEFAUT,
  type PlatformConfig,
} from "@/lib/platform/config";
import { destinationSiFermee } from "@/lib/platform/routesFermees";

// Réglage relu au plus une fois par minute (30 s après un échec) par
// instance : ces routes sont rares, et un serveur endormi ne doit pas
// retarder chaque navigation.
const DUREE_CACHE_MS = 60_000;
const DUREE_CACHE_ECHEC_MS = 30_000;
const DELAI_MAX_MS = 2_500;

let enCache: { valeur: PlatformConfig; expire: number } | null = null;

async function lireReglages(): Promise<PlatformConfig> {
  const maintenant = Date.now();
  if (enCache && enCache.expire > maintenant) return enCache.valeur;

  const abandon = new AbortController();
  const minuteur = setTimeout(() => abandon.abort(), DELAI_MAX_MS);
  try {
    const reponse = await fetch(
      `${configApi.API_BASE_URL}${CHEMIN_CONFIG_PLATEFORME}`,
      { signal: abandon.signal, cache: "no-store" },
    );
    if (!reponse.ok) throw new Error(`HTTP ${reponse.status}`);
    const valeur = normaliserPlatformConfig(await reponse.json());
    enCache = { valeur, expire: maintenant + DUREE_CACHE_MS };
    return valeur;
  } catch {
    // Serveur injoignable : défaut FERMÉ, comme dans le navigateur.
    enCache = {
      valeur: PLATFORM_CONFIG_DEFAUT,
      expire: maintenant + DUREE_CACHE_ECHEC_MS,
    };
    return PLATFORM_CONFIG_DEFAUT;
  } finally {
    clearTimeout(minuteur);
  }
}

export async function middleware(requete: NextRequest) {
  const { pathname, search } = requete.nextUrl;
  const destination = destinationSiFermee(
    pathname,
    search,
    await lireReglages(),
  );
  if (!destination) return NextResponse.next();

  // 307 (temporaire) et non 308 : la route rouvrira avec le canal.
  return NextResponse.redirect(new URL(destination, requete.url), 307);
}

// Liste statique exigée par Next.js (analysée au build) : elle doit rester
// alignée sur ROUTES_FERMEES, ce que vérifie e2e/interrupteurs-routage.spec.ts.
export const config = {
  matcher: [
    "/demandes",
    "/demandes/nouvelle",
    "/mes-offres",
    "/admin/payments",
  ],
};
