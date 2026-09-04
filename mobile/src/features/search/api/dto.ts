// Contrats du funnel client (recherche « retour d'abord » + demande + alerte).
// Source : backend/logistics/views/corridors.py (ReturnTripMatchView,
// CorridorAlertListCreateView) + views/trip_requests.py (JobTripRequestsView.post)
// + serializers (TransportJobListSerializer, ReturnTripRequestCreateSerializer).

export type PaymentMethod = 'DIGITAL' | 'COD';

// Paramètres de GET return-trips/match/ (pickup + dropoff requis).
export interface MatchParams {
  pickup_governorate: string;
  dropoff_governorate: string;
  date?: string; // YYYY-MM-DD (fenêtre ±48h côté serveur)
}

// Trajet retour trouvé (sous-ensemble de TransportJobListSerializer ;
// les Decimal sont sérialisés en chaînes par DRF).
export interface TripResultDto {
  id: number;
  job_type: string;
  pickup_governorate: string;
  dropoff_governorate: string;
  pickup_address: string;
  dropoff_address: string;
  scheduled_time: string;
  owner_name: string;
  // Signaux de confiance (0.8) : le serveur les servait déjà côté liste,
  // mais sans owner_id le mobile n'avait aucun moyen d'ouvrir le profil
  // public derrière un prénom.
  owner_id: number;
  owner_rating: number | null;
  owner_review_count: number;
  owner_verification_status: string | null;
  // NULLABLES cote serveur, et le type le disait non. Le champ est
  // `null=True` sur `TransportJob`, et la recette du 03/09 a trouve un trajet
  // publie sans fourchette : la carte affichait alors « – TND », un tiret nu
  // suivi d'une devise. Le type mentait, donc TypeScript n'exigeait aucun
  // garde — c'est le type qu'il fallait corriger, pas seulement l'affichage.
  price_tnd_min: string | null;
  price_tnd_max: string | null;
  // C1.2 — economie face a un transport dedie, calculee SERVEUR pour que le
  // chiffre soit identique sur les deux plateformes. `null` quand le calcul
  // est impossible ou l'economie negative : jamais zero, qui se lirait
  // « aucune economie » au lieu de « economie inconnue ».
  estimated_savings: number | null;
  /** Prix du dedie servant de reference. Le montant n'est jamais affiche nu. */
  savings_basis: number | null;
  instant_booking: boolean;
  available_capacity: string;
  distance_km: string | null;
  // Polyligne encodée (précision 5) de l'itinéraire routier, calculée par le
  // serveur. Chaîne vide quand le routage a échoué à la création.
  route_polyline: string;
}

export interface MatchResponse {
  count: number;
  results: TripResultDto[];
}

// Corps de POST jobs/<id>/requests/ (ReturnTripRequestCreateSerializer).
// COD limité à 300 TND côté serveur.
export interface SendRequestBody {
  proposed_price: number;
  payment_method: PaymentMethod;
  description: string;
}

// Corps de POST corridor-alerts/ (D14, Cas B).
export interface CorridorAlertBody {
  pickup_governorate: string;
  dropoff_governorate: string;
}

// Alerte active (GET corridor-alerts/, CorridorAlertListCreateView).
export interface CorridorAlertDto {
  id: number;
  pickup_governorate: string;
  dropoff_governorate: string;
  created_at: string;
}

export interface CorridorAlertsResponse {
  count: number;
  results: CorridorAlertDto[];
}
