import { useMutation, useQueryClient } from '@tanstack/react-query';
import { isAxiosError } from 'axios';
import { apiClient } from '@/core/api/client';
import { extractServerMessage } from '@/core/api/serverMessage';
import type { CreateReviewBody } from './dto';

export type CreateReviewErrorKind =
  | 'already_reviewed'
  | 'not_completed'
  | 'not_participant'
  | 'network'
  | 'unknown';

export class CreateReviewError extends Error {
  // `serverMessage` porte le texte du backend pour les refus que la
  // classification ci-dessous ne sait pas nommer. Les trois cas connus
  // (déjà noté, mission non terminée, non-participant) gardent leur
  // message localisé : ils sont plus clairs que le texte serveur.
  constructor(
    public readonly kind: CreateReviewErrorKind,
    public readonly serverMessage?: string,
  ) {
    super(kind);
    this.name = 'CreateReviewError';
  }
}

// Normalise une valeur d'erreur DRF (string | string[]) en texte.
function asText(v: unknown): string {
  if (Array.isArray(v)) return v.join(' ');
  return typeof v === 'string' ? v : '';
}

// POST reviews/ — la réponse 201 ne renvoie pas d'id (write_only job_id) :
// on s'appuie sur l'invalidation, pas sur le retour.
async function postReview(body: CreateReviewBody): Promise<void> {
  try {
    await apiClient.post('reviews/', body);
  } catch (err) {
    if (isAxiosError(err)) {
      if (err.response?.status === 400) {
        const data = err.response.data as
          | { job_id?: unknown; non_field_errors?: unknown }
          | undefined;
        const jobMsg = asText(data?.job_id);
        const nonField = asText(data?.non_field_errors);
        if (jobMsg.includes('COMPLETED')) throw new CreateReviewError('not_completed');
        if (nonField.toLowerCase().includes('already')) {
          throw new CreateReviewError('already_reviewed');
        }
        if (nonField.toLowerCase().includes('participant')) {
          throw new CreateReviewError('not_participant');
        }
        throw new CreateReviewError('unknown', extractServerMessage(err.response.data) ?? undefined);
      }
      if (!err.response) throw new CreateReviewError('network');
    }
    throw new CreateReviewError('unknown');
  }
}

export function useCreateReview() {
  const qc = useQueryClient();
  return useMutation<void, CreateReviewError, CreateReviewBody>({
    mutationFn: postReview,
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['myReviews'] });
    },
  });
}
