export interface JobDto {
  id: number;
  owner: number; // Owner user ID
  owner_name?: string;
  status: 'DRAFT' | 'PUBLISHED' | 'MATCHED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED' | 'DISPUTED';
  job_type: 'TRANSPORT' | 'MOVING' | 'DELIVERY';
  pickup_address: string;
  pickup_lat: number | null;
  pickup_lng: number | null;
  dropoff_address: string;
  dropoff_lat: number | null;
  dropoff_lng: number | null;
  scheduled_time: string; // ISO DateTime string
  specifications: Record<string, any>;
  price_tnd_min: string | null;
  price_tnd_max: string | null;
  description: string;
  photos: string[];
  pickup_governorate: string;
  dropoff_governorate: string;
  pickup_hint: string;
  dropoff_hint: string;
  is_return_trip: boolean;
  available_capacity: string;
  view_count: number;
  created_at: string;
  updated_at: string;
}

export interface OfferDto {
  id: number;
  status: 'PENDING' | 'ACCEPTED' | 'REJECTED' | 'WITHDRAWN';
  total_price: string;
  price_net: string;
  commission_amount: string;
  message: string;
  valid_until: string;
  created_at: string;
  transporter: {
    id: number;
    name: string;
    phone: string | null;
  };
  trust_badge?: {
    verification_status: string;
    trust_score: number;
    completion_rate: number;
    total_jobs_completed: number;
    response_time_avg_minutes: number;
  };
  job_summary?: {
    id: number;
    type: string;
    pickup: string;
    dropoff: string;
  };
}

