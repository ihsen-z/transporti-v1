import { test, expect, seConnecter, CORRIDOR } from "./fixtures/backend";

/**
 * PARCOURS C — La negociation qui converge.
 *
 * Demande envoyee → notification → demandes recues → contre-proposition →
 * acceptation client → paiement.
 *
 * Critere de reussite : a chaque etape, le destinataire sait qu'il doit agir et
 * ce qu'il doit decider. Une negociation asynchrone sans cette lisibilite ne
 * converge jamais.
 *
 * C'est aussi le parcours qui protege le lot 4 : il traverse la majeure partie
 * des 12 gestionnaires d'API de jobs/[id]/page.tsx (1 470 lignes), dont
 * handleSendTripRequest, handleAcceptCounter et handlePayNow. Sans ce test, le
 * decoupage du lot 4 se ferait a l'aveugle.
 */

test.describe("Parcours C — la negociation converge", () => {
  test("un client envoie une demande structuree sur un trajet", async ({
    page,
  }) => {
    await seConnecter(page, "client");
    await page.goto("/recherche");

    await page.getByTestId("recherche-depart").fill(CORRIDOR.depart);
    await page.getByTestId("recherche-arrivee").fill(CORRIDOR.arrivee);
    await page.getByTestId("recherche-submit").click();

    await page.getByTestId("recherche-trajet").first().click();
    await page.getByTestId("trajet-envoyer-demande").click();

    await page.getByTestId("demande-marchandise").fill("Frigo");
    await page.getByTestId("demande-poids").fill("120");
    await page.getByTestId("demande-prix").fill("85");
    await page.getByTestId("demande-submit").click();

    await expect(
      page.getByTestId("demande-confirmation"),
      "le client doit savoir que sa demande est partie",
    ).toBeVisible({ timeout: 15_000 });

    // La reassurance sur le paiement n'est pas escamotable : le client doit
    // savoir qu'il ne paie pas encore.
    await expect(
      page.getByTestId("demande-reassurance-paiement"),
    ).toBeVisible();
  });

  test("le transporteur voit la demande et peut contre-proposer", async ({
    page,
  }) => {
    await seConnecter(page, "transporteur");

    // Aujourd'hui les demandes ne sont visibles que trajet par trajet. Ce test
    // passe par le detail du retour ; il basculera vers /demandes-recues au
    // lot 2, sans changer ce qu'il verifie.
    await page.goto("/dashboard");

    const notification = page.getByTestId("dashboard-demandes-en-attente");
    await expect(
      notification,
      "le transporteur doit voir qu'une decision l'attend",
    ).toBeVisible({ timeout: 15_000 });

    await notification.click();

    const demande = page.getByTestId("demande-recue").first();
    await expect(demande).toBeVisible();

    // Les trois actions doivent etre atteignables sans ouvrir le detail, et
    // hierarchisees : accepter est l'action la plus facile.
    await expect(demande.getByTestId("demande-recue-accepter")).toBeVisible();
    await expect(
      demande.getByTestId("demande-recue-contre-proposer"),
    ).toBeVisible();
    await expect(demande.getByTestId("demande-recue-refuser")).toBeVisible();

    await demande.getByTestId("demande-recue-contre-proposer").click();
    await page.getByTestId("contre-proposition-prix").fill("95");
    await page.getByTestId("contre-proposition-submit").click();

    await expect(
      page.getByTestId("contre-proposition-confirmation"),
    ).toBeVisible({ timeout: 15_000 });
  });

  test("le client accepte la contre-proposition et paie", async ({ page }) => {
    await seConnecter(page, "client");
    await page.goto("/expeditions");

    // Le tri primaire est « qui doit agir maintenant », pas la date : le client
    // doit trouver sa negociation en attente sans la chercher.
    const enNegociation = page.getByTestId("expeditions-onglet-negociation");
    await expect(enNegociation).toBeVisible({ timeout: 15_000 });
    await enNegociation.click();

    await page.getByTestId("expeditions-ligne").first().click();

    await page.getByTestId("contre-offre-accepter").click();

    await expect(page).toHaveURL(/\/reservation\/\d+/, { timeout: 15_000 });

    // Le paiement doit annoncer ce qui est protege, sinon l'escrow ne rassure
    // personne.
    await expect(
      page.getByTestId("reservation-escrow-explication"),
    ).toBeVisible();
  });

  test("la boite de reception consolide toutes les demandes (T2.1)", async ({
    page,
  }) => {
    await seConnecter(page, "transporteur");

    // Alimente par GET /api/trip-requests/received/ (B-5), le vis-a-vis
    // transporteur de trip-requests/my/.
    await page.goto("/demandes-recues");

    // Le compteur doit refleter le total tous trajets confondus. Avant T2.1,
    // un transporteur avec trois retours en ligne devait visiter trois ecrans.
    const onglet = page.getByTestId("demandes-recues-onglet-a-decider");
    await expect(onglet).toBeVisible();
    await expect(onglet).toContainText(/\d+/);

    // La promesse de l'ecran n'est pas d'afficher un onglet, c'est de
    // CONSOLIDER : deux demandes posees sur deux trajets differents doivent
    // apparaitre dans la meme liste. Sans cette assertion, le test passerait
    // sur un ecran qui n'afficherait qu'un seul trajet.
    const cartes = page.getByTestId("demande-recue");
    await expect(cartes.first()).toBeVisible({ timeout: 15_000 });

    const corridors = await cartes.allInnerTexts();
    expect(
      new Set(corridors).size,
      "les demandes doivent provenir de trajets distincts",
    ).toBeGreaterThan(1);

    // Les trois actions sont atteignables sans ouvrir le detail.
    const premiere = cartes.first();
    await expect(premiere.getByTestId("demande-recue-accepter")).toBeVisible();
    await expect(
      premiere.getByTestId("demande-recue-contre-proposer"),
    ).toBeVisible();
    await expect(premiere.getByTestId("demande-recue-refuser")).toBeVisible();
  });
});
