// JWT Token Manager — Handles token storage, retrieval, and refresh

import { config } from "@/lib/config";
import { decideSessionApresEchec } from "@/lib/api/sessionDecision";

const ACCESS_TOKEN_KEY = "transporti_access_token";
const REFRESH_TOKEN_KEY = "transporti_refresh_token";

export interface TokenPair {
  access: string;
  refresh: string;
}

/**
 * Global event bus for session lifecycle events.
 * Emits 'session-expired' when the refresh token fails,
 * allowing AuthContext to perform a clean logout + redirect.
 */
export const sessionEvents =
  typeof window !== "undefined" ? new EventTarget() : null;

/**
 * Store JWT tokens in localStorage.
 * Only called after a successful login or token refresh.
 */
export function storeTokens(tokens: TokenPair): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(ACCESS_TOKEN_KEY, tokens.access);
  localStorage.setItem(REFRESH_TOKEN_KEY, tokens.refresh);
}

/**
 * Get the current access token (if any).
 */
export function getAccessToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(ACCESS_TOKEN_KEY);
}

/**
 * Get the current refresh token (if any).
 */
export function getRefreshToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(REFRESH_TOKEN_KEY);
}

/**
 * Clear all stored tokens (called on logout).
 */
export function clearTokens(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(ACCESS_TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
}

/**
 * Check if we have a stored access token.
 */
export function hasTokens(): boolean {
  return getAccessToken() !== null;
}

/**
 * Prévient le serveur que la session se termine, pour qu'il mette le
 * refresh token sur liste noire. Sans cet appel, un jeton copié resterait
 * valable 7 jours après la déconnexion.
 *
 * À appeler AVANT clearTokens(). Ne lève jamais : la déconnexion locale ne
 * doit pas dépendre du réseau (le serveur peut être endormi).
 */
export function revokeSessionOnServer(): void {
  const refreshToken = getRefreshToken();
  if (!refreshToken) return;

  void fetch(`${config.API_BASE_URL}/api/auth/logout/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refresh: refreshToken }),
    // keepalive : la requête part même si la page se ferme juste après.
    keepalive: true,
  }).catch(() => {
    // Volontairement ignoré : le jeton expirera de lui-même.
  });
}

/** Nom du verrou Web Locks qui sérialise le rafraîchissement entre onglets. */
const REFRESH_LOCK_NAME = "transporti_token_refresh";

/**
 * Promesse du rafraîchissement en cours DANS CET ONGLET : les appels
 * concurrents attendent la même promesse au lieu de recevoir `null`.
 */
let refreshEnCours: Promise<TokenPair | null> | null = null;

/**
 * Exécute `tache` en exclusion mutuelle entre tous les onglets de l'origine
 * (Web Locks API) quand le navigateur la fournit. Repli : on exécute
 * directement ; la relecture du `localStorage` dans `rafraichir` limite alors
 * les dégâts d'une course entre onglets.
 */
async function sousVerrouEntreOnglets(
  tache: () => Promise<TokenPair | null>,
): Promise<TokenPair | null> {
  if (typeof navigator !== "undefined" && navigator.locks?.request) {
    // Le typage DOM voit Promise<Promise<T>> ; à l'exécution c'est aplati.
    return await navigator.locks.request(REFRESH_LOCK_NAME, tache);
  }
  return tache();
}

function expirerSession(): null {
  clearTokens();
  sessionEvents?.dispatchEvent(new CustomEvent("session-expired"));
  return null;
}

/**
 * Un refresh a échoué : session morte, ou jetons renouvelés par un autre
 * onglet depuis le début de la tentative ? (décision dans sessionDecision.ts)
 */
function apresEchec(refreshAuDebut: string): TokenPair | null {
  const decision = decideSessionApresEchec(
    refreshAuDebut,
    getRefreshToken(),
    getAccessToken(),
  );
  return decision.morte ? expirerSession() : decision.jetons;
}

async function rafraichir(refreshAuDebut: string): Promise<TokenPair | null> {
  // Le verrou vient peut-être d'être libéré par un onglet qui a réussi :
  // son refresh token est alors différent du nôtre, inutile (et dangereux,
  // l'ancien est révoqué) de le présenter au serveur.
  const dejaRenouvele = decideSessionApresEchec(
    refreshAuDebut,
    getRefreshToken(),
    getAccessToken(),
  );
  if (!dejaRenouvele.morte) return dejaRenouvele.jetons;

  try {
    const response = await fetch(
      `${config.API_BASE_URL}/api/auth/token/refresh/`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refresh: refreshAuDebut }),
      },
    );

    if (!response.ok) {
      // Refus : session morte, SAUF si un autre onglet a gagné la course.
      return apresEchec(refreshAuDebut);
    }

    const data = await response.json();
    const newTokens: TokenPair = {
      access: data.access,
      refresh: data.refresh || refreshAuDebut, // Some backends return new refresh, some don't
    };
    storeTokens(newTokens);
    return newTokens;
  } catch {
    return apresEchec(refreshAuDebut);
  }
}

/**
 * Attempt to refresh the access token using the stored refresh token.
 * Returns the new token pair, or null if refresh failed.
 * Emits 'session-expired' on failure so AuthContext can react.
 *
 * Plusieurs onglets : le rafraîchissement est sérialisé par Web Locks, et un
 * échec ne déconnecte pas si un autre onglet a déjà renouvelé les jetons.
 * Dans un onglet, les appels simultanés partagent la même promesse.
 */
export function refreshAccessToken(): Promise<TokenPair | null> {
  if (refreshEnCours) return refreshEnCours;

  const refreshAuDebut = getRefreshToken();
  if (!refreshAuDebut) return Promise.resolve(null);

  refreshEnCours = sousVerrouEntreOnglets(() =>
    rafraichir(refreshAuDebut),
  ).finally(() => {
    refreshEnCours = null;
  });
  return refreshEnCours;
}
