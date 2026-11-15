import type { DocumentDto } from '../api/dto';

// État affichable d'une pièce justificative.
//
// Le serveur n'a pas de champ « statut » : une pièce validée a `is_valid=true`,
// une pièce refusée a `is_valid=false` ET un `rejection_reason`, une pièce
// pas encore examinée a `is_valid=false` sans motif. Lire `is_valid` seul
// affichait « En attente » sur une pièce refusée, et le transporteur
// attendait une réponse qui n'arriverait jamais.
export type DocumentState = 'valid' | 'rejected' | 'pending';

export function documentState(
  doc: Pick<DocumentDto, 'is_valid' | 'rejection_reason'>,
): DocumentState {
  if (doc.is_valid) return 'valid';
  if (doc.rejection_reason && doc.rejection_reason.trim() !== '') return 'rejected';
  return 'pending';
}
