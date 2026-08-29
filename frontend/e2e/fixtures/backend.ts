import { test as base, expect, type APIRequestContext } from "@playwright/test";
import {
  entreesLocalStorage,
  lireSession,
  sessionsDisponibles,
} from "./sessions";

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

export const BACKEND_URL =
  process.env.E2E_BACKEND_URL ?? "http://localhost:8000";

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
      // Le backend repond mais `global-setup.ts` n'a pas pu ouvrir de session :
      // comptes de seed absents, ou parcours de connexion casse. Distinguer ce
      // cas evite de laisser croire a un defaut du parcours teste.
      test.skip(
        !sessionsDisponibles(),
        "Aucune session ouverte par global-setup.ts alors que le backend " +
          "repond. Amorcer les comptes : `manage.py seed_test_data --clear`. " +
          "Le detail de l'echec de connexion est dans la sortie [global-setup].",
      );
      await use();
    },
    { auto: true },
  ],
});

/**
 * Restaure la session du role, ouverte une seule fois par `global-setup.ts`.
 *
 * Le nom est conserve : du point de vue d'un parcours, le resultat est le meme
 * — la page s'ouvre authentifiee. Ce qui change est le cout. Une connexion par
 * l'interface a chaque test faisait treize appels a /api/auth/login/, plafonne
 * a dix par minute par `AuthRateThrottle` : la suite echouait a partir du
 * onzieme, sur /login, ce qui se lisait comme une regression fonctionnelle.
 *
 * Le parcours de connexion reste couvert : c'est `global-setup.ts` qui le joue,
 * par l'interface, et s'il casse aucun parcours ne demarre.
 *
 * L'etat est pose par `addInitScript`, donc AVANT le premier script de la page :
 * l'application le trouve des son montage et ne redirige pas vers /login le
 * temps d'une hydratation.
 */
export async function seConnecter(
  page: import("@playwright/test").Page,
  role: keyof typeof COMPTES,
): Promise<void> {
  const session = lireSession(role);

  await page.addInitScript((entrees) => {
    for (const entree of entrees) {
      localStorage.setItem(entree.name, entree.value);
    }
  }, entreesLocalStorage(role));

  await page.goto(session.urlApresConnexion);
  // Assertion volontairement conservee : si le jeton restaure n'est plus
  // accepte, l'application renvoie sur /login et il faut le voir ici, au lieu
  // d'un echec obscur plus loin dans le parcours.
  await expect(page).not.toHaveURL(/\/login/, { timeout: 15_000 });
}

/**
 * Jeton d'un role pour les appels API de mise en place.
 *
 * Lu depuis la session de `global-setup.ts` : aucune connexion supplementaire
 * n'est emise. C'etait la seconde source d'appels a /api/auth/login/, et donc
 * de declenchement de la limitation de debit.
 */
function jetonDe(role: keyof typeof COMPTES): string {
  return lireSession(role).jetonAcces;
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
  const jetonClient = jetonDe("client");
  const jetonTransporteur = jetonDe("transporteur");
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
  const jetonClient = jetonDe("client");
  const jetonTransporteur = jetonDe("transporteur");
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
