"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { MessageBubble } from "@/components/messaging/MessageBubble";
import { ContactReveal } from "@/components/messaging/ContactReveal";
import { checkForBypass } from "@/lib/antiBypass";
import { apiClient, ApiError } from "@/lib/api/client";
import {
  ArrowLeft,
  Send,
  Info,
  AlertTriangle,
  Truck,
  Loader2,
  Lock,
} from "lucide-react";

/* -------------------------------------------------------------------------- */
/*  Types                                                                      */
/* -------------------------------------------------------------------------- */

interface MessageItem {
  id: number;
  sender: number | null;
  sender_name: string;
  content: string;
  is_system: boolean;
  is_read: boolean;
  created_at: string;
}

interface JobInfo {
  id: number;
  pickup_address: string;
  dropoff_address: string;
  status: string;
  job_type: string;
}

interface OtherParty {
  id: number;
  name: string;
  role: string;
  phone: string | null;
  email: string | null;
}

interface ConversationInfo {
  id: number;
  is_locked: boolean;
  message_count: number;
}

interface MessagesResponse {
  conversation: ConversationInfo | null;
  messages: MessageItem[];
  count: number;
  job: JobInfo;
  other_party: OtherParty | null;
}

interface SendMessageResponse {
  message: string;
  data: MessageItem;
}

/* -------------------------------------------------------------------------- */
/*  Messaging Page (REAL API)                                                  */
/* -------------------------------------------------------------------------- */

