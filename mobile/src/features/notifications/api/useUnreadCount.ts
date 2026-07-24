import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/core/api/client';
import type { UnreadCountResponse } from './dto';

// GET /api/v1/notifications/unread-count/ — polling 15s pour le badge cloche.
async function fetchUnreadCount(): Promise<number> {
  const res = await apiClient.get<UnreadCountResponse>('notifications/unread-count/');
  return res.data.unread_count;
}

export function useUnreadCount() {
  return useQuery({
    queryKey: ['notificationsUnreadCount'],
    queryFn: fetchUnreadCount,
    refetchInterval: 15_000,
  });
}
