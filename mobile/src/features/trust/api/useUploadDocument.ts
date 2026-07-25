import { useMutation, useQueryClient } from '@tanstack/react-query';
import { isAxiosError } from 'axios';
import { apiClient } from '@/core/api/client';
import type { UploadDocumentArgs } from './dto';

export type UploadErrorKind = 'validation' | 'network' | 'unknown';

export class UploadError extends Error {
  constructor(
    public readonly kind: UploadErrorKind,
    // Message serveur brut (taille/type/quota/expiration) pour l'UI si dispo.
    public readonly detail?: string,
  ) {
    super(kind);
    this.name = 'UploadError';
  }
}

function firstError(data: unknown): string | undefined {
  if (data && typeof data === 'object') {
    for (const v of Object.values(data as Record<string, unknown>)) {
      if (Array.isArray(v) && typeof v[0] === 'string') return v[0];
      if (typeof v === 'string') return v;
    }
  }
  return undefined;
}

// POST /api/v1/trust/documents/ en multipart/form-data. En React Native, un
// fichier se décrit par { uri, name, type } — forme non standard pour le type
// FormData du DOM, d'où le cast contrôlé (pas de `any`).
async function uploadDocument(args: UploadDocumentArgs): Promise<void> {
  const form = new FormData();
  form.append('document_type', args.document_type);
  form.append(
    'document_file',
    { uri: args.uri, name: args.fileName, type: args.mimeType } as unknown as Blob,
  );
  if (args.expires_at) form.append('expires_at', args.expires_at);

  try {
    await apiClient.post('trust/documents/', form, {
      // Écrase le Content-Type JSON par défaut du client ; RN ajoute la boundary.
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  } catch (err) {
    if (isAxiosError(err)) {
      if (err.response?.status === 400) {
        throw new UploadError('validation', firstError(err.response.data));
      }
      if (!err.response) throw new UploadError('network');
    }
    throw new UploadError('unknown');
  }
}

export function useUploadDocument() {
  const qc = useQueryClient();
  return useMutation<void, UploadError, UploadDocumentArgs>({
    mutationFn: uploadDocument,
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['trustDocuments'] });
      void qc.invalidateQueries({ queryKey: ['trustStatus'] });
    },
  });
}
