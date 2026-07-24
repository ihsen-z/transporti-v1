// Contrats messagerie (polling, pas de WebSocket).
// Source : backend/messaging/views.py + serializers.py.

export interface Paginated<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

// Message (MessageSerializer). sender = id utilisateur, null si système.
export interface MessageDto {
  id: number;
  sender: number | null;
  sender_name: string;
  content: string;
  is_system: boolean;
  is_read: boolean;
  created_at: string;
}

export interface LastMessageDto {
  content: string;
  sender_name: string;
  is_system: boolean;
  created_at: string | null;
}

// Élément de l'inbox (ConversationListSerializer).
export interface ConversationListDto {
  id: number;
  job: number;
  is_locked: boolean;
  updated_at: string;
  last_message: LastMessageDto | null;
  message_count: number;
  unread_count: number;
  job_title: string;
  job_status: string;
  other_party_name: string;
}

// Réponse de GET jobs/<id>/messages/ (custom, non paginée).
export interface JobMessagesResponse {
  conversation: { id: number; is_locked: boolean } | null;
  messages: MessageDto[];
  count: number;
  job: {
    id: number;
    pickup_address: string;
    dropoff_address: string;
    status: string;
    job_type: string;
  };
  other_party: { id: number; name: string; role: string } | null;
}

export interface SendMessageBody {
  content: string;
}
