import { test, expect, seConnecter, CORRIDOR } from "./fixtures/backend";

/**
 * PARCOURS B — La recherche qui ne finit jamais dans le vide.
 *
 * Recherche → resultats avec economie estimee → detail → demande structuree,
 * et la branche d'echec : aucun trajet → repli → demande pre-remplie OU alerte
 * corridor.
 *
 * Critere de reussite : aucune impasse. C'est le principe IA-3 du plan, et la
 * branche de repli est aujourd'hui le seul endroit du produit qui le respecte
 * deja. Ce test la verrouille pour qu'elle ne regresse pas.
 */

test.describe("Parcours B — la recherche sans impasse", () => {
  test("une recherche fructueuse mene a une demande structuree", async ({
    page,
  }) => {
    await seConnecter(page, "client");
    await page.goto("/recherche");

    await page.getByTestId("recherche-depart").fill(CORRIDOR.depart);
    await page.getByTestId("recherche-arrivee").fill(CORRIDOR.arrivee);
    await page.getByTestId("recherche-submit").click();

    const resultats = page.getByTestId("recherche-resultats");
    await expect(resultats).toBeVisible({ timeout: 15_000 });

    await page.getByTestId("recherche-trajet").first().click();
    await expect(page).toHaveURL(/\/trajets\/\d+|\/jobs\/\d+/);

    await page.getByTestId("trajet-envoyer-demande").click();
    await expect(page.getByTestId("demande-marchandise")).toBeVisible();
  });

  test("une recherche sans resultat propose deux sorties nommees", async ({
    page,
  }) => {
    await seConnecter(page, "client");
    await page.goto("/recherche");

    await page.getByTestId("recherche-depart").fill(CORRIDOR.depart);
    await page
      .getByTestId("recherche-arrivee")
      .fill(CORRIDOR.arriveeSansTrajet);
    await page.getByTestId("recherche-submit").click();

    const repli = page.getByTestId("recherche-repli");
    await expect(repli, "l'etat vide doit s'afficher").toBeVisible({
      timeout: 15_000,
    });

    // Les deux sorties doivent exister ET etre de poids comparable. Ni l'une ni
    // l'autre n'est un lot de consolation : c'est le point de bifurcation le
    // plus important du parcours client (IA-3).
    await expect(page.getByTestId("recherche-repli-publier")).toBeVisible();
    await expect(page.getByTestId("recherche-repli-alerte")).toBeVisible();

    // L'etat vide n'est pas une erreur : aucun role d'alerte ne doit etre pose.
    await expect(
      repli.getByRole("alert"),
      "un etat vide ne doit pas etre annonce comme une erreur",
    ).toHaveCount(0);
  });

  test("la branche de repli mene a une demande pre-remplie", async ({
    page,
  }) => {
    await seConnecter(page, "client");
    await page.goto("/recherche");

    await page.getByTestId("recherche-depart").fill(CORRIDOR.depart);
    await page
      .getByTestId("recherche-arrivee")
      .fill(CORRIDOR.arriveeSansTrajet);
    await page.getByTestId("recherche-submit").click();

    await page.getByTestId("recherche-repli-publier").click();

    await expect(page).toHaveURL(/\/demandes\/nouvelle/);

    // « Pre-remplie » est la promesse du repli. Un formulaire vide apres ce clic
    // annulerait tout l'interet de la bifurcation.
    await expect(page.getByTestId("demandes-nouvelle-depart")).toHaveValue(
      CORRIDOR.depart,
    );
    await expect(page.getByTestId("demandes-nouvelle-arrivee")).toHaveValue(
      CORRIDOR.arriveeSansTrajet,
    );
  });

  test.fixme("chaque trajet affiche son economie estimee et sa base de comparaison (C1.2, lot 3)", async ({
    page,
  }) => {
    await seConnecter(page, "client");
    await page.goto("/recherche");

    await page.getByTestId("recherche-depart").fill(CORRIDOR.depart);
    await page.getByTestId("recherche-arrivee").fill(CORRIDOR.arrivee);
    await page.getByTestId("recherche-submit").click();

    const trajet = page.getByTestId("recherche-trajet").first();

    // L'economie est une ligne dediee, pas une mention noyee (IA-5).
    const economie = trajet.getByTestId("recherche-trajet-economie");
    await expect(economie).toBeVisible();

    // Decision du 26/08 : jamais un montant nu. La base de comparaison est
    // affichee a cote du chiffre, sans quoi l'economie n'est pas justifiable.
    await expect(
      trajet.getByTestId("recherche-trajet-economie-base"),
      "la base de comparaison doit accompagner le montant",
    ).toBeVisible();
  });

  test.fixme("les alertes corridor sont gerables (C1.7, lot 3)", async ({
    page,
  }) => {
    await seConnecter(page, "client");

    // A transposer depuis le mobile, qui a deja CorridorAlertsPanel.tsx,
    // CorridorAlertRow.tsx et les trois hooks. Ne pas reecrire.
    await page.goto("/alertes");

    await expect(page.getByTestId("alertes-liste")).toBeVisible();
    const premiere = page.getByTestId("alertes-ligne").first();
    await expect(premiere.getByTestId("alertes-ligne-supprimer")).toBeVisible();
  });
});
