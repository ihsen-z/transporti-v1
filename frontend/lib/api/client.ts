// API Client — thin fetch wrapper with full CRUD + JWT auth
// Sprint 7.5 — API Transition Layer
// Sprint C  — Enhanced with POST/PUT/DELETE + auth header injection

import { config } from "@/lib/config";
import { getAccessToken, refreshAccessToken } from "@/lib/api/tokenManager";
import { getCurrentLocale } from "@/lib/i18n/currentLocale";

/** Shape of DRF error responses (error/detail/message + field errors). */
export interface ApiErrorBody {
  error?: string;
  detail?: string;
  message?: string;
  errors?: Record<string, unknown>;
  [key: string]: unknown;
}

export class ApiError extends Error {
  constructor(
    public status: number,
    public statusText: string,
    public body?: ApiErrorBody,
    message?: string,
  ) {
    super(message || `API Error: ${status} ${statusText}`);
    this.name = "ApiError";
  }
}

/**
 * Message affiché quand le serveur ne répond pas dans le délai imparti. Sur
 * l'hébergement gratuit, le premier appel après une période d'inactivité
 * réveille l'instance (30 à 60 s) : ce n'est pas une panne. Le dictionnaire
 * arabe est chargé à la demande, il n'est donc pas importable ici : les deux
 * phrases vivent à côté de l'erreur qui les porte.
 */
const MESSAGE_SERVEUR_EN_VEILLE = {
  fr: "Le serveur se réveille, réessayez dans un instant.",
  ar: "السيرفر قاعد يفيق، عاود جرّب بعد شوية.",
} as const;

/** Thrown when OUR timeout (not a caller-supplied signal) aborts a request. */
export class ApiTimeoutError extends Error {
  constructor() {
    super(MESSAGE_SERVEUR_EN_VEILLE[getCurrentLocale()]);
    this.name = "ApiTimeoutError";
  }
}

/**
 * Convertit l'abandon provoqué par notre propre minuterie en erreur lisible.
 * Un abandon demandé par l'appelant (options.signal) reste un AbortError :
 * c'est volontaire de sa part, ce n'est pas un problème de serveur.
 */
function traduireAbandon(
  e: unknown,
  controller: AbortController,
  options: RequestOptions,
): unknown {
  const abandonne = e instanceof DOMException && e.name === "AbortError";
  if (abandonne && controller.signal.aborted && !options.signal) {
    return new ApiTimeoutError();
  }
  return e;
}

/** Narrow an unknown catch value to a displayable message. */
export function getErrorMessage(e: unknown): string | undefined {
  if (e instanceof Error) return e.message;
  if (typeof e === "string") return e;
  return undefined;
}

/**
 * Motif renvoyé par le serveur pour une erreur HTTP (`detail`, `error` ou
 * `message` du corps DRF, sinon la première erreur de champ). Contrairement à
 * `getErrorMessage`, qui n'affiche que « API Error: 400 », ceci dit POURQUOI
 * le serveur a refusé. Retourne undefined si le corps n'en contient pas.
 */
export function getApiErrorReason(e: unknown): string | undefined {
  if (!(e instanceof ApiError) || !e.body) return undefined;
  const { detail, error, message, errors } = e.body;
  for (const candidat of [detail, error, message]) {
    if (typeof candidat === "string" && candidat.trim()) return candidat;
  }
  for (const source of [errors, e.body]) {
    if (source && typeof source === "object") {
      for (const [champ, valeur] of Object.entries(source)) {
        if (Array.isArray(valeur) && typeof valeur[0] === "string") {
          return `${champ} : ${valeur[0]}`;
        }
      }
    }
  }
  return undefined;
}

/**
 * Code stable renvoyé par le serveur dans le corps d'un refus
 * (`KYC_REQUIRED`, `COMMISSION_DEBT_LIMIT`, `PIN_LOCKED`...). Permet
 * d'aiguiller l'affichage sans relire le corps à la main.
 */
export function getApiErrorCode(e: unknown): string | undefined {
  if (!(e instanceof ApiError) || !e.body) return undefined;
  const { code } = e.body;
  return typeof code === "string" && code ? code : undefined;
}

/** Code du refus « pièces d'identité non validées » (backend/logistics/kyc.py). */
export const KYC_REQUIRED_CODE = "KYC_REQUIRED";

/** Vrai quand le serveur refuse parce que la vérification du transporteur manque. */
export function isKycRequired(e: unknown): boolean {
  return getApiErrorCode(e) === KYC_REQUIRED_CODE;
}

/**
 * Code du refus « canal classique fermé » (backend/logistics/classic_channel.py) :
 * créer une demande, publier un brouillon ou déposer une offre sur une demande
 * classique alors que le lancement n'ouvre que les trajets retour.
 */
export const CLASSIC_CHANNEL_DISABLED_CODE = "CLASSIC_CHANNEL_DISABLED";

