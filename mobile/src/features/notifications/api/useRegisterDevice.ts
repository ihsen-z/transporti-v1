import { useMutation } from '@tanstack/react-query';
import { apiClient } from '@/core/api/client';
import type { DeviceRegisterBody } from './dto';

// POST notifications/devices/register/ — idempotent côté serveur (upsert sur
// user+token), donc rappelable à chaque lancement sans se soucier des doublons.
async function postRegisterDevice(body: DeviceRegisterBody): Promise<void> {
  await apiClient.post('notifications/devices/register/', body);
}

export function useRegisterDevice() {
  return useMutation({ mutationFn: postRegisterDevice });
}
