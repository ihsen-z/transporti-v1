import { test, expect, seConnecter, CORRIDOR } from "./fixtures/backend";

/**
 * PARCOURS A — Le retour a vide capte.
 *
 * Mission livree → amorce « vous rentrez a vide ? » → publication du retour →
 * retour visible dans l'inventaire.
 *
 * C'est le parcours qui porte la metrique unique du produit : les kilometres de
 * retour a vide transformes en kilometres charges. Son critere de reussite n'est
 * pas seulement fonctionnel, il est chronometre : moins de 30 secondes et moins
 * de 4 saisies manuelles.
 *
 * Deux etapes visent des ecrans qui n'existent pas encore (T4.4 l'amorce, T1.3
 * l'inventaire). Elles sont ecrites maintenant, marquees `fixme`, et deviendront
 * la definition de fini du lot 1 : le lot est termine quand ces tests passent
 * sans modification.
 */

test.describe("Parcours A — le retour a vide capte", () => {
  test("un transporteur publie un retour en moins de 4 saisies", async ({
    page,
  }) => {
    await seConnecter(page, "transporteur");

    await page.goto("/retours/nouveau");

    // Le vehicule et la capacite viennent du profil (TrustProfile.vehicle_type,
    // vehicle_capacity_kg) et ne sont JAMAIS ressaisis. C'est la condition de la
    // promesse des 30 secondes, pas un confort.
    await expect(
      page.getByTestId("retours-nouveau-vehicule-prerempli"),
      "le vehicule doit etre pre-rempli depuis le profil",
    ).toBeVisible();

    // Saisies 1 et 2 — le trajet.
    await page.getByTestId("retours-nouveau-depart").fill(CORRIDOR.depart);
    await page.getByTestId("retours-nouveau-arrivee").fill(CORRIDOR.arrivee);

    // Saisie 3 — la date, par choix tactile et non par calendrier.
    await page.getByTestId("retours-nouveau-date-aujourdhui").click();

    // Saisie 4 — la place restante, par choix tactile.
    await page.getByTestId("retours-nouveau-capacite-tout").click();

    await page.getByTestId("retours-nouveau-submit").click();

    await expect(
      page.getByTestId("retours-nouveau-confirmation"),
      "la publication doit etre confirmee explicitement",
    ).toBeVisible({ timeout: 15_000 });
  });

  test.fixme("la fin de mission propose de publier le retour (T4.4, lot 1)", async ({
    page,
  }) => {
    await seConnecter(page, "transporteur");

    // Depuis une mission livree, l'amorce doit apparaitre avec le corridor
    // inverse deja renseigne. C'est l'ecran de priorite 1 du delta : sans lui,
    // l'inventaire de retours ne s'alimente que volontairement.
    await page.goto("/missions/1");

    const amorce = page.getByTestId("mission-amorce-retour");
    await expect(amorce).toBeVisible();

    // Le corridor inverse est pre-rempli : le transporteur a livre a Sfax, il
    // rentre a Tunis.
    await expect(amorce).toContainText(CORRIDOR.arrivee);

    // Une echappatoire est obligatoire : sans elle, l'amorce serait percue
    // comme une relance publicitaire et desactivee mentalement.
    await expect(page.getByTestId("mission-amorce-plus-tard")).toBeVisible();

    await page.getByTestId("mission-amorce-publier").click();

    await expect(page).toHaveURL(/\/retours\/nouveau/);
    await expect(page.getByTestId("retours-nouveau-depart")).toHaveValue(
      CORRIDOR.arrivee,
    );
  });

  test.fixme("le retour publie apparait dans l'inventaire (T1.3, lot 1)", async ({
    page,
  }) => {
    await seConnecter(page, "transporteur");
    await page.goto("/retours");

    const inventaire = page.getByTestId("retours-liste");
    await expect(inventaire).toBeVisible();

    // Un inventaire non gerable pollue la recherche client — le pivot classe
    // ce cycle de vie en Core. Les quatre actions doivent etre atteignables.
    const premier = page.getByTestId("retours-ligne").first();
    await expect(premier.getByTestId("retours-ligne-editer")).toBeVisible();
    await expect(premier.getByTestId("retours-ligne-prolonger")).toBeVisible();
    await expect(premier.getByTestId("retours-ligne-dupliquer")).toBeVisible();
    await expect(premier.getByTestId("retours-ligne-depublier")).toBeVisible();

    // L'expiration doit etre lisible, sinon l'inventaire derive sans que le
    // transporteur s'en apercoive.
    await expect(premier.getByTestId("retours-ligne-expiration")).toBeVisible();
  });
});
