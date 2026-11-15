import { ApiError } from "@/lib/api/client";

/**
 * Nature d'un échec de connexion, indépendante de la langue : l'écran choisit
 * ensuite le texte traduit (le serveur répond en anglais).
 *
 * - `invalid_credentials` : 400 `{"email": ["Invalid email or password."]}`
 * - `account_locked`      : 429 `{"error": "...", "code": "account_locked"}`
 * - `rate_limited`        : 429 sans ce code (limitation de débit générale)
 * - `other`               : tout le reste (réseau, 5xx...)
 */
export type LoginErrorKind =
  | "invalid_credentials"
  | "account_locked"
  | "rate_limited"
  | "other";

/** Fonction pure : classe l'erreur levée par l'appel de connexion. */
export function classifyLoginError(err: unknown): LoginErrorKind {
  if (!(err instanceof ApiError)) return "other";
  if (err.status === 429) {
    return err.body?.code === "account_locked"
      ? "account_locked"
      : "rate_limited";
  }
  if (err.status === 400) return "invalid_credentials";
  return "other";
}
