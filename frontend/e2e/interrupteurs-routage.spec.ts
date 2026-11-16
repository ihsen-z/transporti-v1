import { test, expect } from "@playwright/test";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import {
  destinationSiFermee,
  ROUTES_FERMEES,
} from "../lib/platform/routesFermees";
import {
  normaliserPlatformConfig,
  PLATFORM_CONFIG_DEFAUT,
  type PlatformConfig,
} from "../lib/platform/config";

/**
 * Routes fermées par les interrupteurs de la plateforme (canal classique,
 * paiement en ligne) — garde commun de middleware.ts.
 *
 * Projet `routage` : aucun navigateur. Les trois premiers blocs n'ont besoin
 * d'aucun serveur. Le dernier interroge le serveur Next.js ; il s'adapte à
 * l'état réel du backend : interrupteur ouvert (développement), la route
 * répond ; fermé ou backend injoignable (défaut fermé), elle redirige.
 */

const OUVERT: PlatformConfig = {
  ...PLATFORM_CONFIG_DEFAUT,
  classic_channel_enabled: true,
  online_payment_enabled: true,
};

test.describe("Interrupteurs — règle de redirection (sans serveur)", () => {
  test("tout est fermé par défaut, et un champ absent reste fermé", () => {
    expect(PLATFORM_CONFIG_DEFAUT.classic_channel_enabled).toBe(false);
    expect(PLATFORM_CONFIG_DEFAUT.online_payment_enabled).toBe(false);
    // Serveur plus ancien, sans classic_channel_enabled.
    const ancien = normaliserPlatformConfig({
      cod_max_amount: 300,
      commission_debt_limit: 60,
      online_payment_enabled: true,
    });
    expect(ancien.classic_channel_enabled).toBe(false);
    expect(ancien.online_payment_enabled).toBe(true);
    // Une chaîne « true » n'ouvre rien : seul le booléen compte.
    expect(
      normaliserPlatformConfig({ classic_channel_enabled: "true" })
        .classic_channel_enabled,
    ).toBe(false);
  });

  for (const route of ROUTES_FERMEES) {
    test(`${route.chemin} -> ${route.destination} quand ${route.interrupteur} est faux`, () => {
      expect(
        destinationSiFermee(route.chemin, "", PLATFORM_CONFIG_DEFAUT),
      ).toBe(route.destination);
      expect(
        destinationSiFermee(`${route.chemin}/`, "", PLATFORM_CONFIG_DEFAUT),
      ).toBe(route.destination);
      expect(destinationSiFermee(route.chemin, "", OUVERT)).toBeNull();
    });
  }

  test("la recherche reprend l'itinéraire, et seulement lui", () => {
    expect(
      destinationSiFermee(
        "/demandes/nouvelle",
        "?pickup_governorate=Tunis&dropoff_governorate=Sfax&edit=4",
        PLATFORM_CONFIG_DEFAUT,
      ),
    ).toBe("/recherche?pickup_governorate=Tunis&dropoff_governorate=Sfax");
  });

  test("la consultation d'une mission classique n'est jamais fermée", () => {
    for (const chemin of [
      "/demandes/12",
      "/trajets/12",
      "/jobs/12",
      "/reservation/12",
      "/portefeuille",
      "/demandes-recues",
    ]) {
      expect(
        destinationSiFermee(chemin, "", PLATFORM_CONFIG_DEFAUT),
      ).toBeNull();
    }
  });
});

/** Chemins des pages de app/, groupes « (x) » retirés. */
function cheminsDesPages(): Set<string> {
  const chemins = new Set<string>();
  const parcourir = (dossier: string, segments: string[]): void => {
    for (const entree of readdirSync(dossier)) {
      const chemin = join(dossier, entree);
      if (statSync(chemin).isDirectory()) {
        const groupe = entree.startsWith("(") && entree.endsWith(")");
        parcourir(chemin, groupe ? segments : [...segments, entree]);
      } else if (entree === "page.tsx") {
        chemins.add(`/${segments.join("/")}`);
      }
    }
  };
  parcourir("app", []);
  return chemins;
}

test.describe("Interrupteurs — cohérence du code (sans serveur)", () => {
  test("chaque route fermée et sa destination sont de vraies pages", () => {
    const pages = cheminsDesPages();
    for (const route of ROUTES_FERMEES) {
      expect(pages.has(route.chemin), `${route.chemin} n'existe plus`).toBe(
        true,
      );
      expect(
        pages.has(route.destination),
        `${route.destination} (destination) n'existe pas`,
      ).toBe(true);
    }
  });

  test("le matcher de middleware.ts couvre exactement ROUTES_FERMEES", () => {
    // Next.js exige un matcher littéral : on vérifie qu'il n'a pas divergé de
    // la table, sans quoi une route fermée cesserait d'être gardée.
    const source = readFileSync("middleware.ts", "utf8");
    const bloc = /matcher:\s*\[([^\]]*)\]/.exec(source);
    expect(bloc, "matcher introuvable dans middleware.ts").not.toBeNull();
    // Array.from plutôt que l'étalement : le tsconfig ne cible pas ES2015.
    const matcher = Array.from(
      (bloc?.[1] ?? "").matchAll(/"([^"]+)"/g),
      (m) => m[1],
    );
    expect(matcher.sort()).toEqual(ROUTES_FERMEES.map((r) => r.chemin).sort());
  });
});

/** Réglages tels que le middleware les lira, ou le défaut fermé. */
async function reglagesDuBackend(): Promise<PlatformConfig> {
  const base =
    process.env.NEXT_PUBLIC_API_URL ??
    process.env.E2E_BACKEND_URL ??
    "http://localhost:8000";
  try {
    const reponse = await fetch(`${base}/api/v1/payments/config/`, {
      signal: AbortSignal.timeout(2500),
    });
    if (!reponse.ok) return PLATFORM_CONFIG_DEFAUT;
    return normaliserPlatformConfig(await reponse.json());
  } catch {
    return PLATFORM_CONFIG_DEFAUT;
  }
}

test.describe("Interrupteurs — middleware (serveur Next.js, backend facultatif)", () => {
  for (const route of ROUTES_FERMEES) {
    test(`${route.chemin} suit l'interrupteur ${route.interrupteur}`, async ({
      request,
    }) => {
      const reglages = await reglagesDuBackend();
      const reponse = await request.get(route.chemin, { maxRedirects: 0 });

      if (reglages[route.interrupteur]) {
        // Ouvert : la page répond (AuthGuard côté client, pas de redirection).
        expect(reponse.status()).toBeLessThan(400);
        expect(reponse.headers()["location"] ?? "").not.toBe(route.destination);
      } else {
        // Fermé : 307 (temporaire, la route rouvrira) vers l'équivalent.
        expect(reponse.status()).toBe(307);
        expect(
          new URL(reponse.headers()["location"], "http://x").pathname,
        ).toBe(route.destination);
      }
    });
  }
});
