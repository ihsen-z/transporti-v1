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
  // Second corridor, pour les scenarios qui doivent prouver une agregation
  // ENTRE trajets : deux demandes sur le meme corridor ne montrent pas qu'une
  // boite de reception consolide plusieurs trajets.
  departSecondaire: "Sousse",
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

/**
 * Lit une reponse de liste, ou echoue en le DISANT.
 *
 * Les aides supposaient `(corps.results ?? corps)` toujours iterable. Quand
 * l'API repondait autre chose — 429 de limitation, 401 de jeton perime, page
 * d'erreur — le test tombait sur un « .filter is not a function » qui ne
 * nomme ni l'endpoint ni le code HTTP. Le diagnostic coutait plus cher que
 * l'incident.
 */
async function listeDe<T>(
  reponse: import("@playwright/test").APIResponse,
  quoi: string,
): Promise<T[]> {
  if (!reponse.ok()) {
    throw new Error(
      `${quoi} : HTTP ${reponse.status()} — ${(await reponse.text()).slice(0, 200)}`,
    );
  }
  const corps = await reponse.json();
  const liste = Array.isArray(corps) ? corps : corps?.results;
  if (!Array.isArray(liste)) {
    throw new Error(
      `${quoi} : reponse inattendue, ni tableau ni page paginee — ` +
        `${JSON.stringify(corps).slice(0, 200)}`,
    );
  }
  return liste as T[];
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
  // On repart d'un etat propre : un trajet deja porteur d'une demande du
  // client refuse la creation, et la preparation rendait alors `null` — le
  // test s'ignorait en silence, ce qui est la panne la plus couteuse : la
  // suite parait verte sans avoir rien verifie.
  await libererDemandesDuClient(request);
  await garantirTrajetsRetourPublies(
    request,
    CORRIDOR.depart,
    CORRIDOR.arrivee,
    2,
  );

  const jetonClient = jetonDe("client");
  const jetonTransporteur = jetonDe("transporteur");
  const enTete = (t: string) => ({ Authorization: `Bearer ${t}` });

  // Un trajet retour publie du transporteur de test.
  const trajets = await request.get(
    `${BACKEND_URL}/api/jobs/transporter/?type=owned`,
    { headers: enTete(jetonTransporteur) },
  );
  const candidats = (
    await listeDe<{ status: string; is_return_trip: boolean; id: number }>(
      trajets,
      "GET /api/jobs/transporter/?type=owned",
    )
  ).filter((t) => t.is_return_trip && t.status === "PUBLISHED");
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
  // Des trajets existent mais aucune contre-proposition n'a pu etre posee :
  // c'est un defaut, pas une absence d'environnement. Le signaler plutot que
  // de laisser le test s'ignorer.
  throw new Error(
    `${candidats.length} trajet(s) retour publie(s), mais aucune ` +
      "contre-proposition n'a pu etre preparee. Verifier /requests/ et " +
      "/respond/ ; le test ne peut pas se prononcer sans elle.",
  );
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
  // Meme raison que ci-dessus : sans remise a zero, le nombre de demandes
  // dependait de ce que les tests precedents avaient laisse.
  await libererDemandesDuClient(request);
  // Sur DEUX corridors : la boite de reception doit prouver qu'elle agrege des
  // trajets differents, et deux demandes sur le meme corridor afficheraient le
  // meme libelle — le test ne saurait pas les distinguer.
  await garantirTrajetsRetourPublies(
    request,
    CORRIDOR.depart,
    CORRIDOR.arrivee,
  );
  await garantirTrajetsRetourPublies(
    request,
    CORRIDOR.departSecondaire,
    CORRIDOR.arrivee,
  );

  const jetonClient = jetonDe("client");
  const jetonTransporteur = jetonDe("transporteur");
  const enTete = (t: string) => ({ Authorization: `Bearer ${t}` });

  const recues = await request.get(
    `${BACKEND_URL}/api/trip-requests/received/?status=PENDING`,
    { headers: enTete(jetonTransporteur) },
  );
  const dejaLa = new Set<number>(
    (
      await listeDe<{ job: number }>(
        recues,
        "GET /api/trip-requests/received/?status=PENDING",
      )
    ).map((d) => d.job),
  );

  // Les trajets sont lus sur l'endpoint PUBLIC, celui que voit le client.
  // La liste du transporteur contient aussi ses trajets PERIMES : ils restent
  // PUBLISHED mais `JobPublicListView` les ecarte, si bien qu'une demande
  // creee sur l'un d'eux n'apparaissait nulle part. La preparation croyait
  // avoir couvert deux trajets, le test n'en voyait qu'un, et il s'ignorait.
  const publies: { id: number }[] = [];
  for (const depart of [CORRIDOR.depart, CORRIDOR.departSecondaire]) {
    const parametres = new URLSearchParams({
      is_return_trip: "true",
      pickup_governorate: depart,
      dropoff_governorate: CORRIDOR.arrivee,
      page_size: "50",
    });
    const visibles = await request.get(
      `${BACKEND_URL}/api/jobs/public/?${parametres.toString()}`,
      { headers: enTete(jetonClient) },
    );
    publies.push(
      ...(await listeDe<{ id: number }>(
        visibles,
        `GET /api/jobs/public/ (${depart} vers ${CORRIDOR.arrivee})`,
      )),
    );
  }

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

  if (dejaLa.size < minimum) {
    // NE PAS rendre un compte insuffisant en silence : l'appelant s'ignorait
    // alors lui-meme, et la suite paraissait verte sans avoir rien verifie.
    throw new Error(
      `Impossible de preparer ${minimum} demandes en attente sur des trajets ` +
        `distincts : ${dejaLa.size} obtenue(s) sur ${publies.length} trajet(s) ` +
        "visible(s). Verifier POST /api/jobs/<id>/requests/.",
    );
  }
  return dejaLa.size;
}

