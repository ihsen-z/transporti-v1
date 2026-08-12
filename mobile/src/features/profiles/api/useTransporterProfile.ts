import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/core/api/client';
import type { TransporterProfileDto } from './dto';

// GET transporter/profile/<id>/ — profil public, déjà servi (200) mais jamais
// consulté par le mobile jusqu'ici : rien ne reliait un résultat de recherche
// à cet endpoint (owner_id manquait côté liste, livré en 0.8).
async function fetchTransporterProfile(userId: number): Promise<TransporterProfileDto> {
  const res = await apiClient.get<TransporterProfileDto>(`transporter/profile/${userId}/`);
  return res.data;
}

export function useTransporterProfile(userId: number | null) {
  return useQuery({
    queryKey: ['transporterProfile', userId],
    queryFn: () => fetchTransporterProfile(userId as number),
    enabled: userId !== null,
  });
}
