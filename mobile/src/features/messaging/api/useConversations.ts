import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/core/api/client';
import type { ConversationListDto, Paginated } from './dto';

// GET /api/v1/conversations/ — inbox du user. Polling léger (10s) pour les non-lus.
async function fetchConversations(): Promise<ConversationListDto[]> {
  const res = await apiClient.get<Paginated<ConversationListDto>>('conversations/');
  return res.data.results;
}

export function useConversations() {
  return useQuery({
    queryKey: ['conversations'],
    queryFn: fetchConversations,
    refetchInterval: 10_000,
  });
}
