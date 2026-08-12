import { useInfiniteQuery } from '@tanstack/react-query';
import { apiClient } from '@/core/api/client';
import type { ConversationListDto, Paginated } from './dto';

// GET /api/v1/conversations/ — inbox du user. 5.2 : peut croître sans limite
// sur la durée de vie du compte — `useInfiniteQuery`, piloté par le
// défilement de la FlatList (messages/index.tsx). Polling léger (10s) sur les
// non-lus conservé : il ne rafraîchit que les pages déjà chargées.
async function fetchConversationsPage(
  pageUrl: string | null,
): Promise<Paginated<ConversationListDto>> {
  const res = pageUrl
    ? await apiClient.get<Paginated<ConversationListDto>>(pageUrl)
    : await apiClient.get<Paginated<ConversationListDto>>('conversations/');
  return res.data;
}

export function useConversations() {
  return useInfiniteQuery({
    queryKey: ['conversations'],
    queryFn: ({ pageParam }) => fetchConversationsPage(pageParam),
    initialPageParam: null as string | null,
    getNextPageParam: (lastPage) => lastPage.next,
    refetchInterval: 10_000,
  });
}
