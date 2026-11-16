/**
 * Compte de l'utilisateur : profil, mot de passe, préférences — lot 4.2.
 *
 * L'écran `/compte` portait cinq appels en ligne, et deux imports morts
 * (`getAccessToken`, `config`) hérités d'un `fetch` manuel disparu depuis.
 */
import { apiClient } from "@/lib/api/client";
import { storeTokens, type TokenPair } from "@/lib/api/tokenManager";

export interface UtilisateurDuCompte {
  id: number;
  email: string;
  phone: string;
  role: string;
  first_name: string;
  last_name: string;
  is_phone_verified: boolean;
  verification_status: string | null;
  avatar_url?: string;
  address_summary?: string;
  language_pref?: string;
}

export interface PreferencesDeNotification {
  email_enabled?: boolean;
  push_enabled?: boolean;
  sms_enabled?: boolean;
  notify_new_offer?: boolean;
  notify_offer_accepted?: boolean;
  notify_new_message?: boolean;
}

export async function getProfile(): Promise<UtilisateurDuCompte> {
  const reponse = await apiClient.get<{ user: UtilisateurDuCompte }>(
    "/api/auth/profile/",
  );
  return reponse.user;
}

export async function updateProfile(
  champs: Record<string, unknown>,
): Promise<UtilisateurDuCompte> {
  const reponse = await apiClient.put<{
    message: string;
    user: UtilisateurDuCompte;
  }>("/api/auth/profile/", champs);
  return reponse.user;
}

/** Langue préférée. C'est un champ du profil, pas un réglage à part. */
export function updateLanguagePreference(langue: string): Promise<unknown> {
  return apiClient.put("/api/auth/profile/", {
    profile: { language_pref: langue },
  });
}

/**
 * Nouvelle paire de jetons d'une réponse de changement de mot de passe, ou
 * `null` si le serveur n'en renvoie pas (ancienne version : rien à stocker).
 * Fonction pure : valide la forme au lieu de supposer.
 */
export function extraireNouveauxJetons(reponse: unknown): TokenPair | null {
  if (typeof reponse !== "object" || reponse === null) return null;
  const tokens = (reponse as { tokens?: unknown }).tokens;
  if (typeof tokens !== "object" || tokens === null) return null;
  const { access, refresh } = tokens as { access?: unknown; refresh?: unknown };
  if (typeof access !== "string" || !access) return null;
  if (typeof refresh !== "string" || !refresh) return null;
  return { access, refresh };
}

/**
 * Le serveur révoque TOUTES les sessions au changement de mot de passe et
 * renvoie une nouvelle paire de jetons : on la stocke, sinon la session
 * courante serait coupée au prochain rafraîchissement.
 */
export async function changePassword(
  motDePasseActuel: string,
  nouveauMotDePasse: string,
): Promise<unknown> {
  const reponse = await apiClient.post<unknown>("/api/auth/change-password/", {
    current_password: motDePasseActuel,
    new_password: nouveauMotDePasse,
  });
  const jetons = extraireNouveauxJetons(reponse);
  if (jetons) storeTokens(jetons);
  return reponse;
}

/**
 * Préférences de notification.
 *
 * Rend `null` quand l'appel échoue, et l'écran retombe alors sur ses valeurs
 * par défaut. C'est un choix : ne pas pouvoir lire ses préférences ne doit pas
 * empêcher d'ouvrir la page de compte. Le `null` est explicite — un objet vide
 * se lirait comme « tout est désactivé ».
 */
export async function getNotificationPreferences(): Promise<PreferencesDeNotification | null> {
  try {
    const reponse = await apiClient.get<{ data?: PreferencesDeNotification }>(
      "/api/auth/notification-preferences/",
    );
    return reponse.data ?? null;
  } catch {
    return null;
  }
}

export function updateNotificationPreferences(
  preferences: PreferencesDeNotification,
): Promise<unknown> {
  return apiClient.put("/api/auth/notification-preferences/", preferences);
}
