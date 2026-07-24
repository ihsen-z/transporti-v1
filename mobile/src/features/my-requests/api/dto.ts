// Contrats côté CLIENT : suivi des demandes envoyées + acceptation de
// contre-proposition. Source : backend/logistics/views/trip_requests.py
// (MyTripRequestsView, TripRequestAcceptCounterView) + ReturnTripRequestSerializer
// + TransportJobDetailSerializer (delivery_pin).

export type PaymentMethod = 'DIGITAL' | 'COD';

export type MyRequestStatus =
  | 'PENDING'
  | 'COUNTERED'
  | 'ACCEPTED'
  | 'REJECTED'
  | 'CANCELLED';

export interface Paginated<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

// Demande envoyée (ReturnTripRequestSerializer) — porte déjà la route/date
// du job (job_pickup/job_dropoff/job_date), pas besoin du détail pour l'affichage.
export interface MyRequestDto {
  id: number;
  job: number;
  status: MyRequestStatus;
  proposed_price: string;
  payment_method: PaymentMethod;
  counter_price: string | null;
  response_message: string;
  job_pickup: string;
  job_dropoff: string;
  job_date: string;
  created_at: string;
}

// Réponse de accept-counter : le job (TransportJobDetailSerializer) révèle le
// PIN de livraison AU CLIENT PAYEUR (seul point d'accès mobile — cf. limite
// backend : jobs/<id>/ et jobs/<id>/booking/ renvoient 403 au client sur un
// trajet retour, car il n'est ni propriétaire ni transporteur assigné).
export interface AcceptCounterResponse {
  status: string;
  message: string;
  job: {
    id: number;
    status: string;
    delivery_pin: string | null;
  };
}
