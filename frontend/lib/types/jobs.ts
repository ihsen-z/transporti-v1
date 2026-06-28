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

/** Backend Offer.Status choices */
export type OfferStatus =
  | "PENDING"
  | "ACCEPTED"
  | "REJECTED"
  | "WITHDRAWN"
  | "EXPIRED";
