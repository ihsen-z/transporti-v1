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
  // B-1 (lot 1) — volume optionnel. Le poids reste la contrainte
  // réglementaire et fait foi ; le volume est ce que l'utilisateur se
  // représente. L'un n'est jamais déduit de l'autre : la densité d'un
  // chargement n'est pas connue de la plateforme.
  vehicle_capacity_m3: string | null;
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

/* ------------------------------------------------------------------ */
/*  T5.3 — la decomposition du score de confiance                      */
/* ------------------------------------------------------------------ */

// Source : backend/analytics/services.py::trust_score_components, expose par
// GET trust/score-breakdown/. STRICTEMENT personnel : aucun identifiant en
// parametre — le total est deja public sur les profils, le detail ne l'est pas.

export type CleComposante =
  | 'completion'
  | 'disputes'
  | 'payment'
  | 'engagement'
  | 'recency';

export interface ComposanteScoreDto {
  key: CleComposante;
  earned: number;
  max: number;
  /**
   * `false` pour les composantes qui mesurent l'USAGE DE L'APPLICATION et non
   * la qualite du service rendu. L'interface s'en sert pour ne pas presenter
   * « connecte-toi plus souvent » comme un levier de fiabilite.
   */
  is_service_quality: boolean;
}

export interface ScoreConfianceDto {
  trust_score: number;
  components: ComposanteScoreDto[];
}
