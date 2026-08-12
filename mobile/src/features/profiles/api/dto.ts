// Profil public transporteur (Trust Signals), consulté par le client AVANT
// d'envoyer une demande. Source : backend/logistics/views/profiles.py
// (TransporterProfileView) + TransporterProfileSerializer.

export interface TransporterProfileDto {
  first_name: string;
  last_name: string;
  // Masqués par le serveur pour un non-propriétaire (SEC-T2) : jamais la
  // valeur complète tant que ce n'est pas le propre profil du transporteur.
  email: string;
  phone: string;
  avatar_url: string;
  bio: string;
  joined_at: string;
  is_verified: boolean;
  trust_score: number;
  vehicle_type: string | null;
  vehicle_capacity_kg: string | null;
  service_areas: string[];
  specializations: string[];
  completion_rate: number | null;
  total_jobs_completed: number;
  avg_response_time_min: number | null;
  // rating vaut 0.0 (et non null) tant qu'aucun avis n'existe — se lit avec
  // review_count, pas seul.
  rating: number;
  review_count: number;
  return_trips_completed: number;
  active_return_trips: number;
}
