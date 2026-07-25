import { useMutation, useQueryClient } from '@tanstack/react-query';
import { isAxiosError } from 'axios';
import { apiClient } from '@/core/api/client';
import type { VehicleSubmitBody } from './dto';

export type SubmitVehicleErrorKind = 'validation' | 'network' | 'unknown';

export class SubmitVehicleError extends Error {
  constructor(public readonly kind: SubmitVehicleErrorKind) {
    super(kind);
    this.name = 'SubmitVehicleError';
  }
}

// PATCH /api/v1/trust/submit/ — MAJ infos véhicule ; bascule le profil en
// PENDING si UNVERIFIED/REJECTED (côté serveur).
async function patchVehicle(body: VehicleSubmitBody): Promise<void> {
  try {
    await apiClient.patch('trust/submit/', body);
  } catch (err) {
    if (isAxiosError(err)) {
      if (err.response?.status === 400) throw new SubmitVehicleError('validation');
      if (!err.response) throw new SubmitVehicleError('network');
    }
    throw new SubmitVehicleError('unknown');
  }
}

export function useSubmitVehicle() {
  const qc = useQueryClient();
  return useMutation<void, SubmitVehicleError, VehicleSubmitBody>({
    mutationFn: patchVehicle,
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['trustStatus'] });
    },
  });
}
