import { test, expect } from "@playwright/test";

/**
 * Integrite de l'arborescence — protege le renommage des routes du lot 0.2.
 *
 * Ce fichier n'utilise que la fixture `request` : aucun navigateur, aucun
 * binaire a telecharger, aucun backend requis. Il tourne en CI des aujourd'hui.
 *
 * Ce qu'il attrape : une redirection oubliee lors d'un futur renommage, une
 * route cassee par un deplacement de dossier, et surtout la regression qui a
 * failli passer le 26/08 — une reecriture de references qui touche un chemin
 * commencant par /api/.
 */

/** Les 11 redirections permanentes posees dans next.config.mjs (lot 0.2). */
const REDIRECTIONS: ReadonlyArray<readonly [string, string]> = [
  // Vague A — les quatre routes du pivot
  ["/jobs/return-trips", "/recherche"],
  ["/jobs/return-trip", "/retours/nouveau"],
  ["/jobs/browse", "/demandes"],
  ["/jobs/new", "/demandes/nouvelle"],
  // Vague B — le reste de l'arborescence metier
  ["/offers", "/mes-offres"],
  ["/wallet", "/portefeuille"],
  ["/settings", "/compte"],
  ["/disputes", "/litiges"],
  ["/verification", "/documents"],
  ["/transporter/7", "/transporteur/7"],
  ["/booking/42", "/reservation/42"],
];

/** Les destinations doivent repondre, pas seulement exister dans l'arbre. */
const DESTINATIONS: ReadonlyArray<string> = [
  "/recherche",
  "/retours/nouveau",
  "/demandes",
  "/demandes/nouvelle",
  "/mes-offres",
  "/portefeuille",
  "/compte",
  "/litiges",
  "/documents",
  "/transporteur/7",
  "/reservation/42",
];

test.describe("Arborescence — redirections du lot 0.2", () => {
  for (const [ancienne, cible] of REDIRECTIONS) {
    test(`${ancienne} redirige de facon permanente vers ${cible}`, async ({
      request,
    }) => {
      const reponse = await request.get(ancienne, { maxRedirects: 0 });

      // 308 et non 301 : Next.js emet un « Permanent Redirect » qui preserve la
      // methode HTTP. Un 301 ou un 302 signalerait une redirection posee a la
      // main ailleurs, ou un `permanent: false` glisse dans la configuration.
      expect(
        reponse.status(),
        `${ancienne} doit repondre 308 (redirection permanente)`,
      ).toBe(308);

      // Next.js emet un `Location` relatif. On compare donc au chemin nu :
      // comparer a une URL absolue ferait echouer le test selon l'hote.
      expect(
        reponse.headers()["location"],
        `${ancienne} doit pointer vers ${cible}`,
      ).toBe(cible);
    });
  }
});

test.describe("Arborescence — les destinations repondent", () => {
  for (const route of DESTINATIONS) {
    test(`${route} repond sans erreur serveur`, async ({ request }) => {
      const reponse = await request.get(route);

      // On n'attend pas 200 strictement : les ecrans derriere AuthGuard peuvent
      // legitimement rediriger vers /login. Ce qui est interdit, c'est le 404
      // (route disparue) et le 5xx (page cassee).
      expect(
        reponse.status(),
        `${route} ne doit etre ni introuvable ni en erreur serveur`,
      ).toBeLessThan(400);
    });
  }
});

test.describe("Arborescence — les anciennes routes ne survivent pas", () => {
  // Un renommage rate laisse parfois les deux versions en place : l'ancienne
  // page continue de repondre 200 et la redirection n'est jamais exercee. On
  // verifie donc qu'aucune ancienne route ne rend de contenu.
  for (const [ancienne] of REDIRECTIONS) {
    test(`${ancienne} ne rend plus de page`, async ({ request }) => {
      const reponse = await request.get(ancienne, { maxRedirects: 0 });
      expect(
        reponse.status(),
        `${ancienne} rend encore du contenu : le renommage est incomplet`,
      ).not.toBe(200);
    });
  }
});

test.describe("Arborescence — les chemins d'API restent intouches", () => {
  // Garde-fou issu d'un incident reel du 26/08 : la reecriture des references
  // de routes par sed avait transforme /api/jobs/return-trip/ en
  // /api/retours/nouveau/, cassant silencieusement la publication d'un retour.
  // Ces chemins appartiennent au backend et ne doivent JAMAIS etre renommes
  // avec les routes de pages.
  const CHEMINS_API_INTERDITS = [
    "/api/recherche",
    "/api/retours",
    "/api/demandes",
    "/api/mes-offres",
    "/api/portefeuille",
    "/api/compte",
    "/api/litiges",
    "/api/documents",
    "/api/transporteur",
    "/api/reservation",
  ];

  test("aucune route de page francisee n'a fuite dans /api/", async () => {
    // Test statique : on lit le code source plutot que d'interroger le serveur,
    // car un appel a un chemin inexistant echouerait de toute facon.
    const { readFileSync, readdirSync, statSync } = await import("node:fs");
    const { join } = await import("node:path");

    const fuites: string[] = [];

    const parcourir = (dossier: string): void => {
      for (const entree of readdirSync(dossier)) {
        if (entree === "node_modules" || entree === ".next") continue;
        const chemin = join(dossier, entree);
        if (statSync(chemin).isDirectory()) {
          parcourir(chemin);
          continue;
        }
        if (!/\.(ts|tsx)$/.test(entree)) continue;
        const contenu = readFileSync(chemin, "utf8");
        for (const interdit of CHEMINS_API_INTERDITS) {
          if (contenu.includes(interdit)) {
            fuites.push(`${chemin} contient ${interdit}`);
          }
        }
      }
    };

    for (const racine of ["app", "components", "lib", "hooks"]) {
      parcourir(racine);
    }

    expect(
      fuites,
      "des routes de pages francisees ont fuite dans des chemins d'API",
    ).toEqual([]);
  });
});
