import { test as base, expect, type APIRequestContext } from "@playwright/test";

/**
 * Socle commun aux trois parcours critiques — lot 0.4.
 *
 * Les parcours metier exigent un backend joignable et des comptes de test. Sans
 * eux, un test echouerait pour une mauvaise raison : on ne saurait pas si c'est
 * le parcours qui est casse ou l'environnement qui est absent. Ces fixtures
 * font donc la distinction — elles ignorent le test avec un message explicite
 * quand le backend manque, et ne le laissent echouer que sur un vrai defaut.
 *
 * Voir docs/PLAN_ACTION_MISE_A_NIVEAU_WEB_2026-08-26.md, lot 0.4.
 */

const BACKEND_URL = process.env.E2E_BACKEND_URL ?? "http://localhost:8000";

/** Comptes de test, alimentes par l'endpoint `POST /api/auth/seed/`. */
export const COMPTES = {
  transporteur: {
    email:
      process.env.E2E_TRANSPORTEUR_EMAIL ?? "transporteur.e2e@transporti.tn",
    motDePasse: process.env.E2E_TRANSPORTEUR_PASSWORD ?? "Transporti!E2E",
  },
  client: {
    email: process.env.E2E_CLIENT_EMAIL ?? "client.e2e@transporti.tn",
    motDePasse: process.env.E2E_CLIENT_PASSWORD ?? "Transporti!E2E",
  },
} as const;

/** Corridor de reference des scenarios, aligne sur le pilote A1. */
export const CORRIDOR = {
  depart: "Sfax",
  arrivee: "Tunis",
  // Corridor volontairement desert, pour exercer l'etat de repli du parcours B.
  arriveeSansTrajet: "Tozeur",
} as const;

async function backendJoignable(request: APIRequestContext): Promise<boolean> {
  try {
    const reponse = await request.get(`${BACKEND_URL}/api/health/`, {
      timeout: 3_000,
    });
    return reponse.ok();
  } catch {
    return false;
  }
}

export const test = base.extend<{ backendPret: void }>({
  backendPret: [
    async ({ request }, use) => {
      const pret = await backendJoignable(request);
      test.skip(
        !pret,
        `Backend introuvable sur ${BACKEND_URL}. Demarrer le backend et amorcer ` +
          `les comptes de test, ou definir E2E_BACKEND_URL. Ce test ne mesure ` +
          `rien sans lui — il est ignore plutot que declare en echec.`,
      );
      await use();
    },
    { auto: true },
  ],
});

/**
 * Connecte un role via l'interface, et non par injection de jeton : le parcours
 * de connexion fait partie de ce que l'on veut garder sous surveillance.
 */
export async function seConnecter(
  page: import("@playwright/test").Page,
  role: keyof typeof COMPTES,
): Promise<void> {
  const compte = COMPTES[role];
  await page.goto("/login");
  await page.getByTestId("login-email").fill(compte.email);
  await page.getByTestId("login-password").fill(compte.motDePasse);
  await page.getByTestId("login-submit").click();
  await expect(page).toHaveURL(/\/(dashboard|recherche)/, { timeout: 15_000 });
}

export { expect };
