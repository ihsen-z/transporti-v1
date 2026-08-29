import {
  chromium,
  request as apiRequest,
  type FullConfig,
} from "@playwright/test";
import { COMPTES, BACKEND_URL } from "./fixtures/backend";
import {
  CLE_JETON_ACCES,
  CLE_JETON_RAFRAICHISSEMENT,
  ROLES,
  cheminEtat,
  ecrireSession,
  purgerSessions,
  type Role,
} from "./fixtures/sessions";

/**
 * Ouvre une session par role, une seule fois, avant toute la suite.
 *
 * La connexion se fait par l'INTERFACE et non par un appel API : le parcours de
 * connexion fait partie de ce que l'on veut garder sous surveillance. Il n'est
 * plus rejoue a chaque test, il est joue ici — et s'il casse, aucun parcours ne
 * demarre, avec le message ci-dessous pour l'expliquer.
 *
 * Ne leve pas quand le backend est absent : les parcours s'ignorent alors avec
 * un message explicite (fixture `backendPret`), au lieu de faire echouer toute
 * l'execution pour une raison d'environnement.
 */
async function globalSetup(config: FullConfig): Promise<void> {
  const baseURL = config.projects[0]?.use?.baseURL ?? "http://localhost:3000";

  // Une execution precedente a pu laisser des jetons perimes. Les garder
  // ferait passer un backend eteint pour une suite prete a tourner.
  purgerSessions();

  const contexteApi = await apiRequest.newContext();
  let backendPret = false;
  try {
    const reponse = await contexteApi.get(`${BACKEND_URL}/health/`, {
      timeout: 3_000,
    });
    backendPret = reponse.ok();
  } catch {
    backendPret = false;
  }
  await contexteApi.dispose();

  if (!backendPret) {
    console.warn(
      `[global-setup] Backend introuvable sur ${BACKEND_URL} : aucune session ` +
        "ouverte, les parcours seront ignores.",
    );
    return;
  }

  const navigateur = await chromium.launch();
  try {
    for (const role of ROLES) {
      await ouvrirSession(navigateur, baseURL, role);
    }
  } finally {
    await navigateur.close();
  }
}

async function ouvrirSession(
  navigateur: import("@playwright/test").Browser,
  baseURL: string,
  role: Role,
): Promise<void> {
  const compte = COMPTES[role];
  const contexte = await navigateur.newContext({ baseURL });
  const page = await contexte.newPage();
  try {
    await page.goto("/login");
    await page.getByTestId("login-email").fill(compte.email);
    await page.getByTestId("login-password").fill(compte.motDePasse);
    await page.getByTestId("login-submit").click();
    await page.waitForURL(/\/(dashboard|recherche)/, { timeout: 20_000 });

    const etat = await contexte.storageState({ path: cheminEtat(role) });
    const stockage = etat.origins.flatMap((o) => o.localStorage);
    const jetonAcces = stockage.find((e) => e.name === CLE_JETON_ACCES)?.value;
    const jetonRafraichissement = stockage.find(
      (e) => e.name === CLE_JETON_RAFRAICHISSEMENT,
    )?.value;

    if (!jetonAcces || !jetonRafraichissement) {
      throw new Error(
        `Connexion aboutie pour ${role} mais les jetons sont absents de ` +
          "localStorage. Verifier les cles de lib/api/tokenManager.ts.",
      );
    }

    ecrireSession(role, {
      jetonAcces,
      jetonRafraichissement,
      urlApresConnexion: new URL(page.url()).pathname,
    });
  } catch (erreur) {
    // Volontairement non bloquant : un compte de seed manquant est un defaut
    // d'environnement. Les parcours s'ignoreront avec un message qui le dit.
    console.warn(
      `[global-setup] Connexion impossible pour ${role} (${compte.email}) : ` +
        `${erreur instanceof Error ? erreur.message : String(erreur)}`,
    );
  } finally {
    await contexte.close();
  }
}

export default globalSetup;
