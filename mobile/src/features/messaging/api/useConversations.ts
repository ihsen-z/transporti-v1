import { useInfiniteQuery } from '@tanstack/react-query';
import { apiClient } from '@/core/api/client';
import { POLL_INTERVAL_MS } from '@/core/api/polling';
import type { ConversationListDto, Paginated } from './dto';

// GET /api/v1/conversations/ — inbox du user. 5.2 : peut croître sans limite
// sur la durée de vie du compte — `useInfiniteQuery`, piloté par le
// défilement de la FlatList (messages/index.tsx). Le sondage des non-lus ne
// rafraîchit que les pages déjà chargées ; sa cadence vit dans core/api/polling.ts.
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
    refetchInterval: POLL_INTERVAL_MS.conversations,
    // Cadence lente : un retour dans l'app rafraîchit aussitôt la pastille.
    refetchOnWindowFocus: true,
  });
}
