import {
  test,
  expect,
  seConnecter,
  CORRIDOR,
  libererDemandesDuClient,
  garantirTrajetsRetourPublies,
} from "./fixtures/backend";

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

// Les deux filtres de corridor sont des <select> de gouvernorats appliques en
// direct (`onChange`, app/(app)/recherche/page.tsx:229 et :252). Il n'y a pas
// de bouton de validation : la premiere version de ce fichier attendait un
// `recherche-submit` qui n'a jamais existe, et les trois tests expiraient sur
// un selecteur introuvable — un echec d'ecriture de test, lisible a tort comme
// une regression de l'ecran.
test.describe("Parcours B — la recherche sans impasse", () => {
  test("une recherche fructueuse mene a une demande structuree", async ({
    page,
    request,
  }) => {
    // Le detail d'un trajet masque le bouton d'envoi quand le client y a deja
    // une demande, et les parcours consomment l'inventaire. On ne depend donc
    // pas de ce que les autres tests ont laisse.
    await libererDemandesDuClient(request);
    await garantirTrajetsRetourPublies(
      request,
      CORRIDOR.depart,
      CORRIDOR.arrivee,
    );

    await seConnecter(page, "client");
    await page.goto("/recherche");

    await page.getByTestId("recherche-depart").selectOption(CORRIDOR.depart);
    await page.getByTestId("recherche-arrivee").selectOption(CORRIDOR.arrivee);

    const resultats = page.getByTestId("recherche-resultats");
    await expect(resultats).toBeVisible({ timeout: 15_000 });

    await page
      .getByTestId("recherche-trajet")
      .first()
      .getByTestId("job-card-ouvrir")
      .click();
    // Alternation retiree : elle anticipait la separation par nature, qui est
    // desormais faite. La garder laisserait passer un retour sous /jobs/<id>,
    // c'est-a-dire par la route de resolution et son ecran d'attente.
    await expect(page).toHaveURL(/\/trajets\/\d+/);

    await page.getByTestId("trajet-envoyer-demande").click();
    await expect(page.getByTestId("demande-marchandise")).toBeVisible();
  });

  test("une recherche sans resultat propose deux sorties nommees", async ({
    page,
  }) => {
    await seConnecter(page, "client");
    await page.goto("/recherche");

    await page.getByTestId("recherche-depart").selectOption(CORRIDOR.depart);
    await page
      .getByTestId("recherche-arrivee")
      .selectOption(CORRIDOR.arriveeSansTrajet);

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

    await page.getByTestId("recherche-depart").selectOption(CORRIDOR.depart);
    await page
      .getByTestId("recherche-arrivee")
      .selectOption(CORRIDOR.arriveeSansTrajet);

    await page.getByTestId("recherche-repli-publier").click();

    await expect(page).toHaveURL(/\/demandes\/nouvelle/);

    // Le formulaire est un assistant : le corridor vit a l'etape 2, apres le
    // choix du type. Le pre-remplissage porte sur les champs de cette etape,
    // il faut donc y arriver. Une seule saisie separe le repli du corridor
    // repris — c'est le cout de la bifurcation, et il est mesure ici.
    await page.getByTestId("demandes-nouvelle-type-transport").click();
    await page.getByTestId("demandes-nouvelle-suivant").click();

    // « Pre-remplie » est la promesse du repli. Un formulaire vide apres ce clic
    // annulerait tout l'interet de la bifurcation.
    await expect(page.getByTestId("demandes-nouvelle-depart")).toHaveValue(
      CORRIDOR.depart,
    );
    await expect(page.getByTestId("demandes-nouvelle-arrivee")).toHaveValue(
      CORRIDOR.arriveeSansTrajet,
    );
  });

  // DEBLOQUE LE 29/08. Le diagnostic precedent — « la grille est trop basse,
  // question metier » — visait a cote. La grille decrivait le prix MUTUALISE
  // et servait pourtant de reference au prix DEDIE : l'economie etait nulle ou
  // negative PAR CONSTRUCTION, et aucun recalibrage ne l'aurait montre tant
  // que la confusion n'etait pas nommee. Grille recalibree sur un prix de
  // dedie donne par le porteur (170 DT pour Sousse->Tunis) — migration 0016.
  test("une economie affichee porte toujours sa base de comparaison (C1.2)", async ({
    page,
    request,
  }) => {
    // `true` : il faut de l'inventaire qui ANNONCE un prix, sans quoi il n'y a
    // pas d'economie a afficher et le test mesurerait l'absence de donnees.
    await garantirTrajetsRetourPublies(
      request,
      CORRIDOR.depart,
      CORRIDOR.arrivee,
      1,
      true,
    );

    await seConnecter(page, "client");
    await page.goto("/recherche");

    // La recherche est un panneau de FILTRES : chaque changement relance la
    // requete, il n'y a pas de bouton de soumission. Le test suit
    // l'interaction reelle plutot que d'imposer un widget.
    await page.getByTestId("recherche-depart").selectOption(CORRIDOR.depart);
    await page.getByTestId("recherche-arrivee").selectOption(CORRIDOR.arrivee);

    await expect(page.getByTestId("recherche-resultats")).toBeVisible({
      timeout: 15_000,
    });

    // PAS « chaque trajet » : un retour qui n'annonce aucun prix n'a pas
    // d'economie calculable, et la decision D3 impose alors `None` et non un
    // zero trompeur. La promesse verifiable est donc : au moins un trajet
    // l'affiche, et JAMAIS un montant sans sa base.
    const montants = page.getByTestId("recherche-trajet-economie");
    const bases = page.getByTestId("recherche-trajet-economie-base");

    // L'economie est une ligne dediee, pas une mention noyee (IA-5).
    await expect(montants.first()).toBeVisible({ timeout: 15_000 });

    // Decision du 26/08 : jamais un montant nu. Un ecart entre les deux
    // comptes signifierait qu'une economie s'affiche sans etre justifiable.
    expect(
      await bases.count(),
      "chaque montant d'economie doit porter sa base de comparaison",
    ).toBe(await montants.count());
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
