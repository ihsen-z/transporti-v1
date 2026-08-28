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

/**
 * Comptes de test, crees par `python manage.py seed_test_data`.
 *
 * Ce sont les comptes REELS de la commande de seed du projet, pas des comptes
 * inventes pour ces tests : la premiere version de cette fixture posait des
 * identifiants qui n'existaient nulle part, et la connexion aurait echoue.
 */
export const COMPTES = {
  transporteur: {
    email:
      process.env.E2E_TRANSPORTEUR_EMAIL ?? "mehdi.khelifi@test.transporti.tn",
    motDePasse: process.env.E2E_TRANSPORTEUR_PASSWORD ?? "Test@123!",
  },
  client: {
    email: process.env.E2E_CLIENT_EMAIL ?? "leila.benamor@test.transporti.tn",
    motDePasse: process.env.E2E_CLIENT_PASSWORD ?? "Test@123!",
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
    // `/health/` est monte a la racine (transporti_core/urls.py:89), pas sous
    // /api/. La premiere version de cette fixture interrogeait /api/health/,
    // qui repond 404 : les parcours auraient ete ignores en SILENCE meme avec
    // un backend disponible — le socle aurait paru vert sans rien verifier.
    const reponse = await request.get(`${BACKEND_URL}/health/`, {
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
