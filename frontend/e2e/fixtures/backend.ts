import { test as base, expect, type APIRequestContext } from "@playwright/test";

/**
 * Socle commun aux trois parcours critiques — lot 0.4.
 *
 * Les parcours metier exigent un backend joignable et des comptes de test. Sans
 * eux, un test echouerait pour une mauvaise raison : on ne saurait pas si c'est
 * le parcours qui est casse ou l'environnement qui est absent. Ces fixtures
 * font donc la distinction — elles ignorent le test avec un message explicite
 * quand le backend manque, et ne le laissent echouer que sur un vrai defaut.
 *
 * Voir docs/PLAN_ACTION_MISE_A_NIVEAU_WEB_2026-08-26.md, lot 0.4.
 */

const BACKEND_URL = process.env.E2E_BACKEND_URL ?? "http://localhost:8000";

/**
 * Comptes de test, crees par `python manage.py seed_test_data`.
 *
 * Ce sont les comptes REELS de la commande de seed du projet, pas des comptes
 * inventes pour ces tests : la premiere version de cette fixture posait des
 * identifiants qui n'existaient nulle part, et la connexion aurait echoue.
 */
export const COMPTES = {
  transporteur: {
    email:
      process.env.E2E_TRANSPORTEUR_EMAIL ?? "mehdi.khelifi@test.transporti.tn",
    motDePasse: process.env.E2E_TRANSPORTEUR_PASSWORD ?? "Test@123!",
  },
  client: {
    email: process.env.E2E_CLIENT_EMAIL ?? "leila.benamor@test.transporti.tn",
    motDePasse: process.env.E2E_CLIENT_PASSWORD ?? "Test@123!",
  },
} as const;

/** Corridor de reference des scenarios, aligne sur le pilote A1. */
export const CORRIDOR = {
  depart: "Sfax",
  arrivee: "Tunis",
  // Corridor volontairement desert, pour exercer l'etat de repli du parcours B.
  arriveeSansTrajet: "Tozeur",
} as const;

async function backendJoignable(request: APIRequestContext): Promise<boolean> {
  try {
    // `/health/` est monte a la racine (transporti_core/urls.py:89), pas sous
    // /api/. La premiere version de cette fixture interrogeait /api/health/,
    // qui repond 404 : les parcours auraient ete ignores en SILENCE meme avec
    // un backend disponible — le socle aurait paru vert sans rien verifier.
    const reponse = await request.get(`${BACKEND_URL}/health/`, {
      timeout: 3_000,
    });
    return reponse.ok();
  } catch {
    return false;
  }
}

export const test = base.extend<{ backendPret: void }>({
  backendPret: [
    async ({ request }, use) => {
      const pret = await backendJoignable(request);
      test.skip(
        !pret,
        `Backend introuvable sur ${BACKEND_URL}. Demarrer le backend et amorcer ` +
          `les comptes de test, ou definir E2E_BACKEND_URL. Ce test ne mesure ` +
          `rien sans lui — il est ignore plutot que declare en echec.`,
      );
      await use();
    },
    { auto: true },
  ],
});

/**
 * Connecte un role via l'interface, et non par injection de jeton : le parcours
 * de connexion fait partie de ce que l'on veut garder sous surveillance.
 */
export async function seConnecter(
  page: import("@playwright/test").Page,
  role: keyof typeof COMPTES,
): Promise<void> {
  const compte = COMPTES[role];
  await page.goto("/login");
  await page.getByTestId("login-email").fill(compte.email);
  await page.getByTestId("login-password").fill(compte.motDePasse);
  await page.getByTestId("login-submit").click();
  await expect(page).toHaveURL(/\/(dashboard|recherche)/, { timeout: 15_000 });
}

/**
 * Jetons mis en cache pour toute la session de test.
 *
 * `LoginView` porte `AuthRateThrottle`. Chaque aide de mise en place se
 * connectait auparavant pour son propre compte, ce qui ajoutait deux appels
 * par test aux connexions faites par l'interface — et declenchait la
 * limitation, dont l'erreur (`tokens` indefini) ne dit rien de sa cause.
 */
const jetons = new Map<string, string>();

async function jetonDe(
  request: APIRequestContext,
  role: keyof typeof COMPTES,
): Promise<string> {
  const enCache = jetons.get(role);
  if (enCache) return enCache;

  const reponse = await request.post(`${BACKEND_URL}/api/auth/login/`, {
    data: { email: COMPTES[role].email, password: COMPTES[role].motDePasse },
  });
  if (!reponse.ok()) {
    throw new Error(
      `Connexion API refusee pour ${role} (HTTP ${reponse.status()}). ` +
        "Cause probable : la limitation de debit sur /api/auth/login/.",
    );
  }
  const jeton = (await reponse.json()).tokens.access;
  jetons.set(role, jeton);
  return jeton;
}

