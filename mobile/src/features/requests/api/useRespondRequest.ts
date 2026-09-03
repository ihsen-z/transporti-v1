import { useMutation, useQueryClient } from '@tanstack/react-query';
import { isAxiosError } from 'axios';
import { apiClient } from '@/core/api/client';
import { extractServerMessage } from '@/core/api/serverMessage';
import type { RespondRequest } from './dto';

export type RespondErrorKind = 'validation' | 'forbidden' | 'network' | 'unknown';

export class RespondError extends Error {
  // `serverMessage` porte le texte exact du backend, déjà rédigé en français
  // (prix de contre-offre hors bornes, demande déjà traitée). Le reformuler
  // ici ferait deux sources pour une même règle.
  constructor(
    public readonly kind: RespondErrorKind,
    public readonly serverMessage?: string,
  ) {
    super(kind);
    this.name = 'RespondError';
  }
}

interface RespondArgs {
  requestId: number;
  jobId: number; // pour l'invalidation ciblée
  body: RespondRequest;
}

// POST /api/v1/trip-requests/<id>/respond/ — accept | reject | counter.
async function postRespond({ requestId, body }: RespondArgs): Promise<void> {
  try {
    await apiClient.post(`trip-requests/${requestId}/respond/`, body);
  } catch (err) {
    if (isAxiosError(err)) {
      if (err.response?.status === 400) {
        throw new RespondError('validation', extractServerMessage(err.response.data) ?? undefined);
      }
      if (err.response?.status === 403) {
        throw new RespondError('forbidden', extractServerMessage(err.response.data) ?? undefined);
      }
      if (!err.response) throw new RespondError('network');
    }
    throw new RespondError('unknown');
  }
}

export function useRespondRequest() {
  const qc = useQueryClient();
  return useMutation<void, RespondError, RespondArgs>({
    mutationFn: postRespond,
    onSuccess: (_data, vars) => {
      // Rafraîchit les demandes du trajet + la liste des trajets (une
      // acceptation ferme le trajet -> il quitte la liste PUBLISHED).
      void qc.invalidateQueries({ queryKey: ['jobRequests', vars.jobId] });
      void qc.invalidateQueries({ queryKey: ['myReturnTrips'] });
      // T2.1 — la boîte de réception consolidée doit suivre, sinon une demande
      // traitée y resterait affichée comme en attente. Invalidation de la
      // racine : les trois onglets sont concernés, une acceptation faisant
      // passer la demande de « à décider » à « archivées ».
      void qc.invalidateQueries({ queryKey: ['receivedRequests'] });
    },
  });
}
