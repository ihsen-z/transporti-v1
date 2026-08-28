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

  test("la fin de mission propose de publier le retour (T4.4)", async ({
    page,
  }) => {
    await seConnecter(page, "transporteur");

    // Le detail de mission vit encore sous /jobs/[id] : cette route porte deux
    // roles (trajet vu par un client, mission vue par un transporteur) et sa
    // separation en /missions/[id] releve du lot 4. Le test suivra le
    // renommage, sans changer ce qu'il verifie.
    await page.goto("/jobs/1");

    const amorce = page.getByTestId("mission-amorce-retour");
    await expect(amorce).toBeVisible();

    // Le corridor est inverse : le transporteur a livre a l'arrivee de la
    // mission, il rentre vers son point de depart.
    await expect(amorce).toContainText(CORRIDOR.depart);

    // Une echappatoire est obligatoire : sans elle, l'amorce serait percue
    // comme une relance publicitaire et desactivee mentalement.
    await expect(page.getByTestId("mission-amorce-plus-tard")).toBeVisible();

    await page.getByTestId("mission-amorce-publier").click();

    // Le formulaire arrive avec l'itineraire deja renseigne : c'est tout
    // l'interet de l'amorce, sinon elle ne fait que deplacer la saisie.
    await expect(page).toHaveURL(/\/retours\/nouveau\?/);
    await expect(page.getByTestId("retours-nouveau-depart")).not.toHaveValue(
      "",
    );
    await expect(page.getByTestId("retours-nouveau-arrivee")).not.toHaveValue(
      "",
    );
  });

  test("l'amorce refusee ne revient pas sur la meme mission", async ({
    page,
  }) => {
    // La regle de non-repetition est ce qui separe une amorce utile d'une
    // relance publicitaire. Sans elle, le transporteur la desactive
    // mentalement des la deuxieme apparition.
    await seConnecter(page, "transporteur");
    await page.goto("/jobs/1");

    await page.getByTestId("mission-amorce-plus-tard").click();
    await expect(page.getByTestId("mission-amorce-retour")).toBeHidden();

    await page.reload();
    await expect(page.getByTestId("mission-amorce-retour")).toBeHidden();
  });

  test("le retour publie apparait dans l'inventaire (T1.3)", async ({
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
