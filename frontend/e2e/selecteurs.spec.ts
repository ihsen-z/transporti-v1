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

test.describe("Selecteurs — espace retours", () => {
  // Ces ecrans sont derriere AuthGuard. Sans session, ils redirigent vers
  // /login : c'est le comportement attendu et on le verrouille, car un ecran
  // de publication ou d'inventaire accessible sans authentification serait
  // une faille.
  for (const route of ["/retours/nouveau", "/retours"]) {
    test(`${route} exige une session`, async ({ page }) => {
      await page.goto(route);

      await expect(page).toHaveURL(/\/login/, { timeout: 15_000 });
    });
  }
});

test.describe("Acquisition transporteur — pre-selection du role", () => {
  /**
   * `/register?role=transporter` est la destination du CTA « Devenir
   * transporteur », la SEULE entree d'acquisition transporteur du site.
   *
   * Le parametre etait ignore : le formulaire s'ouvrait sur « Client », et un
   * transporteur qui cliquait « Devenir transporteur » creait un compte CLIENT
   * sans que rien ne le signale. Constate dans le navigateur avant correction.
   */
  test("le parametre ?role=transporter pre-selectionne bien le transporteur", async ({
    page,
  }) => {
    await page.goto("/register?role=transporter");

    await expect(page.getByTestId("register-role-transporter")).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    await expect(page.getByTestId("register-role-client")).toHaveAttribute(
      "aria-pressed",
      "false",
    );
  });

  test("sans parametre, le client reste le defaut", async ({ page }) => {
    // Le defaut ne doit pas basculer au passage : la majorite des inscriptions
    // reste cote client.
    await page.goto("/register");

    await expect(page.getByTestId("register-role-client")).toHaveAttribute(
      "aria-pressed",
      "true",
    );
  });

  test("un role fabrique retombe sur le client, sans etat intermediaire", async ({
    page,
  }) => {
    await page.goto("/register?role=nimportequoi");

    await expect(page.getByTestId("register-role-client")).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    await expect(page.getByTestId("register-role-transporter")).toHaveAttribute(
      "aria-pressed",
      "false",
    );
  });
});

test.describe("P4 — page publique « Devenir transporteur »", () => {
  /**
   * L'audit du 14/07 notait l'entree transporteur comme « enfouie », et
   * c'etait encore vrai : « Devenir transporteur » etait le DERNIER lien de la
   * DERNIERE section de la page d'accueil, et il menait droit au formulaire
   * d'inscription — aucune page ne faisait l'argumentaire.
   *
   * Ces tests verrouillent l'entonnoir entier, pas seulement l'existence de la
   * page : l'entree visible, la page, puis l'inscription avec le bon role.
   */

  test("l'entree est visible dans l'en-tete de la page d'accueil", async ({
    page,
  }) => {
    await page.goto("/");

    const entree = page.getByTestId("header-devenir-transporteur");
    // `toBeVisible` et non `toBeAttached` : « enfouie » etait le probleme.
    await expect(entree).toBeVisible({ timeout: 15_000 });
    await expect(entree).toHaveAttribute("href", "/devenir-transporteur");
  });

  test("la page porte son propre titre, pas celui du site", async ({
    page,
  }) => {
    // Une page d'acquisition heritait du titre generique
    // « Transporti — La logistique reinventee » : le seul ecran dont la raison
    // d'etre est d'etre trouve n'avait pas de titre a lui.
    //
    // `metadata` ne peut etre exporte que d'un composant SERVEUR ; la page est
    // `"use client"` (elle lit le dictionnaire via un hook), d'ou le
    // `layout.tsx` du segment. Ce test verrouille ce montage : si quelqu'un
    // deplacait le metadata dans la page, il disparaitrait en silence.
    await page.goto("/devenir-transporteur");

    await expect(page).toHaveTitle("Devenir transporteur | Transporti");
  });

  test("la page rend ses sections, sans nom de cle a l'ecran", async ({
    page,
  }) => {
    await page.goto("/devenir-transporteur");

    for (const section of [
      "devenir-transporteur-commission",
      "devenir-transporteur-etapes",
      "devenir-transporteur-confiance",
      "devenir-transporteur-faq",
    ]) {
      await expect(page.getByTestId(section)).toBeVisible({ timeout: 15_000 });
    }

    // Une cle i18n manquante s'affiche telle quelle. Les autres assertions
    // visent des testID et ne le verraient pas.
    await expect(page.locator("main")).not.toContainText("becomeTransporter.");
  });

  test("les taux affiches sont ceux de la plateforme", async ({ page }) => {
    // Un test backend (payments/tests_commission_affichee.py) garantit que ces
    // valeurs correspondent a settings.COMMISSION_RATES. Ici on verifie
    // seulement qu'elles atteignent bien l'ecran — une page qui n'affiche
    // aucun taux passerait le test backend sans rien promettre.
    await page.goto("/devenir-transporteur");

    await expect(page.getByTestId("commission-retour")).toContainText("8");
    await expect(page.getByTestId("commission-transport")).toContainText("12");
    await expect(page.getByTestId("commission-demenagement")).toContainText(
      "15",
    );
  });

  test("le CTA mene a l'inscription AVEC le role transporteur", async ({
    page,
  }) => {
    // Le bout de l'entonnoir. Sans cette assertion, la page pourrait etre
    // parfaite et continuer a creer des comptes client.
    await page.goto("/devenir-transporteur");
    await page.getByTestId("devenir-transporteur-cta-principal").click();

    await expect(page).toHaveURL(/\/register\?role=transporter/);
    await expect(page.getByTestId("register-role-transporter")).toHaveAttribute(
      "aria-pressed",
      "true",
    );
  });

  test("la page bascule en arabe depuis l'en-tete public", async ({ page }) => {
    // Le selecteur de langue n'existait QUE dans l'en-tete authentifie : la
    // traduction arabe de cette page aurait ete inatteignable, donc inerte.
    await page.goto("/devenir-transporteur");

    const avant = await page.locator("main").innerText();
    await page.getByRole("button", { name: "Switch language" }).click();

    await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
    await expect(page.locator("main")).not.toHaveText(avant);
    await expect(page.locator("main")).not.toContainText("becomeTransporter.");
  });
});

