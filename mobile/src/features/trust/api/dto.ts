// Contrats trust (vérification transporteur).
// Source : backend/trust/{views,serializers,models}.py. RBAC TRANSPORTER.
import type { DocumentType } from '../data/documentTypes';

export type VerificationStatus =
  | 'UNVERIFIED'
  | 'PENDING'
  | 'PARTIALLY_REVIEWED'
  | 'VERIFIED'
  | 'REJECTED'
  | 'SUSPENDED';

// GET trust/status/ (TrustProfileSubmissionSerializer). Les Decimal DRF
// sont sérialisés en chaînes.
export interface TrustStatusDto {
  verification_status: VerificationStatus;
  vehicle_type: string;
  vehicle_capacity_kg: string | null;
  vehicle_plate: string;
  vehicle_photos: unknown[];
  service_areas: unknown[];
  specializations: unknown[];
}

// PUT/PATCH trust/submit/ — infos véhicule (JSON). Champs optionnels (texte libre).
export interface VehicleSubmitBody {
  vehicle_type?: string;
  vehicle_capacity_kg?: string;
  vehicle_plate?: string;
}

// GET trust/documents/ (VerificationDocumentReadSerializer). Réponse = tableau.
export interface DocumentDto {
  id: number;
  document_type: DocumentType;
  file_url: string | null;
  is_valid: boolean;
  uploaded_at: string;
  rejection_reason: string;
  reviewed_at: string | null;
  expires_at: string | null;
  is_expired: boolean;
  expires_soon: boolean;
}

// Args d'upload (POST trust/documents/ en multipart).
export interface UploadDocumentArgs {
  document_type: DocumentType;
  uri: string;
  fileName: string;
  mimeType: string;
  expires_at?: string;
}
