import { useInfiniteQuery } from '@tanstack/react-query';
import { apiClient } from '@/core/api/client';
import type { NotificationDto, Paginated } from './dto';

// GET /api/v1/notifications/my/ — historique (récentes d'abord). Flux qui
// peut croître sans limite dans le temps (5.2) : `useInfiniteQuery`, piloté
// par le défilement de la FlatList (NotificationBell), plutôt qu'un
// rapatriement d'un bloc — contrairement aux listes personnelles bornées
// (missions, demandes), voir `core/api/fetchAllPages.ts`.
async function fetchNotificationsPage(pageUrl: string | null): Promise<Paginated<NotificationDto>> {
  const res = pageUrl
    ? await apiClient.get<Paginated<NotificationDto>>(pageUrl)
    : await apiClient.get<Paginated<NotificationDto>>('notifications/my/');
  return res.data;
}

// Activé seulement quand le panneau est ouvert (évite un fetch inutile au boot).
export function useNotifications(enabled: boolean) {
  return useInfiniteQuery({
    queryKey: ['notifications'],
    queryFn: ({ pageParam }) => fetchNotificationsPage(pageParam),
    initialPageParam: null as string | null,
    getNextPageParam: (lastPage) => lastPage.next,
    enabled,
  });
}
