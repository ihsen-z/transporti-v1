import fs from "node:fs";
import path from "node:path";

/**
 * Sessions de test enregistrees une fois pour toute la suite — lot 0.4 (reprise
 * du 29/08).
 *
 * Pourquoi ce fichier existe : `LoginView` porte `AuthRateThrottle`, plafonne a
 * `auth: '10/minute'` (transporti_core/settings.py). Les parcours comptent
 * treize tests qui se connectaient chacun par l'interface, et les aides de mise
 * en place ajoutaient leurs propres connexions par l'API. La limitation se
 * declenchait en cours de suite et l'echec ressemblait a un defaut fonctionnel
 * — le test s'arretait sur /login — alors que c'etait une contrainte
 * d'infrastructure.
 *
 * `global-setup.ts` se connecte donc UNE seule fois par role, par l'interface,
 * et depose ici l'etat obtenu. Deux connexions par execution, quel que soit le
 * nombre de tests.
 *
 * Voir docs/PLAN_ACTION_MISE_A_NIVEAU_WEB_2026-08-26.md, lot 0.4.
 */

export const ROLES = ["transporteur", "client"] as const;
export type Role = (typeof ROLES)[number];

/** Cles de `lib/api/tokenManager.ts` — a garder alignees avec elles. */
export const CLE_JETON_ACCES = "transporti_access_token";
export const CLE_JETON_RAFRAICHISSEMENT = "transporti_refresh_token";

const DOSSIER = path.join(__dirname, "..", ".auth");

export function cheminEtat(role: Role): string {
  return path.join(DOSSIER, `${role}.json`);
}

/**
 * Ce que `global-setup.ts` retient d'une connexion, en plus de l'etat du
 * navigateur : les jetons (pour les appels API de mise en place, qui n'ont plus
 * a se connecter) et l'URL atteinte apres connexion (elle depend du role).
 */
export interface SessionEnregistree {
  jetonAcces: string;
  jetonRafraichissement: string;
  urlApresConnexion: string;
}

function cheminMeta(role: Role): string {
  return path.join(DOSSIER, `${role}.meta.json`);
}

export function ecrireSession(role: Role, session: SessionEnregistree): void {
  fs.mkdirSync(DOSSIER, { recursive: true });
  fs.writeFileSync(cheminMeta(role), JSON.stringify(session, null, 2), "utf8");
}

/**
 * Lit la session d'un role. Leve si elle manque : c'est un defaut de mise en
 * place, pas un resultat de test. Un message muet ferait croire a une
 * regression fonctionnelle.
 */
export function lireSession(role: Role): SessionEnregistree {
  const chemin = cheminMeta(role);
  if (!fs.existsSync(chemin)) {
    throw new Error(
      `Session absente pour ${role} (${chemin}). global-setup.ts ne l'a pas ` +
        "ecrite : verifier que le backend et les comptes de seed sont la.",
    );
  }
  return JSON.parse(fs.readFileSync(chemin, "utf8")) as SessionEnregistree;
}

/**
 * Toutes les entrees localStorage enregistrees pour ce role.
 *
 * On restitue l'INTEGRALITE de l'etat, et non une liste de cles choisies a la
 * main : la connexion depose aussi `transporti_auth_role` et
 * `transporti_auth_user`, et ne poser que les deux jetons laissait
 * l'application sans utilisateur — les ecrans s'affichaient, vides de tout ce
 * qui depend du role, et les tests echouaient loin de la cause. Une liste en
 * dur aurait de toute facon derive au premier ajout de cle.
 */
export function entreesLocalStorage(
  role: Role,
): Array<{ name: string; value: string }> {
  const chemin = cheminEtat(role);
  if (!fs.existsSync(chemin)) {
    throw new Error(
      `Etat de navigateur absent pour ${role} (${chemin}). Voir lireSession().`,
    );
  }
  const etat = JSON.parse(fs.readFileSync(chemin, "utf8")) as {
    origins: Array<{ localStorage: Array<{ name: string; value: string }> }>;
  };
  return etat.origins.flatMap((origine) => origine.localStorage);
}

/** Vrai quand global-setup a pu ouvrir les deux sessions. */
export function sessionsDisponibles(): boolean {
  return ROLES.every((role) => fs.existsSync(cheminMeta(role)));
}

/** Efface les sessions d'une execution precedente, pour ne jamais rejouer un
 *  jeton perime en croyant tester un backend qui, lui, est absent. */
export function purgerSessions(): void {
  fs.rmSync(DOSSIER, { recursive: true, force: true });
}
