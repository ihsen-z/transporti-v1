// Contrats des demandes structurées reçues par le transporteur.
// Source : backend/logistics/views/{jobs,trip_requests}.py + serializers
// (TransporterMissionSerializer, ReturnTripRequestSerializer).

// Enveloppe de pagination DRF (PageNumberPagination global, page 20).
export interface Paginated<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

// Réponse custom (APIView, pas de pagination DRF) de jobs/<id>/requests/.
export interface CountResults<T> {
  count: number;
  results: T[];
}

export type PaymentMethod = 'DIGITAL' | 'COD';

// Un trajet du transporteur (sous-ensemble de TransporterMissionSerializer).
export interface TransporterTripDto {
  id: number;
  job_type: string;
  status: string;
  pickup_governorate: string;
  dropoff_governorate: string;
  pickup_address: string;
  dropoff_address: string;
  scheduled_time: string;
  is_return_trip: boolean;
}

// Statuts possibles d'une demande (ReturnTripRequest.Status).
export type TripRequestStatus =
  | 'PENDING'
  | 'COUNTERED'
  | 'ACCEPTED'
  | 'REJECTED'
  | 'CANCELLED';

// Une demande reçue (ReturnTripRequestSerializer).
export interface TripRequestDto {
  id: number;
  job: number;
  status: TripRequestStatus;
  description: string;
  proposed_price: string;
  payment_method: PaymentMethod;
  counter_price: string | null;
  response_message: string;
  client_name: string;
  created_at: string;
}

// Corps de POST trip-requests/<id>/respond/.
export type RespondAction = 'accept' | 'reject' | 'counter';

export interface RespondRequest {
  action: RespondAction;
  counter_price?: number;
  message?: string;
}
