import { useMutation } from '@tanstack/react-query';
import { isAxiosError } from 'axios';
import { apiClient } from '@/core/api/client';
import { useAuthStore } from '@/core/auth/authStore';
import type { AvatarUploadArgs, AvatarUploadResponseDto } from './dto';

// Erreurs métier exposées à l'UI.
export type AvatarUploadErrorKind = 'validation' | 'network' | 'unknown';

export class AvatarUploadError extends Error {
  constructor(
    public readonly kind: AvatarUploadErrorKind,
    // Message serveur brut (format/taille) pour l'UI si dispo.
    public readonly detail?: string,
  ) {
    super(kind);
    this.name = 'AvatarUploadError';
  }
}

// POST /api/v1/auth/avatar/ en multipart. En RN, un fichier = { uri, name, type }
// (forme non standard pour le type FormData du DOM -> cast contrôlé, pas d'any).
async function uploadAvatar(args: AvatarUploadArgs): Promise<AvatarUploadResponseDto> {
  const form = new FormData();
  form.append(
    'avatar',
    { uri: args.uri, name: args.fileName, type: args.mimeType } as unknown as Blob,
  );
  try {
    const res = await apiClient.post<AvatarUploadResponseDto>('auth/avatar/', form, {
      // Écrase le Content-Type JSON par défaut ; RN ajoute la boundary.
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return res.data;
  } catch (err) {
    if (isAxiosError(err)) {
      if (err.response?.status === 400) {
        const detail = (err.response.data as { error?: string })?.error;
        throw new AvatarUploadError('validation', detail);
      }
      if (!err.response) throw new AvatarUploadError('network');
    }
    throw new AvatarUploadError('unknown');
  }
}

// Sur succès, met à jour l'avatar du user en store (sans toucher aux tokens).
export function useUploadAvatar() {
  const user = useAuthStore((s) => s.user);
  const setUser = useAuthStore((s) => s.setUser);
  return useMutation<AvatarUploadResponseDto, AvatarUploadError, AvatarUploadArgs>({
    mutationFn: uploadAvatar,
    onSuccess: (data) => {
      if (user) setUser({ ...user, avatarUrl: data.avatar_url });
    },
  });
}
