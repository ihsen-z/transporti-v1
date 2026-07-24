import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/core/api/client';
import type { NotificationDto, Paginated } from './dto';

// GET /api/v1/notifications/my/ — historique (récentes d'abord).
async function fetchNotifications(): Promise<NotificationDto[]> {
  const res = await apiClient.get<Paginated<NotificationDto>>('notifications/my/');
  return res.data.results;
}

// Activé seulement quand le panneau est ouvert (évite un fetch inutile au boot).
export function useNotifications(enabled: boolean) {
  return useQuery({
    queryKey: ['notifications'],
    queryFn: fetchNotifications,
    enabled,
  });
}