/**
 * Annule toutes les demandes en cours du client.
 *
 * Le detail d'un trajet n'affiche le bouton d'envoi que si le client n'a PAS
 * deja de demande dessus : sinon il montre l'etat de la demande existante.
 * Une execution precedente laissait donc le test suivant sans bouton a
 * cliquer — la suite passait une fois puis echouait, ce qui se lit a tort
 * comme une regression.
 *
 * Retourne le nombre de demandes annulees.
 */
export async function libererDemandesDuClient(
  request: APIRequestContext,
): Promise<number> {
  const enTete = { Authorization: `Bearer ${jetonDe("client")}` };
  const miennes = await request.get(`${BACKEND_URL}/api/trip-requests/my/`, {
    headers: enTete,
  });
  const enCours = (
    await listeDe<{ id: number; status: string }>(
      miennes,
      "GET /api/trip-requests/my/",
    )
  ).filter((d) => d.status === "PENDING" || d.status === "COUNTERED");

  let annulees = 0;
  for (const demande of enCours) {
    const reponse = await request.post(
      `${BACKEND_URL}/api/trip-requests/${demande.id}/cancel/`,
      { headers: enTete },
    );
    if (reponse.ok()) annulees += 1;
  }
  return annulees;
}

/**
 * Garantit qu'au moins `minimum` trajets retour PUBLIES existent sur le
 * corridor, en en publiant au besoin.
 *
 * Les parcours CONSOMMENT l'inventaire : accepter une contre-proposition
 * retire le trajet de la recherche. Chaque execution en epuisait donc une
 * part du jeu de seed, et la suite finissait par echouer sur une recherche
 * vide — un symptome qui accuse l'ecran de recherche alors que la cause est
 * l'usure des donnees.
 *
 * On publie plutot que de reamorcer toute la base : `seed_test_data --clear`
 * detruirait le travail en cours de l'environnement de developpement.
 *
 * Retourne le nombre de trajets publies par cet appel (0 si l'inventaire
 * suffisait deja).
 */
