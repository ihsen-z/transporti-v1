// Contrats des demandes structurées reçues par le transporteur.
// Source : backend/logistics/views/{jobs,trip_requests}.py + serializers
// (TransporterMissionSerializer, ReturnTripRequestSerializer).

// La nature de marchandise est la même énumération serveur des deux côtés du
// marché (`TransportJob.JobType`) : une seule définition, côté demande.
import type { GoodsType } from '@/features/search/api/dto';

export type { GoodsType };

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
  // Lot 6.1 — ce sur quoi le transporteur décide. Avant, il n'avait que
  // `description` en texte libre et devait accepter ou refuser à l'aveugle.
  // Tous facultatifs : les demandes créées avant le lot n'en portent aucun,
  // d'où la chaîne vide et les `null` plutôt qu'un champ absent.
  goods_type: GoodsType | '';
  weight_kg: string | null;
  volume_m3: string | null;
  pickup_address: string;
  pickup_governorate: string;
  pickup_from: string | null;
  pickup_until: string | null;
  photos: string[];
  // T2.1 — contexte du trajet, indispensable dans une liste consolidee : sans
  // lui, on ne sait pas de quel trajet vient chaque demande.
  job_pickup: string;
  job_dropoff: string;
  job_date: string;
  created_at: string;
}

// Corps de POST trip-requests/<id>/respond/.
export type RespondAction = 'accept' | 'reject' | 'counter';

export interface RespondRequest {
  action: RespondAction;
  counter_price?: number;
  message?: string;
}
