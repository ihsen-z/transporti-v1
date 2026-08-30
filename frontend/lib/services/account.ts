/**
 * Compte de l'utilisateur : profil, mot de passe, préférences — lot 4.2.
 *
 * L'écran `/compte` portait cinq appels en ligne, et deux imports morts
 * (`getAccessToken`, `config`) hérités d'un `fetch` manuel disparu depuis.
 */
import { apiClient } from "@/lib/api/client";

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

export function changePassword(
  motDePasseActuel: string,
  nouveauMotDePasse: string,
): Promise<unknown> {
  return apiClient.post("/api/auth/change-password/", {
    current_password: motDePasseActuel,
    new_password: nouveauMotDePasse,
  });
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