export async function garantirTrajetsRetourPublies(
  request: APIRequestContext,
  depart: string,
  arrivee: string,
  minimum = 1,
  /**
   * N'accepter comme suffisants que les trajets qui ANNONCENT un prix.
   *
   * Un retour sans prix n'a pas d'economie calculable — D3 impose alors
   * `None`, pas un zero. Le test de C1.2 exige donc de l'inventaire prixe,
   * la ou les autres se contentent d'un trajet visible.
   */
  exigerUnPrix = false,
): Promise<number> {
  const enTete = { Authorization: `Bearer ${jetonDe("transporteur")}` };

  // On interroge l'endpoint que la RECHERCHE utilise, avec le jeton du client
  // — pas la liste du transporteur.
  //
  // Deux raisons. D'abord la verite : `JobPublicListView` applique lui-meme
  // ses filtres (statut PUBLISHED, `scheduled_time >= now`), donc ce qu'il
  // renvoie est exactement ce que le client verra. Ensuite un piege paye
  // comptant : la liste du transporteur n'expose PAS `price_tnd_min`, si bien
  // qu'un controle `!== null` y recevait `undefined` et declarait prixe chaque
  // trajet. L'inventaire paraissait suffisant, rien n'etait publie, et le test
  // echouait sur une absence de donnees qu'il croyait avoir garantie.
  const parametres = new URLSearchParams({
    is_return_trip: "true",
    pickup_governorate: depart,
    dropoff_governorate: arrivee,
    page_size: "50",
  });
  const visibles = await request.get(
    `${BACKEND_URL}/api/jobs/public/?${parametres.toString()}`,
    { headers: { Authorization: `Bearer ${jetonDe("client")}` } },
  );
  const resultats = await listeDe<Record<string, unknown>>(
    visibles,
    `GET /api/jobs/public/ (${depart} vers ${arrivee})`,
  );

  if (exigerUnPrix && resultats.length && !("price_tnd_min" in resultats[0])) {
    throw new Error(
      "`price_tnd_min` absent de /api/jobs/public/ : le controle de prix ne " +
        "mesurerait rien. Verifier TransportJobListSerializer.",
    );
  }

  const surLeCorridor = resultats.filter(
    (t) => !exigerUnPrix || t.price_tnd_min !== null,
  );

  let publies = 0;
  for (let i = surLeCorridor.length; i < minimum; i += 1) {
    // Date volontairement lointaine : un trajet trop proche peut etre refuse
    // par le delai minimum de planification.
    const date = new Date(Date.now() + (i + 3) * 24 * 3_600_000);
    const reponse = await request.post(`${BACKEND_URL}/api/jobs/return-trip/`, {
      headers: enTete,
      data: {
        job_type: "TRANSPORT",
        pickup_address: `${depart} centre`,
        pickup_governorate: depart,
        dropoff_address: `${arrivee} centre`,
        dropoff_governorate: arrivee,
        scheduled_time: date.toISOString(),
        description: "Trajet de test provisionne par la suite e2e",
        available_capacity: "Volume disponible",
        available_capacity_kg: 800,
        // Un prix EST necessaire : sans lui l'economie estimee vaut `None`
        // (on ne soustrait rien d'un prix absent) et le badge C1.2 ne
        // s'affiche pas. Valeur volontairement basse devant l'estimation d'un
        // dedie sur ces corridors — c'est la promesse meme du trajet retour.
        price_tnd_min: "120.00",
      },
    });
    if (!reponse.ok()) {
      throw new Error(
        `Publication d'un trajet ${depart} vers ${arrivee} refusee ` +
          `(HTTP ${reponse.status()}) : ${await reponse.text()}`,
      );
    }
    publies += 1;
  }
  return publies;
}