export { expect };

/**
 * Prepare une demande CONTRE-PROPOSEE, prete a etre acceptee par le client.
 *
 * Les tests de parcours MUTENT l'etat : accepter une contre-proposition la
 * consomme. Sans cette preparation, le test passait une fois puis echouait,
 * ce qui est pire qu'un test rouge — il donne l'illusion d'une regression.
 *
 * On passe par l'API et non par l'interface : la mise en place n'est pas ce
 * que le test verifie, et la faire a l'ecran la rendrait aussi fragile que le
 * parcours lui-meme.
 *
 * Retourne l'identifiant du trajet concerne, ou null si aucun trajet retour
 * publie n'est disponible.
 */
export async function preparerContrePropositionEnAttente(
  request: APIRequestContext,
): Promise<number | null> {
  const jetonClient = await jetonDe(request, "client");
  const jetonTransporteur = await jetonDe(request, "transporteur");
  const enTete = (t: string) => ({ Authorization: `Bearer ${t}` });

  // Un trajet retour publie du transporteur de test.
  const trajets = await request.get(
    `${BACKEND_URL}/api/jobs/transporter/?type=owned`,
    { headers: enTete(jetonTransporteur) },
  );
  const corpsTrajets = await trajets.json();
  const candidats = (corpsTrajets.results ?? corpsTrajets).filter(
    (t: { status: string; is_return_trip: boolean }) =>
      t.is_return_trip && t.status === "PUBLISHED",
  );
  if (!candidats.length) return null;

  // On essaie chaque trajet : le client ne peut avoir qu'une demande en cours
  // par trajet, donc un trajet deja sollicite est refuse.
  for (const trajet of candidats) {
    const creation = await request.post(
      `${BACKEND_URL}/api/jobs/${trajet.id}/requests/`,
      {
        headers: enTete(jetonClient),
        data: {
          description: "Preparation de test",
          proposed_price: "85.00",
          payment_method: "DIGITAL",
        },
      },
    );
    if (!creation.ok()) continue;

    const demande = (await creation.json()).request;
    const reponse = await request.post(
      `${BACKEND_URL}/api/trip-requests/${demande.id}/respond/`,
      {
        headers: enTete(jetonTransporteur),
        data: { action: "counter", counter_price: 95 },
      },
    );
    if (reponse.ok()) return trajet.id;
  }
  return null;
}

/**
 * Garantit au moins `minimum` demandes EN ATTENTE sur des trajets distincts.
 *
 * La boite de reception consolidee doit prouver qu'elle agrege plusieurs
 * trajets : sans donnees provisionnees, le test dependait de ce que les autres
 * tests avaient laisse — et echouait selon l'ordre d'execution, ce qui est
 * pire qu'un echec franc.
 *
 * Retourne le nombre de trajets distincts effectivement couverts.
 */
export async function preparerDemandesEnAttente(
  request: APIRequestContext,
  minimum = 2,
): Promise<number> {
  const jetonClient = await jetonDe(request, "client");
  const jetonTransporteur = await jetonDe(request, "transporteur");
  const enTete = (t: string) => ({ Authorization: `Bearer ${t}` });

  const recues = await request.get(
    `${BACKEND_URL}/api/trip-requests/received/?status=PENDING`,
    { headers: enTete(jetonTransporteur) },
  );
  const dejaLa = new Set<number>(
    ((await recues.json()).results ?? []).map((d: { job: number }) => d.job),
  );

  const trajets = await request.get(
    `${BACKEND_URL}/api/jobs/transporter/?type=owned`,
    { headers: enTete(jetonTransporteur) },
  );
  const corps = await trajets.json();
  const publies = (corps.results ?? corps).filter(
    (t: { status: string; is_return_trip: boolean }) =>
      t.is_return_trip && t.status === "PUBLISHED",
  );

  for (const trajet of publies) {
    if (dejaLa.size >= minimum) break;
    if (dejaLa.has(trajet.id)) continue;
    const creation = await request.post(
      `${BACKEND_URL}/api/jobs/${trajet.id}/requests/`,
      {
        headers: enTete(jetonClient),
        data: {
          description: "Preparation de test",
          proposed_price: "85.00",
          payment_method: "DIGITAL",
        },
      },
    );
    // Un refus signifie qu'une demande y est deja en cours : on passe.
    if (creation.ok()) dejaLa.add(trajet.id);
  }
  return dejaLa.size;
}
