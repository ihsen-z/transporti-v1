import { test, expect } from "@playwright/test";

/**
 * Garde-fou des selecteurs — lot 1.
 *
 * Les trois parcours critiques reposent entierement sur des `data-testid`. Si
 * l'un disparait lors d'un refactor, les tests de parcours echouent sur un
 * selecteur introuvable, ce qui ressemble a un bug fonctionnel alors que ce
 * n'en est pas un — le pire des diagnostics.
 *
 * Ce fichier verifie donc l'existence des selecteurs, sans backend et sans
 * connexion. Il exige un navigateur (les pages concernees sont des composants
 * client qui ne rendent rien cote serveur), mais rien d'autre.
 *
 * Il a aussi une valeur immediate : c'est lui qui prouve que les `data-testid`
 * poses au lot 1 arrivent bien dans le DOM.
 */

test.describe("Selecteurs — ecran de connexion", () => {
  test("le formulaire de connexion expose ses trois selecteurs", async ({
    page,
  }) => {
    await page.goto("/login");

    await expect(page.getByTestId("login-email")).toBeVisible();
    await expect(page.getByTestId("login-password")).toBeVisible();
    await expect(page.getByTestId("login-submit")).toBeVisible();
  });

  test("les champs de connexion sont saisissables", async ({ page }) => {
    // Un selecteur qui existe mais pointe un element non interactif serait un
    // faux positif : on verifie que la saisie aboutit reellement.
    await page.goto("/login");

    await page.getByTestId("login-email").fill("verif@transporti.tn");
    await expect(page.getByTestId("login-email")).toHaveValue(
      "verif@transporti.tn",
    );
  });
});

test.describe("Selecteurs — publication d'un retour", () => {
  // L'ecran est derriere AuthGuard. Sans session, il redirige vers /login :
  // c'est le comportement attendu et on le verrouille, car une page de
  // publication accessible sans authentification serait une faille.
  test("l'ecran de publication exige une session", async ({ page }) => {
    await page.goto("/retours/nouveau");

    await expect(page).toHaveURL(/\/login/, { timeout: 15_000 });
  });
});
