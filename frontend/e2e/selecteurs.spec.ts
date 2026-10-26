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

    // Le libelle de NAVIGATION est court ; le titre de la page reste complet.
    const entree = page.getByRole("link", { name: "Confiance", exact: true });
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

test.describe("En-tete public — tenue a toutes les largeurs", () => {
  /**
   * La barre s'est retrouvee surchargee le 31/08/2026 : le selecteur de langue,
   * « Devenir transporteur » et « Confiance » y ont ete ajoutes le meme jour,
   * sur une barre qui portait deja cinq liens et deux boutons de compte.
   *
   * Mesures constatees AVANT correction :
   *  - a 1280 px, les libelles se coupaient sur DEUX LIGNES dans une hauteur
   *    de 64 px ;
   *  - a 820 px, le contenu occupait 1044 px dans une boite de 757 — pres de
   *    300 px hors champ, sans que la page ne defile horizontalement, donc
   *    sans aucun signal.
   *
   * Ces tests MESURENT, ils ne regardent pas : un debordement d'en-tete ne
   * casse rien de visible et ne produit aucune erreur console.
   *
   * `waitForSelector` n'est pas decoratif : la page est rendue cote client, et
   * sans lui `document.querySelector("header")` rend `null` au moment de la
   * mesure. C'est ce que disaient les premiers echecs de ces tests.
   */

  const LARGEURS_BUREAU = [1440, 1280];
  const LARGEURS_COMPACTES = [1279, 1024, 820, 768, 375];

  for (const largeur of LARGEURS_BUREAU) {
    test(`a ${largeur}px la barre tient sur une ligne, sans debordement`, async ({
      page,
    }) => {
      await page.setViewportSize({ width: largeur, height: 800 });
      await page.goto("/");
      await page.waitForSelector("header nav", { timeout: 15_000 });

      const mesure = await page.evaluate(() => {
        const entete = document.querySelector("header")!;
        const interieur = entete.querySelector("div > div")!;
        const elements = Array.from(
          entete.querySelectorAll("a, button"),
        ).filter((e) => (e as HTMLElement).offsetParent !== null);
        return {
          debordement: interieur.scrollWidth > interieur.clientWidth,
          // Un libelle qui se coupe double sa hauteur. Les liens de navigation
          // n'ont aucun rembourrage vertical : leur hauteur divisee par leur
          // interligne donne leur nombre de lignes. Une hauteur figee (24 px)
          // cassait des que la charte changeait la taille du texte, sans
          // qu'aucun libelle ne se coupe.
          lignesLiens: Array.from(
            new Set(
              elements
                .filter((e) => e.tagName === "A" && e.closest("nav") !== null)
                .map((e) => {
                  const style = getComputedStyle(e);
                  const interligne =
                    parseFloat(style.lineHeight) ||
                    parseFloat(style.fontSize) * 1.2;
                  return Math.round(
                    e.getBoundingClientRect().height / interligne,
                  );
                }),
            ),
          ),
          nombreVisible: elements.length,
        };
      });

      expect(mesure.debordement, "l'en-tete deborde de sa largeur utile").toBe(
        false,
      );
      expect(
        mesure.lignesLiens,
        "un libelle de navigation se coupe sur deux lignes",
      ).toEqual([1]);
      // Logo + 3 liens + langue + transporteur + 2 boutons de compte.
      expect(mesure.nombreVisible).toBe(8);
    });
  }

  for (const largeur of LARGEURS_COMPACTES) {
    test(`a ${largeur}px la barre bascule sur le menu, sans debordement`, async ({
      page,
    }) => {
      await page.setViewportSize({ width: largeur, height: 800 });
      await page.goto("/");
      await page.waitForSelector("header", { timeout: 15_000 });

      const mesure = await page.evaluate(() => {
        const entete = document.querySelector("header")!;
        const interieur = entete.querySelector("div > div")!;
        return {
          debordement: interieur.scrollWidth > interieur.clientWidth,
          debordementPage:
            document.documentElement.scrollWidth > window.innerWidth,
        };
      });

      expect(mesure.debordement, "l'en-tete deborde de sa largeur utile").toBe(
        false,
      );
      expect(mesure.debordementPage).toBe(false);
    });
  }

  test("le menu compact porte TOUTES les entrees de la barre", async ({
    page,
  }) => {
    // Le point qui compte : basculer sur un menu ne doit rien faire perdre.
    // Sans cette assertion, remonter le seuil de bascule aurait pu escamoter
    // « Devenir transporteur » — l'entree d'acquisition de P4 — sur toutes les
    // largeurs sous 1280 px.
    await page.setViewportSize({ width: 375, height: 800 });
    await page.goto("/");

    await page
      .getByRole("button", { name: "Ouvrir le menu" })
      .click({ timeout: 15_000 });

    for (const libelle of [
      "Accueil",
      "Confiance",
      "Aide",
      "Devenir transporteur",
      "Se connecter",
      "Créer un compte",
    ]) {
      // Limite a l'en-tete : la page d'accueil et le pied de page portent
      // aussi « Devenir transporteur », et ce test-ci parle de la barre.
      await expect(
        page
          .locator("header")
          .getByRole("link", { name: libelle, exact: true }),
      ).toBeVisible();
    }
    // Le selecteur de langue aussi : sans lui, un arabophone sur telephone ne
    // peut changer de langue nulle part sur le site public.
    await expect(
      page.getByRole("button", { name: "Switch language" }),
    ).toBeVisible();
  });

  test("TOUT lien « Devenir transporteur » porte le role dans son URL", async ({
    page,
  }) => {
    // Le defaut a ete corrige trois fois, sur trois emplacements differents :
    // page d'accueil, en-tete, puis pied de page — ce dernier decouvert par un
    // parcours, pas par relecture. Un lien « Devenir transporteur » sans
    // `?role=transporter` ouvre le formulaire sur « Client » et cree un compte
    // client, qui ne peut pas publier de trajet retour.
    //
    // On verifie donc TOUS les liens de la page portant ce libelle, plutot
    // qu'un emplacement connu : c'est le seul controle qui attrape le
    // quatrieme.
    await page.goto("/");
    await page.waitForSelector("header", { timeout: 15_000 });

    const cibles = await page.evaluate(() =>
      Array.from(document.querySelectorAll("a"))
        .filter((a) => a.textContent?.trim() === "Devenir transporteur")
        .map((a) => a.getAttribute("href") ?? ""),
    );

    expect(
      cibles.length,
      "aucun lien trouve : le libelle a change ?",
    ).toBeGreaterThan(0);
    for (const href of cibles) {
      // Soit il mene a la page d'argumentaire, soit directement a
      // l'inscription — mais alors avec le role.
      const valide =
        href.startsWith("/devenir-transporteur") ||
        href.includes("role=transporter");
      expect(valide, `« Devenir transporteur » mene a ${href}`).toBe(true);
    }
  });

  test("aucun lien de navigation ne pointe vers une ancre inexistante", async ({
    page,
  }) => {
    // Deux entrees visaient `/#services` et `/#pourquoi`, deux ancres qui
    // n'ont JAMAIS existe dans la page d'accueil. Elles sont retirees ; ce test
    // empeche d'en reintroduire.
    await page.goto("/");
    await page.waitForSelector("header", { timeout: 15_000 });

    const ancres = await page.evaluate(() =>
      Array.from(document.querySelectorAll("header a"))
        .map((a) => a.getAttribute("href") ?? "")
        .filter((h) => h.includes("#"))
        .map((h) => h.slice(h.indexOf("#") + 1)),
    );

    for (const id of ancres) {
      expect(
        await page.locator(`#${id}`).count(),
        `l'en-tete pointe vers #${id}, qui n'existe pas`,
      ).toBeGreaterThan(0);
    }
  });
});
