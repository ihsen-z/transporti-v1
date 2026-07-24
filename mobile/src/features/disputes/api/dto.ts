// Contrats litiges. Source : backend/support/{views,serializers,models}.py.
// Les issues d'escrow (REFUND_CLIENT/RELEASE_TRANSPORTER/SPLIT) sont des
// résolutions ADMIN — côté mobile on ouvre et on suit un litige seulement.

export type DisputeReason =
  | 'DAMAGED_ITEMS'
  | 'NO_SHOW'
  | 'PAYMENT_ISSUE'
  | 'LATE_DELIVERY'
  | 'HARASSMENT'
  | 'FRAUD'
  | 'OTHER';

export type DisputeStatus = 'OPEN' | 'INVESTIGATING' | 'RESOLVED' | 'REJECTED';

export interface Paginated<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

// DisputeListSerializer.
export interface MyDisputeDto {
  id: number;
  job: number;
  reason: DisputeReason;
  status: DisputeStatus;
  description: string;
  opened_by_name: string;
  job_summary: {
    id: number;
    type: string;
    status: string;
    pickup: string;
    dropoff: string;
  };
  created_at: string;
  resolved_at: string | null;
}

// Corps de POST disputes/ (description >= 20 caractères côté serveur).
export interface CreateDisputeBody {
  job_id: number;
  reason: DisputeReason;
  description: string;
}
