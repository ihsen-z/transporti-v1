// Contrats trips (source: backend/logistics/views/{misc,return_trips}.py +
// serializers.ReturnTripCreateSerializer + pricing.estimate_price).

export type JobType = 'TRANSPORT' | 'MOVING';

// POST /api/v1/jobs/estimate-price/ (public) — fourchette indicative serveur.
export interface EstimatePriceRequest {
  pickup_lat: number;
  pickup_lng: number;
  dropoff_lat: number;
  dropoff_lng: number;
  job_type: JobType;
}

export interface EstimatePriceResponse {
  min: number;
  max: number;
  distance_km: number;
  grid_source: string;
  base_calculated: number;
  error?: string;
}

// POST /api/v1/jobs/return-trip/ (TRANSPORTER) — champs de ReturnTripCreateSerializer.
// Le serveur pose owner/status=PUBLISHED/is_return_trip/distance_km.
export interface ReturnTripCreateRequest {
  job_type: JobType;
  pickup_address: string;
  pickup_governorate: string;
  pickup_lat: number;
  pickup_lng: number;
  dropoff_address: string;
  dropoff_governorate: string;
  dropoff_lat: number;
  dropoff_lng: number;
  scheduled_time: string; // ISO 8601
  description: string;
  price_tnd_min: number;
  price_tnd_max: number;
  available_capacity: string;
  // B-2 (lot 1) — capacité structurée, en plus du libellé texte ci-dessus qui
  // reste la description lisible. Omise quand elle n'est pas réellement
  // connue : un 0 rendrait le trajet invisible au matching quantitatif.
  available_capacity_kg?: number;
  available_capacity_m3?: number;
  instant_booking: boolean;
}

// Réponse 201 (sous-ensemble utilisé côté mobile).
export interface ReturnTripCreateResponse {
  message: string;
  job: { id: number; status: string };
  matching_requests_count: number;
}

// GET /api/v1/jobs/transporter/?type=owned (TRANSPORTER) — l'inventaire des
// trajets retour publiés, tel que renvoyé par TransporterMissionSerializer.
// Les Decimal DRF sont sérialisés en chaînes, et null quand non renseignés.
export interface ReturnTripDto {
  id: number;
  job_type: JobType;
  status:
    | 'PUBLISHED'
    | 'MATCHED'
    | 'IN_PROGRESS'
    | 'COMPLETED'
    | 'CANCELLED'
    | 'DISPUTED';
  pickup_address: string;
  pickup_governorate: string;
  dropoff_address: string;
  dropoff_governorate: string;
  scheduled_time: string;
  description: string;
  is_return_trip: boolean;
  available_capacity: string;
  available_capacity_kg: string | null;
  available_capacity_m3: string | null;
  created_at: string;
  updated_at: string;
}
