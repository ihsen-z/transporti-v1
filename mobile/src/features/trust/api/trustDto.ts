export interface TrustProfileDto {
  id: number;
  user: number;
  verification_status: 'UNVERIFIED' | 'PENDING' | 'PARTIALLY_REVIEWED' | 'VERIFIED' | 'REJECTED' | 'SUSPENDED';
  trust_score: number;
  rejection_reason: string | null;
  vehicle_type: string;
  vehicle_capacity_kg: string | null;
  vehicle_plate: string;
  insurance_valid_until: string | null;
}
