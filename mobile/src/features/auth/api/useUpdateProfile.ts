import { useMutation } from '@tanstack/react-query';
import { isAxiosError } from 'axios';
import { apiClient } from '@/core/api/client';
import { useAuthStore } from '@/core/auth/authStore';
import type { UpdateProfileRequestDto, UpdateProfileResponseDto } from './dto';
import { mapUserDto } from './mapper';

// Erreurs métier exposées à l'UI (pas de fuite d'axios dans l'écran).
export type UpdateProfileErrorKind = 'validation' | 'network' | 'unknown';

export class UpdateProfileError extends Error {
  constructor(public readonly kind: UpdateProfileErrorKind) {
    super(kind);
    this.name = 'UpdateProfileError';
  }
}

// PUT auth/profile/ (partiel). baseURL = .../api/v1, slash final requis.
async function putProfile(body: UpdateProfileRequestDto): Promise<UpdateProfileResponseDto> {
  try {
    const res = await apiClient.put<UpdateProfileResponseDto>('auth/profile/', body);
    return res.data;
  } catch (err) {
    if (isAxiosError(err)) {
      if (err.response?.status === 400) throw new UpdateProfileError('validation');
      if (!err.response) throw new UpdateProfileError('network');
    }
    throw new UpdateProfileError('unknown');
  }
}

// Hook d'édition du profil : sur succès, met à jour le user en store SANS
// toucher aux tokens (setUser). La réponse renvoie le user à jour.
export function useUpdateProfile() {
  const setUser = useAuthStore((s) => s.setUser);
  return useMutation<UpdateProfileResponseDto, UpdateProfileError, UpdateProfileRequestDto>({
    mutationFn: putProfile,
    onSuccess: (data) => setUser(mapUserDto(data.user)),
  });
}
