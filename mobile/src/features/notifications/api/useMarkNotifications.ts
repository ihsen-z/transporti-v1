import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/core/api/client';

// Invalide la liste ET le compteur non-lus après une lecture.
function invalidateNotifications(qc: ReturnType<typeof useQueryClient>) {
  void qc.invalidateQueries({ queryKey: ['notifications'] });
  void qc.invalidateQueries({ queryKey: ['notificationsUnreadCount'] });
}

// POST /api/v1/notifications/<id>/read/
export function useMarkRead() {
  const qc = useQueryClient();
  return useMutation<void, Error, number>({
    mutationFn: async (id) => {
      await apiClient.post(`notifications/${id}/read/`);
    },
    onSuccess: () => invalidateNotifications(qc),
  });
}

// POST /api/v1/notifications/read-all/
export function useMarkAllRead() {
  const qc = useQueryClient();
  return useMutation<void, Error, void>({
    mutationFn: async () => {
      await apiClient.post('notifications/read-all/');
    },
    onSuccess: () => invalidateNotifications(qc),
  });
}
