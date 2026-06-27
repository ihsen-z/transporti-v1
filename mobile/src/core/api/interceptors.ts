import { AxiosError, AxiosRequestConfig, InternalAxiosRequestConfig } from 'axios';
import { apiClient } from './client';
import { tokenService } from '../auth/tokenService';
import * as Sentry from '@sentry/react-native';
import { ApiError } from './types';
import i18n from '../i18n/i18n';
import { Platform } from 'react-native';

let isRefreshing = false;
let failedQueue: Array<{
  resolve: (token: string) => void;
  reject: (error: any) => void;
}> = [];

const processQueue = (error: any, token: string | null = null) => {
  failedQueue.forEach((prom) => {
    if (token) {
      prom.resolve(token);
    } else {
      prom.reject(error);
    }
  });
  failedQueue = [];
};

export const setupInterceptors = () => {
  // Request Interceptor
  apiClient.interceptors.request.use(
    async (config: InternalAxiosRequestConfig) => {
      // 1. Language Header
      const currentLanguage = i18n.language || 'fr';
      config.headers['Accept-Language'] = currentLanguage;

      // 2. Platform Header
      config.headers['X-Platform'] = Platform.OS.toUpperCase();

      // 3. Auth Token
      try {
        const token = await tokenService.getAccessToken();
        if (token) {
          config.headers['Authorization'] = `Bearer ${token}`;
        }
      } catch (error) {
        console.error('Failed to get access token for request headers', error);
      }

      // Sentry Breadcrumb
      try {
        Sentry.addBreadcrumb({
          category: 'api',
          message: `Request: ${config.method?.toUpperCase()} ${config.url}`,
          level: 'info',
        });
      } catch (_) {}

      return config;
    },
    (error) => Promise.reject(error)
  );

  // Response Interceptor
  apiClient.interceptors.response.use(
    (response) => {
      try {
        Sentry.addBreadcrumb({
          category: 'api',
          message: `Response: ${response.config.method?.toUpperCase()} ${response.config.url} [${response.status}]`,
          level: 'info',
        });
      } catch (_) {}
      return response;
    },
    async (error: AxiosError) => {
      const originalRequest = error.config as AxiosRequestConfig & { _retry?: boolean };

      try {
        Sentry.addBreadcrumb({
          category: 'api',
          message: `API Error: ${originalRequest?.method?.toUpperCase()} ${originalRequest?.url} [${error.response?.status}]`,
          level: 'error',
        });
      } catch (_) {}

      if (error.response?.status === 401 && originalRequest && !originalRequest._retry && originalRequest.url !== '/auth/token/refresh/') {
        if (isRefreshing) {
          return new Promise((resolve, reject) => {
            failedQueue.push({
              resolve: (token: string) => {
                if (originalRequest.headers) {
                  originalRequest.headers['Authorization'] = `Bearer ${token}`;
                }
                resolve(apiClient(originalRequest));
              },
              reject: (err: any) => {
                reject(err);
              },
            });
          });
        }

        originalRequest._retry = true;
        isRefreshing = true;

        try {
          const refreshToken = await tokenService.getRefreshToken();
          if (!refreshToken) {
            throw new Error('No refresh token available');
          }

          const response = await apiClient.post('/auth/token/refresh/', { refresh: refreshToken });
          const { access, refresh } = response.data;

          await tokenService.saveTokens(access, refresh || refreshToken);

          processQueue(null, access);
          isRefreshing = false;

          if (originalRequest.headers) {
            originalRequest.headers['Authorization'] = `Bearer ${access}`;
          }
          return apiClient(originalRequest);
        } catch (refreshError) {
          processQueue(refreshError, null);
          isRefreshing = false;
          await tokenService.clearTokens();
          return Promise.reject(refreshError);
        }
      }

      return Promise.reject(normalizeError(error));
    }
  );
};

const normalizeError = (error: AxiosError<any>): ApiError => {
  if (!error.response) {
    return {
      code: 'NETWORK_ERROR',
      message: 'Impossible de contacter le serveur. Veuillez vérifier votre connexion internet.',
    };
  }

  const status = error.response.status;
  const data = error.response.data;

  if (status === 400) {
    let message = 'Données invalides.';
    if (data && typeof data === 'object') {
      const errorDetails = data.errors || data;
      if (typeof errorDetails === 'object') {
        const firstKey = Object.keys(errorDetails)[0];
        if (firstKey) {
          const firstError = errorDetails[firstKey];
          const errorMsg = Array.isArray(firstError) ? firstError[0] : firstError;
          message = `${firstKey}: ${errorMsg}`;
        }
      }
    }

    return {
      code: 'VALIDATION_ERROR',
      message: data?.message || message,
      details: data?.errors || data,
      status,
    };
  }

  if (status === 401) {
    return {
      code: 'UNAUTHORIZED',
      message: 'Session expirée. Veuillez vous reconnecter.',
      status,
    };
  }

  if (status === 403) {
    return {
      code: 'FORBIDDEN',
      message: "Vous n'avez pas les permissions requises pour cette action.",
      status,
    };
  }

  if (status >= 500) {
    return {
      code: 'SERVER_ERROR',
      message: 'Erreur interne du serveur. Veuillez réessayer plus tard.',
      status,
    };
  }

  return {
    code: 'UNKNOWN_ERROR',
    message: data?.message || 'Une erreur inattendue est survenue.',
    status,
  };
};
