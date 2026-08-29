import { defineConfig, devices } from "@playwright/test";

/**
 * Socle de tests de bout en bout — lot 0.4 du plan de mise a niveau.
 * Voir docs/PLAN_ACTION_MISE_A_NIVEAU_WEB_2026-08-26.md
 *
 * Deux projets, volontairement separes par ce qu'ils exigent pour tourner :
 *
 * - `routage` n'utilise que la fixture `request` (pile HTTP de Node). Il ne
 *   lance aucun navigateur, ne telecharge aucun binaire, et ne demande pas de
 *   backend. Il protege le renommage des routes du lot 0.2 : 11 redirections et
 *   11 destinations. Il tourne en CI des aujourd'hui.
 *
 * - `parcours` couvre les trois parcours critiques du plan. Il exige un binaire
 *   Chromium (`npx playwright install chromium`) et un backend joignable. Ses
 *   tests s'auto-ignorent avec un message explicite quand le backend est
 *   absent, plutot que d'echouer pour une mauvaise raison.
 *
 * Convention de selecteurs : `data-testid="<ecran>-<element>"` en kebab-case,
 * reprise du mobile (lots L6.5 et L6.7) pour ne pas en inventer une seconde.
 */

const BASE_URL = process.env.E2E_BASE_URL ?? "http://localhost:3000";

export default defineConfig({
  testDir: "./e2e",
  // Ouvre une session par role avant toute la suite. Voir e2e/global-setup.ts.
  globalSetup: "./e2e/global-setup.ts",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,

  // Un seul worker, y compris en local.
  //
  // La cause historique — `AuthRateThrottle` (auth: 10/minute) declenche par
  // une connexion par test — est levee : `global-setup.ts` ouvre une session
  // par role, une seule fois, et `seConnecter` la restaure (voir
  // e2e/fixtures/sessions.ts).
  //
  // La seconde raison demeure : les parcours partagent un unique jeu de
  // donnees et le mutent (accepter une contre-proposition la consomme). Les
  // paralleliser les rendrait dependants de leur ordre d'execution. A relever
  // seulement une fois les mises en place rendues independantes.
  workers: 1,
  reporter: process.env.CI ? [["github"], ["list"]] : [["list"]],

  use: {
    baseURL: BASE_URL,
    trace: "on-first-retry",
    // Ne pas suivre les redirections automatiquement : le projet `routage`
    // verifie les codes 308 eux-memes, ce qui est tout l'objet du test.
    extraHTTPHeaders: { "Accept-Language": "fr" },
  },

  projects: [
    {
      name: "routage",
      testMatch: /routage\.spec\.ts/,
    },
    {
      // Garde-fou des `data-testid` dont dependent les parcours. Exige un
      // navigateur (pages client) mais aucun backend, donc executable en CI de
      // facon bloquante des maintenant.
      name: "selecteurs",
      testMatch: /selecteurs\.spec\.ts/,
      use: { ...devices["Desktop Chrome"] },
    },
    {
      name: "parcours",
      testMatch: /parcours-.*\.spec\.ts/,
      use: { ...devices["Desktop Chrome"] },
    },
  ],

  webServer: {
    command: "npm run dev",
    url: BASE_URL,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
