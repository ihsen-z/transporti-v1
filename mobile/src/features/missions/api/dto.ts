// Contrats des missions actives du transporteur.
// Source : backend/logistics/views/jobs.py (JobConfirmStartView, JobCompleteView,
// TransporterJobListView) + TransporterMissionSerializer.

// Statuts pertinents pour l'exécution d'une mission.
export type MissionStatus =
  | 'MATCHED'
  | 'IN_PROGRESS'
  | 'COMPLETED'
  | 'PUBLISHED'
  | 'CANCELLED';

// Mission (sous-ensemble de TransporterMissionSerializer).
export interface MissionDto {
  id: number;
  job_type: string;
  status: MissionStatus;
  pickup_governorate: string;
  dropoff_governorate: string;
  pickup_address: string;
  dropoff_address: string;
  scheduled_time: string;
  is_return_trip: boolean;
}

// Corps de POST jobs/<id>/complete/ (D7). Le PIN à 4 chiffres est fourni par
// le client à la réception. pod_photo_url = URL (upload photo différé).
export interface CompleteRequest {
  pin: string;
  pod_photo_url?: string;
}