export default function MessagingPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const jobId = params?.jobId as string;
  const currentUserId = user?.id || 0;

  // State
  const [messages, setMessages] = useState<MessageItem[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [bypassWarning, setBypassWarning] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [job, setJob] = useState<JobInfo | null>(null);
  const [otherParty, setOtherParty] = useState<OtherParty | null>(null);
  const [conversation, setConversation] = useState<ConversationInfo | null>(
    null,
  );

  const isBookingConfirmed =
    job?.status === "IN_PROGRESS" || job?.status === "COMPLETED";

  // Fetch messages from the API
  const fetchMessages = useCallback(
    async (showLoader = true) => {
      if (!jobId) return;
      if (showLoader) setLoading(true);
      setError(null);

      try {
        const data = await apiClient.get<MessagesResponse>(
          `/api/jobs/${jobId}/messages/`,
        );
        // API returns messages newest-first, reverse for chronological display
        setMessages([...data.messages].reverse());
        setJob(data.job);
        setOtherParty(data.other_party);
        setConversation(data.conversation);
      } catch (err: unknown) {
        if (err instanceof ApiError && err.status === 403) {
          setError("Vous n'avez pas accès à cette conversation.");
        } else {
          const message =
            err instanceof Error ? err.message : "Erreur lors du chargement.";
          setError(message);
        }
      } finally {
        setLoading(false);
      }
    },
    [jobId],
  );

  // Initial fetch
  useEffect(() => {
    fetchMessages(true);
  }, [fetchMessages]);

  // Polling for new messages every 10 seconds
  useEffect(() => {
    pollingRef.current = setInterval(() => {
      fetchMessages(false);
    }, 10000);
    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, [fetchMessages]);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Send a message
  const handleSend = async () => {
    if (!newMessage.trim() || sending) return;

    // Anti-bypass check — only block if job is in negotiation (PUBLISHED)
    if (job && job.status === "PUBLISHED") {
      const bypassCheck = checkForBypass(newMessage);
      if (bypassCheck.hasBypass) {
        setBypassWarning(
          "Votre message contient des informations de contact. Pour votre sécurité, les échanges de coordonnées ne sont autorisés qu'après confirmation de la réservation.",
        );
        return;
      }
    }

    setSending(true);
    setBypassWarning(null);

    try {
      const result = await apiClient.post<SendMessageResponse>(
        `/api/jobs/${jobId}/messages/`,
        { content: newMessage.trim() },
      );

      // Add the new message from the server response
      setMessages((prev) => [...prev, result.data]);
      setNewMessage("");
    } catch (err: unknown) {
      if (err instanceof ApiError && err.body) {
        const errorMsg =
          err.body.error || err.body.detail || "Erreur lors de l'envoi.";
        setBypassWarning(String(errorMsg));
      } else {
        setBypassWarning("Erreur réseau. Veuillez réessayer.");
      }
    } finally {
      setSending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "IN_PROGRESS":
        return "En cours";
      case "COMPLETED":
        return "Terminée";
      case "PUBLISHED":
        return "Publiée";
      case "DISPUTED":
        return "Litige";
      default:
        return status;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "IN_PROGRESS":
        return "bg-blue-50 text-blue-700";
      case "COMPLETED":
        return "bg-emerald-50 text-emerald-700";
      case "PUBLISHED":
        return "bg-amber-50 text-amber-700";
      case "DISPUTED":
        return "bg-red-50 text-red-700";
      default:
        return "bg-neutral-100 text-neutral-600";
    }
  };

  // Loading state
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-[calc(100vh-4rem)]">
        <Loader2 className="w-8 h-8 text-blue-500 animate-spin mb-4" />
        <p className="text-sm text-neutral-500">
          Chargement de la conversation...
        </p>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-[calc(100vh-4rem)] px-4">
        <div className="bg-red-50 border border-red-200 rounded-xl p-6 max-w-md text-center">
          <AlertTriangle className="w-8 h-8 text-red-500 mx-auto mb-3" />
          <h3 className="text-lg font-semibold text-red-800 mb-2">
            Accès refusé
          </h3>
          <p className="text-sm text-red-600 mb-4">{error}</p>
          <button
            onClick={() => router.push("/messages")}
            className="text-sm font-medium text-blue-600 hover:text-blue-800"
          >
            ← Retour aux messages
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] max-w-3xl mx-auto">
      {/* ---------------------------------------------------------------- */}
      {/*  Header                                                         */}
      {/* ---------------------------------------------------------------- */}
      <div className="bg-white border-b border-neutral-200 px-4 py-3 flex items-center gap-4 flex-shrink-0">
        <button
          onClick={() => router.push("/messages")}
          className="p-2 hover:bg-neutral-100 rounded-lg transition-colors"
        >
          <ArrowLeft className="w-5 h-5 text-neutral-600" />
        </button>

        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-neutral-900 truncate">
            {otherParty?.name || "Conversation"}
          </p>
          {job && (
            <div className="flex items-center gap-2 text-xs text-neutral-500">
              <Truck className="w-3.5 h-3.5" />
              <span className="truncate">
                {job.pickup_address} → {job.dropoff_address}
              </span>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          {job && (
            <span
              className={`text-xs font-medium px-2.5 py-1 rounded-full ${getStatusColor(job.status)}`}
            >
              {getStatusLabel(job.status)}
            </span>
          )}
        </div>
      </div>

      {/* ---------------------------------------------------------------- */}
      {/*  Contact Reveal                                                 */}
      {/* ---------------------------------------------------------------- */}
      <div className="px-4 py-3 bg-neutral-50 border-b border-neutral-200 flex-shrink-0">
        <ContactReveal
          isBookingConfirmed={isBookingConfirmed}
          phone={otherParty?.phone || undefined}
          email={otherParty?.email || undefined}
          name={otherParty?.name || undefined}
        />
      </div>

      {/* ---------------------------------------------------------------- */}
      {/*  Messages                                                       */}
      {/* ---------------------------------------------------------------- */}
      <div className="flex-1 overflow-y-auto px-4 py-6 bg-white">
        {/* System message */}
        <div className="flex justify-center mb-6">
          <div className="bg-neutral-100 rounded-full px-4 py-1.5 flex items-center gap-2">
            <Info className="w-3.5 h-3.5 text-neutral-400" />
            <span className="text-xs text-neutral-500">
              Conversation liée à la mission #{jobId}
            </span>
          </div>
        </div>

        {messages.length === 0 && (
          <div className="text-center py-12">
            <p className="text-sm text-neutral-400">
              Aucun message encore. Envoyez le premier message !
            </p>
          </div>
        )}

        {messages.map((msg) => (
          <MessageBubble
            key={msg.id}
            content={msg.content}
            timestamp={msg.created_at}
            isSender={msg.sender === currentUserId}
            senderName={msg.sender === currentUserId ? "Vous" : msg.sender_name}
            isRead={msg.is_read}
          />
        ))}

        <div ref={messagesEndRef} />
      </div>

      {/* ---------------------------------------------------------------- */}
      {/*  Bypass Warning                                                 */}
      {/* ---------------------------------------------------------------- */}
      {bypassWarning && (
        <div className="px-4 py-2 bg-amber-50 border-t border-amber-200 flex items-start gap-2 flex-shrink-0">
          <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
          <p className="text-xs text-amber-700">{bypassWarning}</p>
          <button
            onClick={() => setBypassWarning(null)}
            className="text-amber-600 hover:text-amber-800 text-xs font-medium ml-auto flex-shrink-0"
          >
            ✕
          </button>
        </div>
      )}

      {/* ---------------------------------------------------------------- */}
      {/*  Input                                                          */}
      {/* ---------------------------------------------------------------- */}
      {conversation?.is_locked ? (
        <div className="bg-neutral-50 border-t border-neutral-200 px-4 py-4 flex-shrink-0">
          <div className="flex items-center justify-center gap-2 text-neutral-500">
            <Lock className="w-4 h-4" />
            <span className="text-sm">Cette conversation est verrouillée.</span>
          </div>
        </div>
      ) : (
        <div className="bg-white border-t border-neutral-200 px-4 py-3 flex-shrink-0">
          <div className="flex items-end gap-3">
            <textarea
              value={newMessage}
              onChange={(e) => {
                setNewMessage(e.target.value);
                if (bypassWarning) setBypassWarning(null);
              }}
              onKeyDown={handleKeyDown}
              placeholder="Tapez votre message..."
              rows={1}
              className="flex-1 p-3 border border-neutral-300 rounded-xl resize-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm max-h-32"
            />
            <button
              onClick={handleSend}
              disabled={!newMessage.trim() || sending}
              className="p-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0"
            >
              {sending ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <Send className="w-5 h-5" />
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
