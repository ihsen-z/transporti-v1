import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/core/api/client';
import { POLL_INTERVAL_MS } from '@/core/api/polling';
import type { UnreadCountResponse } from './dto';

// GET /api/v1/notifications/unread-count/ — sondé pour le badge de la cloche
// (cadence dans core/api/polling.ts).
async function fetchUnreadCount(): Promise<number> {
  const res = await apiClient.get<UnreadCountResponse>('notifications/unread-count/');
  return res.data.unread_count;
}

export function useUnreadCount() {
  return useQuery({
    queryKey: ['notificationsUnreadCount'],
    queryFn: fetchUnreadCount,
    refetchInterval: POLL_INTERVAL_MS.unreadCount,
    refetchOnWindowFocus: true,
  });
}
