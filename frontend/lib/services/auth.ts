/**
 * Réinitialisation de mot de passe — lot 4.2.
 *
 * Deux écrans, un appel chacun, tous deux hors de `lib/`.
 */
import { apiClient } from "@/lib/api/client";

/**
 * Demande un lien de réinitialisation.
 *
 * L'appelant affiche un SUCCÈS quoi qu'il arrive — c'est délibéré : révéler
 * qu'une adresse est inconnue permettrait d'énumérer les comptes. La règle
 * reste dans l'écran, qui la commente ; ce service se contente d'appeler.
 */
export function requestPasswordReset(email: string): Promise<unknown> {
  return apiClient.post("/api/auth/password-reset/", { email });
}

export function confirmPasswordReset(
  uid: string,
  token: string,
  nouveauMotDePasse: string,
): Promise<unknown> {
  return apiClient.post("/api/auth/password-reset/confirm/", {
    uid,
    token,
    new_password: nouveauMotDePasse,
  });
}

/** Rôle d'un utilisateur, pour choisir quel écran de profil afficher. */
export async function getUserRole(userId: number | string): Promise<string> {
  const reponse = await apiClient.get<{ id: number; role: string }>(
    `/api/user/${userId}/role/`,
  );
  return reponse.role?.toUpperCase() || "CLIENT";
}
