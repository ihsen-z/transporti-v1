// Contrats du suivi de mission côté CLIENT.
// Source : backend/logistics/serializers.py::TransportJobDetailSerializer,
// servi par GET /api/v1/jobs/<id>/.
//
// Cet écran n'existait pas : jusqu'au correctif backend du 07/08, un client de
// trajet retour recevait 403 sur ce endpoint dès que sa demande était acceptée
// (le propriétaire du job étant le transporteur). Il perdait donc l'accès à sa
// propre mission au moment précis où elle commençait.

export type JobStatus =
  | 'DRAFT'
  | 'PUBLISHED'
  | 'MATCHED'
  | 'IN_PROGRESS'
  | 'COMPLETED'
  | 'CANCELLED';

export type PaymentMethod = 'DIGITAL' | 'COD';

// Événements de la chronologie (backend/logistics/models.py::JobEvent).
export interface JobEventDto {
  event: string;
  created_at: string;
  pod_photo_url: string;
}

export interface AcceptedTransporterDto {
  id: number;
  name: string;
  // Le téléphone n'est servi qu'à partir de IN_PROGRESS (décision backend).
  phone: string | null;
  total_price: number;
}

export interface JobDetailDto {
  id: number;
  status: JobStatus;
  pickup_address: string;
  pickup_governorate: string;
  dropoff_address: string;
  dropoff_governorate: string;
  scheduled_time: string | null;
  description: string;
  is_return_trip: boolean;
  distance_km: string | null;
  accepted_transporter: AcceptedTransporterDto | null;
  booking_payment_method: PaymentMethod | null;
  // Révélé au seul client payeur. C'est le code que le transporteur doit
  // saisir pour clore la mission : sans lui, elle ne peut jamais se terminer.
  delivery_pin: string | null;
  // true dès que l'escrow est RELEASED — sert à masquer le bouton de
  // confirmation une fois les fonds libérés.
  client_confirmed: boolean;
  has_reviewed: boolean;
  events: JobEventDto[];
}
