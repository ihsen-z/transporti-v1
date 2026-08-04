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
  price_tnd_min: string;
  price_tnd_max: string;
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