/** Vrai quand le serveur refuse une entrée du canal classique, fermé. */
export function isClassicChannelDisabled(e: unknown): boolean {
  return getApiErrorCode(e) === CLASSIC_CHANNEL_DISABLED_CODE;
}

/**
 * Délai (en secondes) avant de pouvoir réessayer, quand le serveur le donne
 * (`retry_after_seconds` d'un 423 `PIN_LOCKED`). undefined = absent ou nul.
 */
export function getRetryAfterSeconds(e: unknown): number | undefined {
  if (!(e instanceof ApiError) || !e.body) return undefined;
  const valeur = e.body.retry_after_seconds;
  return typeof valeur === "number" && Number.isFinite(valeur) && valeur > 0
    ? Math.ceil(valeur)
    : undefined;
}

interface RequestOptions {
  headers?: Record<string, string>;
  signal?: AbortSignal;
  /** Skip automatic Authorization header injection (e.g. for login/register) */
  skipAuth?: boolean;
}

async function request<T>(
  method: string,
  path: string,
  body?: unknown,
  options: RequestOptions = {},
): Promise<T> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), config.API_TIMEOUT);

  try {
    const url = `${config.API_BASE_URL}${path}`;
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      Accept: "application/json",
      ...options.headers,
    };

    // Inject JWT auth header if token is available and not skipped
    if (!options.skipAuth) {
      const token = getAccessToken();
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }
    }

    const fetchOptions: RequestInit = {
      method,
      headers,
      signal: options.signal || controller.signal,
    };

    // Only attach body for non-GET requests
    if (body !== undefined && method !== "GET") {
      fetchOptions.body = JSON.stringify(body);
    }

    let response = await fetch(url, fetchOptions);

    // Auto-retry on 401 with token refresh (only once)
    if (response.status === 401 && !options.skipAuth) {
      const newTokens = await refreshAccessToken();
      if (newTokens) {
        headers["Authorization"] = `Bearer ${newTokens.access}`;
        response = await fetch(url, { ...fetchOptions, headers });
      }
    }

    if (!response.ok) {
      let errorBody: Record<string, unknown> | undefined;
      try {
        errorBody = await response.json();
      } catch {
        // Response body is not JSON, ignore
      }
      throw new ApiError(response.status, response.statusText, errorBody);
    }

    // Handle 204 No Content
    if (response.status === 204) {
      return undefined as T;
    }

    return (await response.json()) as T;
  } catch (e) {
    throw traduireAbandon(e, controller, options);
  } finally {
    clearTimeout(timeout);
  }
}

export const apiClient = {
  get: <T>(path: string, options?: RequestOptions) =>
    request<T>("GET", path, undefined, options),

  post: <T>(path: string, body?: unknown, options?: RequestOptions) =>
    request<T>("POST", path, body, options),

  put: <T>(path: string, body?: unknown, options?: RequestOptions) =>
    request<T>("PUT", path, body, options),

  patch: <T>(path: string, body?: unknown, options?: RequestOptions) =>
    request<T>("PATCH", path, body, options),

  delete: <T>(path: string, options?: RequestOptions) =>
    request<T>("DELETE", path, undefined, options),

  /**
   * Upload a file via multipart/form-data.
   * Does NOT set Content-Type header (browser auto-sets with boundary).
   */
  upload: async <T>(
    path: string,
    formData: FormData,
    options: RequestOptions = {},
  ): Promise<T> => {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), config.API_TIMEOUT);

    try {
      const url = `${config.API_BASE_URL}${path}`;
      const headers: Record<string, string> = {
        Accept: "application/json",
        // NOT setting Content-Type — browser auto-sets multipart boundary
        ...options.headers,
      };

      if (!options.skipAuth) {
        const token = getAccessToken();
        if (token) {
          headers["Authorization"] = `Bearer ${token}`;
        }
      }

      let response = await fetch(url, {
        method: "POST",
        headers,
        body: formData,
        signal: options.signal || controller.signal,
      });

      // Auto-retry on 401 with token refresh
      if (response.status === 401 && !options.skipAuth) {
        const newTokens = await refreshAccessToken();
        if (newTokens) {
          headers["Authorization"] = `Bearer ${newTokens.access}`;
          response = await fetch(url, {
            method: "POST",
            headers,
            body: formData,
            signal: controller.signal,
          });
        }
      }

      if (!response.ok) {
        let errorBody: Record<string, unknown> | undefined;
        try {
          errorBody = await response.json();
        } catch {}
        throw new ApiError(response.status, response.statusText, errorBody);
      }

      if (response.status === 204) return undefined as T;
      return (await response.json()) as T;
    } catch (e) {
      throw traduireAbandon(e, controller, options);
    } finally {
      clearTimeout(timeout);
    }
  },
};
