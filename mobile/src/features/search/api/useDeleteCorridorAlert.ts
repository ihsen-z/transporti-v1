import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/core/api/client';
import { corridorAlertsKey } from './useCorridorAlerts';

// DELETE corridor-alerts/<id>/ — désabonnement (CorridorAlertDeleteView).
// Une alerte créable et jamais supprimable jusqu'ici : le mobile n'exposait
// aucune liste, donc aucun moyen de revenir en arrière sur un corridor.
async function deleteCorridorAlert(alertId: number): Promise<void> {
  await apiClient.delete(`corridor-alerts/${alertId}/`);
}

export function useDeleteCorridorAlert() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: deleteCorridorAlert,
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: corridorAlertsKey });
    },
  });
}
