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

// Un seul refresh concurrent partagé (évite N refresh simultanés sur 401).
let refreshing: Promise<string | null> | null = null;

async function refreshAccessToken(): Promise<string | null> {
  const refresh = await tokenService.getRefresh();
  if (!refresh) return null;
  try {
    // Appel "nu" (axios direct, sans intercepteur) pour éviter une boucle.
    const res = await axios.post(`${env.apiBaseUrl}/auth/token/refresh/`, {
      refresh,
    });
    const access: string | undefined = res.data?.access;
    if (!access) return null;
    const nextRefresh: string = res.data?.refresh ?? refresh;
    await tokenService.setTokens(access, nextRefresh);
    return access;
  } catch {
    return null;
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
      refreshing = refreshing ?? refreshAccessToken();
      const newAccess = await refreshing;
      refreshing = null;

      if (newAccess) {
        original.headers.set('Authorization', `Bearer ${newAccess}`);
        return apiClient(original);
      }
      await useAuthStore.getState().logout();
    }
    return Promise.reject(error);
  },
);
