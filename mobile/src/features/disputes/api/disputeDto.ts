export interface DisputeDto {
  id: number;
  job: number;
  reason: string;
  description: string;
  status: string;
  resolution_notes: string | null;
  opened_by_name: string;
  job_summary: {
    id: number;
    type: string;
    status: string;
    pickup?: string;
    dropoff?: string;
  } | null;
  created_at: string;
  updated_at: string;
  resolved_at: string | null;
}

export interface DisputeCreateDto {
  job_id: number;
  reason: string;
  description: string;
}
