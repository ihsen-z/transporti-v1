// Contrats des favoris. Source : backend/logistics/views/misc.py
// (FavoriteListView, FavoriteToggleView), P2-09.
//
// Les deux vues portent RequireRole('CLIENT') : un transporteur recevrait 403.
// La reponse de la liste est un TABLEAU NU, pas une page paginee — c'est une
// exception dans cette API, et la seule raison pour laquelle ce module ne
// s'appuie pas sur `Paginated<T>`.

export interface FavoriDto {
  id: number;
  transporter_id: number;
  transporter_name: string;
  favorited_at: string;
  /** ABSENTS quand le transporteur n'a pas de profil de confiance. */
  is_verified?: boolean;
  total_jobs_completed?: number;
  trust_score?: number;
}

/** Reponse de POST favorites/toggle/ : l'etat APRES bascule. */
export interface BasculeFavoriDto {
  status: string;
  is_favorite: boolean;
}