test.describe("P3 — page publique « Confiance et securite »", () => {
  /**
   * Elle repond a l'objection n°1 du persona client. La page d'accueil affirme
   * « paiement securise par escrow » et « transporteurs verifies » sans jamais
   * dire ce que ces mots recouvrent : une affirmation non etayee ne leve pas
   * une objection, elle la deplace.
   */

  test("la page porte son propre titre", async ({ page }) => {
    await page.goto("/confiance");

    await expect(page).toHaveTitle("Confiance et sécurité | Transporti");
  });

  test("les trois mecanismes sont rendus, sans nom de cle a l'ecran", async ({
    page,
  }) => {
    await page.goto("/confiance");

    for (const section of [
      "confiance-escrow",
      "confiance-verification",
      "confiance-litiges",
      "confiance-faq",
    ]) {
      await expect(page.getByTestId(section)).toBeVisible({ timeout: 15_000 });
    }

    await expect(page.locator("main")).not.toContainText("trustPage.");
  });

  test("le delai de versement automatique est ANNONCE, pas tu", async ({
    page,
  }) => {
    // Le seul fait de la page qui puisse jouer contre le client : sans
    // confirmation de sa part, l'argent part au bout de 48 h. Une page de
    // confiance qui tait la seule chose susceptible de surprendre ne merite
    // pas son nom. Ce test interdit de le retirer discretement.
    await page.goto("/confiance");

    const encart = page.getByTestId("confiance-delai");
    await expect(encart).toBeVisible();
    await expect(encart).toContainText("48");
    // Et il ne doit jamais paraitre seul : c'est le litige qui le rend
    // acceptable. Annoncer le delai sans son garde-fou serait pire que se
    // taire.
    await expect(encart).toContainText("litige");
  });

  test("les interpolations sont resolues, pas rendues brutes", async ({
    page,
  }) => {
    // `{heures}` et `{score}` non remplaces s'afficheraient tels quels. Les
    // testID ne le verraient pas.
    await page.goto("/confiance");

    await expect(page.locator("main")).not.toContainText("{heures}");
    await expect(page.locator("main")).not.toContainText("{score}");
    await expect(page.getByTestId("confiance-verification")).toContainText(
      "50",
    );
  });

  test("l'entree est visible dans l'en-tete", async ({ page }) => {
    await page.goto("/");

    const entree = page.getByRole("link", { name: "Confiance et sécurité" });
    await expect(entree.first()).toBeVisible({ timeout: 15_000 });
  });

  test("la page bascule en arabe", async ({ page }) => {
    await page.goto("/confiance");
    const avant = await page.locator("main").innerText();

    await page.getByRole("button", { name: "Switch language" }).click();

    await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
    await expect(page.locator("main")).not.toHaveText(avant);
    await expect(page.locator("main")).not.toContainText("trustPage.");
    // Les chiffres doivent survivre a la traduction : une interpolation
    // oubliee dans le dictionnaire arabe ne se verrait pas autrement.
    await expect(page.locator("main")).not.toContainText("{heures}");
  });
});
