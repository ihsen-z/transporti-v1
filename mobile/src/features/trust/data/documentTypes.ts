// Types de documents de vérification (backend trust.models.DocumentType, actifs).
// `expiring` = expires_at requis (permis / assurance / carte grise).
export type DocumentType =
  | 'CIN_FRONT'
  | 'CIN_BACK'
  | 'LICENSE_FRONT'
  | 'LICENSE_BACK'
  | 'CARTE_GRISE_FRONT'
  | 'CARTE_GRISE_BACK'
  | 'INSURANCE_FRONT'
  | 'INSURANCE_BACK'
  | 'SELFIE';

export interface DocTypeInfo {
  code: DocumentType;
  expiring: boolean;
}

export const DOCUMENT_TYPES: readonly DocTypeInfo[] = [
  { code: 'CIN_FRONT', expiring: false },
  { code: 'CIN_BACK', expiring: false },
  { code: 'LICENSE_FRONT', expiring: true },
  { code: 'LICENSE_BACK', expiring: true },
  { code: 'CARTE_GRISE_FRONT', expiring: true },
  { code: 'CARTE_GRISE_BACK', expiring: true },
  { code: 'INSURANCE_FRONT', expiring: true },
  { code: 'INSURANCE_BACK', expiring: true },
  { code: 'SELFIE', expiring: false },
];

export function isExpiringType(code: DocumentType): boolean {
  return DOCUMENT_TYPES.find((d) => d.code === code)?.expiring ?? false;
}
