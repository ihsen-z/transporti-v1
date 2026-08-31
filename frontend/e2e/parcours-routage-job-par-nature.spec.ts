import {
  test,
  expect,
  seConnecter,
  garantirTrajetsRetourPublies,
  CORRIDOR,
} from "./fixtures/backend";

/**
 * Separation du detail d'un job PAR NATURE — /demandes/<id> et /trajets/<id>.
 *
 * Ce que ces tests protegent, et qu'aucun test unitaire ne peut voir :
 *
 * 1. la route de RESOLUTION /jobs/<id> redirige vers l'URL canonique. Elle
 *    couvre les liens anciens ou partages, /jobs/<id> ayant ete l'URL unique
 *    du detail d'un job. Si elle cassait, tout lien deja envoye a un
 *    utilisateur tomberait ;
 * 2. le GARDE-FOU de coherence : ouvrir /trajets/<id> avec l'id d'une demande
 *    classique doit corriger l'URL, pas afficher une page dont l'adresse mentit
 *    sur ce qu'elle montre ;
 * 3. l'URL est la MEME pour les deux roles. C'est tout l'interet du decoupage
 *    par nature plutot que par role : un lien reste partageable.
 *
 * Le job 1 est une demande classique du jeu de donnees de semis, avec une
 * mission attribuee au transporteur de test — ce qui permet de l'ouvrir depuis
 * les deux comptes.
 */

const JOB_DEMANDE = 1;

test.describe("Detail d'un job — separation par nature", () => {
  test("la route de resolution /jobs/<id> mene a l'URL canonique", async ({
    page,
  }) => {
    await seConnecter(page, "client");

    await page.goto(`/jobs/${JOB_DEMANDE}`);

    // `replace` et non `push` : la route de resolution ne doit pas s'empiler
    // dans l'historique, sinon le retour arriere y reboucle.
    await expect(page).toHaveURL(new RegExp(`/demandes/${JOB_DEMANDE}$`));
  });

  test("le retour arriere depuis la resolution ne reboucle pas", async ({
    page,
  }) => {
    await seConnecter(page, "client");
    await page.goto("/demandes");

    await page.goto(`/jobs/${JOB_DEMANDE}`);
    await expect(page).toHaveURL(new RegExp(`/demandes/${JOB_DEMANDE}$`));

    await page.goBack();

    // Sans `replace`, on reviendrait sur /jobs/<id>, qui redirigerait de
    // nouveau : le retour arriere serait inutilisable.
    await expect(page).toHaveURL(/\/demandes$/);
  });

  test("une nature erronee dans l'URL est corrigee, pas affichee", async ({
    page,
  }) => {
    await seConnecter(page, "client");

    // Un lien fabrique a la main, ou un id recycle : l'URL annonce un trajet
    // retour pour ce qui est une demande classique.
    await page.goto(`/trajets/${JOB_DEMANDE}`);

    await expect(page).toHaveURL(new RegExp(`/demandes/${JOB_DEMANDE}$`));
  });

  test("l'URL est identique pour le client et pour le transporteur", async ({
    page,
  }) => {
    // Le point meme du decoupage par nature : l'URL decrit CE QU'ON REGARDE,
    // jamais QUI REGARDE. Un decoupage par role rendrait ce test impossible.
    await seConnecter(page, "client");
    await page.goto(`/jobs/${JOB_DEMANDE}`);
    await expect(page).toHaveURL(new RegExp(`/demandes/${JOB_DEMANDE}$`));

    await seConnecter(page, "transporteur");
    await page.goto(`/jobs/${JOB_DEMANDE}`);
    await expect(page).toHaveURL(new RegExp(`/demandes/${JOB_DEMANDE}$`));
  });

  test("un vrai trajet retour s'ouvre sous /trajets/<id>", async ({
    page,
    request,
  }) => {
    // Les quatre tests ci-dessus partent tous d'une DEMANDE classique : ils
    // prouvent la resolution et le garde-fou, mais pas que la route /trajets
    // rende ce pour quoi elle existe. On fait donc exister un trajet retour,
    // et on l'ouvre par le chemin reel — la carte du flux de recherche, qui
    // doit construire l'URL canonique elle-meme, sans passer par la
    // resolution.
    await garantirTrajetsRetourPublies(
      request,
      CORRIDOR.depart,
      CORRIDOR.arrivee,
    );

    await seConnecter(page, "client");
    await page.goto("/recherche");

    await page.getByTestId("recherche-depart").selectOption(CORRIDOR.depart);
    await page.getByTestId("recherche-arrivee").selectOption(CORRIDOR.arrivee);
    await expect(page.getByTestId("recherche-resultats")).toBeVisible({
      timeout: 15_000,
    });

    await page
      .getByTestId("recherche-trajet")
      .first()
      .getByTestId("job-card-ouvrir")
      .click();

    // /trajets/<id> directement : aucun detour par /jobs/<id>.
    await expect(page).toHaveURL(/\/trajets\/\d+$/);
  });
});
