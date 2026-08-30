/**
 * Profils publics, avis reçus, et édition de son propre profil — lot 4.2.
 *
 * Les deux écrans de profil (client et transporteur) faisaient les mêmes
 * appels, chacun à sa façon : l'un attrapait l'échec des avis, l'autre le
 * laissait faire tomber TOUTE la page. Un profil sans avis n'est pas un profil
 * introuvable ; la règle est posée ici, une fois.
 */
import { apiClient } from "@/lib/api/client";

/**
 * Un avis reçu.
 *
 * Deux definitions coexistaient : celle de `ReviewCard` (huit champs) et une
 * copie a six champs dans l'ecran de profil client, qui OMETTAIT `aspects` et
 * `is_revealed`. La copie courte etait un mensonge de typage — le composant
 * qui affiche les avis lit bien ces deux champs. C'est la forme complete,
 * celle de l'API, qui fait foi ici.
 */
export interface Avis {
  id: number;
  rating: number | null;
  comment: string;
  aspects: Record<string, number>;
  reviewer_name: string;
  reviewer_avatar: string | null;
  is_revealed: boolean;
  created_at: string;
}

/**
 * Les avis reçus par un utilisateur.
 *
 * Rend une liste VIDE quand l'appel échoue, et c'est délibéré : les avis
 * accompagnent un profil, ils ne le conditionnent pas. La page transporteur
 * laissait auparavant cet échec faire tomber l'écran entier — un profil
 * parfaitement valide s'affichait alors « introuvable ».
 */
export async function getUserReviews(userId: number | string): Promise<Avis[]> {
  try {
    const reponse = await apiClient.get<Avis[] | { results?: Avis[] }>(
      `/api/reviews/user/${userId}/`,
    );
    return Array.isArray(reponse) ? reponse : (reponse.results ?? []);
  } catch {
    return [];
  }
}

export function getTransporterProfile<T>(userId: number | string): Promise<T> {
  return apiClient.get<T>(`/api/transporter/profile/${userId}/`);
}

export function getClientProfile<T>(userId: number | string): Promise<T> {
  return apiClient.get<T>(`/api/client/profile/${userId}/`);
}

export async function updateTransporterProfile<T>(
  champs: Record<string, unknown>,
): Promise<T> {
  const reponse = await apiClient.patch<{ message: string; profile: T }>(
    "/api/transporter/profile/me/",
    champs,
  );
  return reponse.profile;
}

export async function updateClientProfile<T>(
  champs: Record<string, unknown>,
): Promise<T> {
  const reponse = await apiClient.patch<{ message: string; profile: T }>(
    "/api/client/profile/me/",
    champs,
  );
  return reponse.profile;
}

/**
 * Photo de profil. Rend l'URL enregistrée par le serveur.
 *
 * Prend un `Blob` et non un `File` : les deux écrans envoient le résultat d'un
 * recadrage, qui n'a pas de nom de fichier propre. Le nom est donc fourni à
 * part, comme le fait déjà l'appelant.
 */
export async function uploadAvatar(
  image: Blob,
  nomDeFichier = "avatar.jpg",
): Promise<string> {
  const corps = new FormData();
  corps.append("avatar", image, nomDeFichier);
  const reponse = await apiClient.upload<{ avatar_url: string }>(
    "/api/auth/avatar/",
    corps,
  );
  return reponse.avatar_url;
}

/** Photo de véhicule. Rend l'URL enregistrée par le serveur. */
export async function uploadVehiclePhoto(
  image: Blob,
  nomDeFichier = "vehicle.jpg",
): Promise<string> {
  const corps = new FormData();
  corps.append("photo", image, nomDeFichier);
  const reponse = await apiClient.upload<{ url: string }>(
    "/api/upload/photo/",
    corps,
  );
  return reponse.url;
}
