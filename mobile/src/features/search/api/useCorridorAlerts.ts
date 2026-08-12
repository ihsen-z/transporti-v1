import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/core/api/client';
import type { CorridorAlertDto, CorridorAlertsResponse } from './dto';

export const corridorAlertsKey = ['corridorAlerts'] as const;

// GET corridor-alerts/ — les alertes actives du client. Activée seulement à
// l'ouverture du panneau (créable depuis Recherche, listable/supprimable ici).
async function fetchCorridorAlerts(): Promise<CorridorAlertDto[]> {
  const res = await apiClient.get<CorridorAlertsResponse>('corridor-alerts/');
  return res.data.results;
}

export function useCorridorAlerts(enabled: boolean) {
  return useQuery({
    queryKey: corridorAlertsKey,
    queryFn: fetchCorridorAlerts,
    enabled,
  });
}
