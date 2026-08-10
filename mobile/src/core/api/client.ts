import axios, {
  AxiosError,
  type InternalAxiosRequestConfig,
} from 'axios';
import { env } from '@/core/env';
import { tokenService } from '@/core/auth/tokenService';
import { useAuthStore } from '@/core/auth/authStore';

// Client HTTP unique. Toute la logique réseau (Bearer, refresh, erreurs) est
// centralisée ici ; les features consomment via des hooks React Query.
export const apiClient = axios.create({
  baseURL: env.apiBaseUrl,
  timeout: env.apiTimeout,
  headers: { 'Content-Type': 'application/json' },
});

// Ajoute le Bearer token si une session est présente.
apiClient.interceptors.request.use(
  async (config: InternalAxiosRequestConfig) => {
    const access = await tokenService.getAccess();
    if (access) {
      config.headers.set('Authorization', `Bearer ${access}`);
    }
    return config;
  },
);

// Issue d'une tentative de refresh. La distinction est essentielle : seul un
// refus du serveur (le refresh token n'est plus valide) justifie de déconnecter
// l'utilisateur. Une panne réseau ou un 5xx sont transitoires — auparavant un
// simple `catch { return null }` les confondait, et un 502 passager suffisait à
// déconnecter l'utilisateur ET à purger tout son cache hors ligne, alors que
// son refresh token restait valable 7 jours.
type RefreshOutcome =
  | { status: 'renewed'; access: string }
  | { status: 'rejected' }
  | { status: 'unavailable' };

// Un seul refresh concurrent partagé (évite N refresh simultanés sur 401).
let refreshing: Promise<RefreshOutcome> | null = null;

async function refreshAccessToken(): Promise<RefreshOutcome> {
  const refresh = await tokenService.getRefresh();
  if (!refresh) return { status: 'rejected' };
  try {
    // Appel "nu" (axios direct, sans intercepteur) pour éviter une boucle.
    // `timeout` explicite : `apiClient` en a un, `axios` global n'en a aucun.
    // Sans lui, un réseau qui pend fige la promesse partagée et TOUTES les
    // requêtes tombées en 401 attendent indéfiniment.
    const res = await axios.post(
      `${env.apiBaseUrl}/auth/token/refresh/`,
      { refresh },
      { timeout: env.apiTimeout },
    );
    const access: string | undefined = res.data?.access;
    if (!access) return { status: 'rejected' };
    const nextRefresh: string = res.data?.refresh ?? refresh;
    await tokenService.setTokens(access, nextRefresh);
    return { status: 'renewed', access };
  } catch (err) {
    const status = (err as AxiosError).response?.status;
    // Pas de réponse du tout (réseau coupé, timeout) ou erreur serveur : la
    // session n'est pas en cause, on la garde.
    if (status === undefined || status >= 500) return { status: 'unavailable' };
    // 400/401 : le serveur a explicitement refusé le refresh token.
    return { status: 'rejected' };
  }
}

// Rejeu unique après refresh sur 401 ; sinon déconnexion.
apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const original = error.config as
      | (InternalAxiosRequestConfig & { _retried?: boolean })
      | undefined;

    if (error.response?.status === 401 && original && !original._retried) {
      original._retried = true;
      // Le verrou est libéré dans un `finally` attaché à la promesse partagée,
      // et non par le premier appelant réveillé : sinon une requête arrivée
      // entre-temps voyait `refreshing` déjà remis à null et déclenchait un
      // second refresh avec un token que la rotation serveur venait de
      // blacklister.
      refreshing =
        refreshing ??
        refreshAccessToken().finally(() => {
          refreshing = null;
        });
      const outcome = await refreshing;

      if (outcome.status === 'renewed') {
        original.headers.set('Authorization', `Bearer ${outcome.access}`);
        return apiClient(original);
      }
      if (outcome.status === 'rejected') {
        await useAuthStore.getState().logout();
      }
      // 'unavailable' : panne transitoire, on laisse l'erreur remonter à
      // l'appelant sans détruire la session.
    }
    return Promise.reject(error);
  },
);
