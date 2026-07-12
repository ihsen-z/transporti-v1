/* -------------------------------------------------------------------------- */
/*  TypeScript interfaces mirroring Django serializers                         */
/*  Source: backend/logistics/serializers.py                                   */
/* -------------------------------------------------------------------------- */

/** Mirrors TransportJobListSerializer fields */
export interface JobListItem {
  id: number;
  title: string;
  pickup_city: string;
  dropoff_city: string;
  status: JobStatus;
  budget: string | null;
  created_at: string;
  owner: {
    id: number;
    first_name: string;
    last_name: string;
    name?: string;
    rating?: number;
    review_count?: number;
  };
}

/** Mirrors TransportJobDetailSerializer fields */
export interface JobDetail extends JobListItem {
  description: string;
  pickup_address: string;
  dropoff_address: string;
  pickup_lat: number | null;
  pickup_lng: number | null;
  dropoff_lat: number | null;
  dropoff_lng: number | null;
  pickup_governorate?: string;
  dropoff_governorate?: string;
  goods_type: string;
  goods_weight: string | null;
  goods_dimensions: string | null;
  preferred_date: string | null;
  preferred_time: string | null;
  is_fragile: boolean;
  is_urgent: boolean;
  requires_insurance: boolean;
  job_type?: string;
  photos: string[];
  accepted_offer: OfferItem | null;
  accepted_transporter: {
    id: number;
    first_name: string;
    last_name: string;
    name?: string;
    phone?: string;
    rating?: number;
    review_count?: number;
    total_price?: string;
  } | null;
  offers_count: number;
  client_confirmed?: boolean;
  has_reviewed?: boolean;
  updated_at: string;
  is_return_trip?: boolean;
  completed_at?: string | null;
  view_count?: number;
  price_tnd_min?: number | string;
  price_tnd_max?: number | string;
  available_capacity?: string;
  scheduled_time?: string;
  pickup_hint?: string;
  dropoff_hint?: string;
  specifications?: JobSpecifications;
  /** Allow additional backend fields without breaking type safety */
  [key: string]: unknown;
}

/** Backend TransportJob.Status choices */
export type JobStatus =
  | "DRAFT"
  | "PUBLISHED"
  | "MATCHED"
  | "IN_PROGRESS"
  | "COMPLETED"
  | "CANCELLED"
  | "DISPUTED";

/** Mirrors OfferListSerializer fields */
export interface OfferItem {
  id: number;
  job: number;
  transporter: {
    id: number;
    first_name: string;
    last_name: string;
    avatar_url?: string;
  };
  price: string;
  estimated_duration: string | null;
  message: string;
  status: OfferStatus;
  created_at: string;
}

/** Free-form specifications captured by the new-job wizard */
export interface JobSpecifications {
  weight?: string;
  volume?: string;
  room_count?: string;
  floor_departure?: number;
  floor_arrival?: number;
  elevator_departure?: string;
  elevator_arrival?: string;
  needs_disassembly?: boolean;
  needs_packing?: boolean;
  has_fragile?: boolean;
  packing_materials_provided?: boolean;
  helpers_count?: number;
  fragile_description?: string;
  [key: string]: unknown;
}

/** State of the multi-step job creation form (jobs/new) */
export interface JobFormData {
  job_type: "TRANSPORT" | "MOVING" | null;
  pickup_address: string;
  pickup_governorate: string;
  pickup_lat: number | null;
  pickup_lng: number | null;
  pickup_hint: string;
  pickup_postal_code?: string;
  dropoff_address: string;
  dropoff_governorate: string;
  dropoff_lat: number | null;
  dropoff_lng: number | null;
  dropoff_hint: string;
  dropoff_postal_code?: string;
  description: string;
  photos: string[];
  specifications: JobSpecifications;
  scheduled_time: string;
  price_tnd_min: string;
  price_tnd_max: string;
  available_capacity: string;
}

/** Backend Offer.Status choices */
export type OfferStatus =
  | "PENDING"
  | "ACCEPTED"
  | "REJECTED"
  | "WITHDRAWN"
  | "EXPIRED";

/** Flat offer shape from OfferListSerializer (GET /api/jobs/{id}/offers/) */
export interface JobOffer {
  id: number;
  status?: OfferStatus;
  total_price?: number | string;
  message?: string;
  created_at: string;
  transporter_id?: number;
  transporter_name?: string;
  transporter_avatar?: string;
  transporter_verified?: boolean;
  transporter_rating?: number;
  transporter_jobs_count?: number;
  transporter_completion_rate?: number | null;
  transporter_moving_specialist?: boolean;
  transporter_trust_score?: number | null;
  has_worked_together?: boolean;
  past_jobs_count?: number;
}
