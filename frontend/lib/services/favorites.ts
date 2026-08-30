/**
 * Transporteurs favoris — lot 5, C5.3.
 *
 * `favorites/` et `favorites/toggle/` existaient côté backend depuis P2-09 et
 * n'étaient consommés NULLE PART — ni web, ni mobile. Ce module est leur
 * première interface.
 *
 * Réservé aux CLIENTS : les deux vues portent
 * `RequireRole.for_roles('CLIENT')` et répondent 403 à un transporteur.
 */
import { apiClient } from "@/lib/api/client";

export interface TransporteurFavori {
  id: number;
  transporter_id: number;
  transporter_name: string;
  favorited_at: string;
  /** Champs de confiance, ABSENTS quand le transporteur n'a pas de profil. */
  is_verified?: boolean;
  total_jobs_completed?: number;
  trust_score?: number;
}

export async function getFavorites(): Promise<TransporteurFavori[]> {
  const reponse = await apiClient.get<
    TransporteurFavori[] | { results?: TransporteurFavori[] }
  >("/api/favorites/");
  return Array.isArray(reponse) ? reponse : (reponse.results ?? []);
}

/**
 * Bascule le favori et rend l'état APRÈS bascule.
 *
 * C'est le serveur qui décide : l'endpoint crée ou supprime selon ce qu'il
 * trouve, et renvoie `is_favorite`. L'appelant ne doit pas inverser sa propre
 * variable locale — deux clics rapides désynchroniseraient l'affichage de la
 * base.
 */
export async function toggleFavorite(
  transporterId: number,
): Promise<{ status: string; is_favorite: boolean }> {
  return apiClient.post<{ status: string; is_favorite: boolean }>(
    "/api/favorites/toggle/",
    { transporter_id: transporterId },
  );
}
