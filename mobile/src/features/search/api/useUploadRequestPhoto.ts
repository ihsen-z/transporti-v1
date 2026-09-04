import { useMutation } from '@tanstack/react-query';
import { isAxiosError } from 'axios';
import { apiClient } from '@/core/api/client';
import { extractServerMessage } from '@/core/api/serverMessage';
import type { PhotoUploadResponse } from './dto';

/**
 * Lot 6.1 — une photo de la marchandise, envoyée à `upload/photo/`.
 *
 * L'endpoint existait depuis longtemps côté serveur (`PhotoUploadView`) et le
 * champ `photos` était déjà accepté par le sérialiseur de création : le mobile
 * n'avait simplement jamais rempli ce canal. Le serveur valide (5 Mo max,
 * JPEG/PNG/WebP par octets magiques), corrige l'orientation EXIF, redimensionne
 * à 2000 px et renvoie une URL publique.
 *
 * On envoie donc l'URL, jamais l'URI locale `file://` : celle-ci ne veut rien
 * dire pour le transporteur qui lira la demande sur son propre appareil.
 */

/** Un fichier en React Native se décrit par ces trois champs. */
export interface PhotoAsset {
  uri: string;
  fileName: string;
  mimeType: string;
}

export class PhotoUploadError extends Error {
  constructor(
    public readonly kind: 'validation' | 'network' | 'unknown',
    /** Message serveur (taille, format) — rédigé en français côté vue. */
    public readonly serverMessage: string | null,
  ) {
    super(kind);
    this.name = 'PhotoUploadError';
  }
}

async function uploadPhoto(asset: PhotoAsset): Promise<string> {
  const form = new FormData();
  // En RN, { uri, name, type } n'est pas la forme du type FormData du DOM :
  // cast contrôlé, pas de `any` (même motif que useUploadDocument).
  form.append(
    'photo',
    { uri: asset.uri, name: asset.fileName, type: asset.mimeType } as unknown as Blob,
  );

  try {
    const res = await apiClient.post<PhotoUploadResponse>('upload/photo/', form, {
      // Écrase le Content-Type JSON par défaut ; RN ajoute la boundary.
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return res.data.url;
  } catch (err) {
    if (isAxiosError(err)) {
      if (!err.response) throw new PhotoUploadError('network', null);
      if (err.response.status === 400) {
        throw new PhotoUploadError(
          'validation',
          extractServerMessage(err.response.data),
        );
      }
    }
    throw new PhotoUploadError('unknown', null);
  }
}

export function useUploadRequestPhoto() {
  return useMutation<string, PhotoUploadError, PhotoAsset>({
    mutationFn: uploadPhoto,
  });
}
