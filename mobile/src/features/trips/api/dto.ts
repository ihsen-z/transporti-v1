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
  instant_booking: boolean;
}

// Réponse 201 (sous-ensemble utilisé côté mobile).
export interface ReturnTripCreateResponse {
  message: string;
  job: { id: number; status: string };
  matching_requests_count: number;
}
