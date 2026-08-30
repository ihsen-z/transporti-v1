/**
 * Messagerie — lot 4.2.
 *
 * Deux écrans lisaient l'API en ligne, chacun avec sa propre copie des types :
 * `LastMessage` dans la liste, `MessageItem` dans la conversation, pour la
 * même forme. Une divergence entre les deux ne se serait vue qu'à l'exécution.
 */
import { apiClient } from "@/lib/api/client";

/** Un message, tel que le backend le renvoie dans les deux écrans. */
export interface Message {
  id: number;
  sender: number | null;
  sender_name: string;
  content: string;
  is_system: boolean;
  is_read: boolean;
  created_at: string;
}

export interface Conversation {
  id: number;
  job: number;
  is_locked: boolean;
  created_at: string;
  updated_at: string;
  last_message: Message | null;
  message_count: number;
  unread_count: number;
  job_title: string;
  job_status: string;
  other_party_name: string;
}

export interface InfosConversation {
  id: number;
  is_locked: boolean;
  message_count: number;
}

export interface InfosTransport {
  id: number;
  pickup_address: string;
  dropoff_address: string;
  status: string;
  job_type: string;
}

export interface Interlocuteur {
  id: number;
  name: string;
  role: string;
  phone: string | null;
  email: string | null;
}

export interface FilDeConversation {
  conversation: InfosConversation | null;
  messages: Message[];
  count: number;
  job: InfosTransport;
  other_party: Interlocuteur | null;
}

export async function getConversations(): Promise<Conversation[]> {
  const reponse = await apiClient.get<
    Conversation[] | { results: Conversation[] }
  >("/api/conversations/");
  return Array.isArray(reponse) ? reponse : (reponse.results ?? []);
}

/**
 * Le fil d'un transport, messages remis dans l'ORDRE CHRONOLOGIQUE.
 *
 * L'API les renvoie du plus récent au plus ancien, ce qui convient à une
 * liste d'aperçus mais pas à une conversation. Le retournement se fait ici,
 * une fois, plutôt que dans l'écran — l'oublier afficherait une discussion
 * à l'envers sans rien casser d'autre.
 */
export async function getConversation(
  jobId: number,
): Promise<FilDeConversation> {
  const reponse = await apiClient.get<FilDeConversation>(
    `/api/jobs/${jobId}/messages/`,
  );
  return { ...reponse, messages: [...reponse.messages].reverse() };
}

export async function sendMessage(
  jobId: number,
  contenu: string,
): Promise<Message> {
  const reponse = await apiClient.post<{ message: string; data: Message }>(
    `/api/jobs/${jobId}/messages/`,
    { content: contenu },
  );
  return reponse.data;
}
