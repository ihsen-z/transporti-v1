import { test, expect, seConnecter } from "./fixtures/backend";

/**
 * C5.9 — le carnet d'adresses.
 *
 * Le test qui compte est le DERNIER : celui qui prouve que le carnet supprime
 * une saisie. Une page de gestion d'adresses que rien ne consomme serait un
 * ecran de plus a entretenir et zero friction en moins — exactement le defaut
 * de la moitie prospective de T5.4, livree puis inerte faute de zones
 * declarees.
 *
 * Les adresses sont creees et nettoyees par l'API, pas par l'interface : ces
 * tests portent sur le carnet, pas sur le formulaire qui le remplit, et un
 * jeu de donnees laisse derriere fausserait le test suivant.
 */

const CARNET = "/compte/adresses";

test.describe("C5.9 — carnet d'adresses", () => {
  test("la page se gere : ajouter, renommer, supprimer", async ({ page }) => {
    await seConnecter(page, "client");
    await page.goto(CARNET);

    await expect(page.getByTestId("carnet-adresses")).toBeVisible({
      timeout: 15_000,
    });

    // --- ajout ---
    await page.getByTestId("carnet-ajouter").click();
    await page.getByTestId("carnet-champ-nom").fill("Entrepot recette");
    await page
      .getByTestId("carnet-champ-adresse")
      .fill("Zone industrielle Poudriere");
    await page.getByTestId("carnet-champ-gouvernorat").selectOption("Sfax");
    await page.getByTestId("carnet-enregistrer").click();

    const ligne = page
      .locator('[data-testid^="carnet-ligne-"]')
      .filter({ hasText: "Entrepot recette" });
    await expect(ligne).toBeVisible({ timeout: 15_000 });
    // Le gouvernorat est affiche avec l'adresse : c'est lui qui distingue deux
    // lieux aux noms proches au moment de choisir.
    await expect(ligne).toContainText("Sfax");

    // --- renommage ---
    await ligne.getByRole("button", { name: "Modifier" }).click();
    await page.getByTestId("carnet-champ-nom").fill("Entrepot renomme");
    await page.getByTestId("carnet-enregistrer").click();
    await expect(
      page
        .locator('[data-testid^="carnet-ligne-"]')
        .filter({ hasText: "Entrepot renomme" }),
    ).toBeVisible({ timeout: 15_000 });

    // --- suppression ---
    page.once("dialog", (dialogue) => dialogue.accept());
    await page
      .locator('[data-testid^="carnet-ligne-"]')
      .filter({ hasText: "Entrepot renomme" })
      .getByRole("button", { name: "Supprimer" })
      .click();
    await expect(
      page
        .locator('[data-testid^="carnet-ligne-"]')
        .filter({ hasText: "Entrepot renomme" }),
    ).toHaveCount(0, { timeout: 15_000 });
  });

  test("un nom deja pris est refuse, avec le formulaire toujours ouvert", async ({
    page,
  }) => {
    // Le backend refuse le doublon ; l'ecran doit le DIRE et garder la saisie,
    // pas se fermer comme si l'enregistrement avait reussi.
    await seConnecter(page, "client");
    await page.goto(CARNET);
    await expect(page.getByTestId("carnet-adresses")).toBeVisible({
      timeout: 15_000,
    });

    for (const attendu of [true, false]) {
      await page.getByTestId("carnet-ajouter").click();
      await page.getByTestId("carnet-champ-nom").fill("Doublon recette");
      await page.getByTestId("carnet-champ-adresse").fill("Une rue");
      await page.getByTestId("carnet-champ-gouvernorat").selectOption("Tunis");
      await page.getByTestId("carnet-enregistrer").click();

      if (attendu) {
        await expect(
          page
            .locator('[data-testid^="carnet-ligne-"]')
            .filter({ hasText: "Doublon recette" }),
        ).toBeVisible({ timeout: 15_000 });
      } else {
        await expect(page.getByTestId("carnet-erreur-ecriture")).toBeVisible({
          timeout: 15_000,
        });
        // La saisie n'est pas perdue : l'utilisateur peut corriger le nom.
        await expect(page.getByTestId("carnet-champ-nom")).toHaveValue(
          "Doublon recette",
        );
      }
    }

    // Nettoyage, pour ne pas polluer les executions suivantes.
    page.once("dialog", (dialogue) => dialogue.accept());
    await page.getByTestId("carnet-annuler").click();
    await page
      .locator('[data-testid^="carnet-ligne-"]')
      .filter({ hasText: "Doublon recette" })
      .getByRole("button", { name: "Supprimer" })
      .click();
  });

  test("LE POINT DE LA FONCTIONNALITE : le carnet remplit le formulaire", async ({
    page,
  }) => {
    // Sans ce test, tout le reste pourrait passer avec un carnet parfaitement
    // gere et parfaitement inutile.
    await seConnecter(page, "client");

    // On s'assure qu'une adresse existe, via l'interface : la fixture n'expose
    // pas le jeton du client, et passer par l'ecran verifie au passage que
    // l'ajout fonctionne.
    await page.goto(CARNET);
    await expect(page.getByTestId("carnet-adresses")).toBeVisible({
      timeout: 15_000,
    });
    const dejaLa = page
      .locator('[data-testid^="carnet-ligne-"]')
      .filter({ hasText: "Depot Monastir" });
    if ((await dejaLa.count()) === 0) {
      await page.getByTestId("carnet-ajouter").click();
      await page.getByTestId("carnet-champ-nom").fill("Depot Monastir");
      await page.getByTestId("carnet-champ-adresse").fill("Avenue de la gare");
      await page
        .getByTestId("carnet-champ-gouvernorat")
        .selectOption("Monastir");
      await page.getByTestId("carnet-enregistrer").click();
      await expect(dejaLa).toBeVisible({ timeout: 15_000 });
    }

    // --- le formulaire de publication ---
    await page.goto("/demandes/nouvelle");
    // Etape 1 = type de transport, et elle est OBLIGATOIRE : sans choix,
    // « suivant » ne fait rien. L'adresse est a l'etape 2.
    await page
      .getByTestId("demandes-nouvelle-type-transport")
      .click({ timeout: 15_000 });
    await page.getByTestId("demandes-nouvelle-suivant").click();

    const selecteur = page.getByTestId("carnet-selecteur-pickup");
    await expect(selecteur).toBeVisible({ timeout: 15_000 });

    await selecteur.getByRole("button", { name: "Depot Monastir" }).click();

    // Les DEUX champs sont remplis, pas seulement l'adresse : un gouvernorat
    // incoherent avec l'adresse affichee ferait porter l'estimation de prix
    // sur le mauvais corridor, sans aucun signal.
    await expect(page.getByTestId("demandes-nouvelle-depart")).toHaveValue(
      "Monastir",
    );
    await expect(
      page.locator('input[value="Avenue de la gare"]').first(),
    ).toBeVisible();
  });
});
