"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { MessageBubble } from "@/components/messaging/MessageBubble";
import { ContactReveal } from "@/components/messaging/ContactReveal";
import { checkForBypass } from "@/lib/antiBypass";
import { apiClient, ApiError } from "@/lib/api/client";
import StatusBadge from "@/components/ui/StatusBadge";
import { useAppI18n, type AppTranslationKeys } from "@/lib/i18n/useAppI18n";
import { interpolate } from "@/lib/i18n/interpolate";
import {
  ArrowLeft,
  Send,
  Info,
  AlertTriangle,
  Truck,
  Loader2,
  Lock,
  ChevronDown,
  ChevronUp,
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
/*  Helpers                                                                    */
/* -------------------------------------------------------------------------- */

/** Truncate long addresses */
function shortAddr(addr: string, max = 35): string {
  if (!addr || addr.length <= max) return addr;
  const parts = addr.split(",").map((p) => p.trim());
  if (parts.length >= 2) {
    const s = `${parts[0]}, ${parts[1]}`;
    return s.length <= max ? s : parts[0].slice(0, max) + "…";
  }
  return addr.slice(0, max) + "…";
}

/** Format a date for separator display */
function dateSeparatorLabel(dateStr: string, t: AppTranslationKeys): string {
  const d = new Date(dateStr);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const msgDay = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const diffDays = Math.floor((today.getTime() - msgDay.getTime()) / 86400000);

  if (diffDays === 0) return t.messages.today;
  if (diffDays === 1) return t.messages.yesterday;
  return d.toLocaleDateString("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
}

/** Check if two messages are on different days */
function isDifferentDay(a: string, b: string): boolean {
  const da = new Date(a);
  const db = new Date(b);
  return (
    da.getFullYear() !== db.getFullYear() ||
    da.getMonth() !== db.getMonth() ||
    da.getDate() !== db.getDate()
  );
}

/* -------------------------------------------------------------------------- */
/*  Messaging Page (REAL API)                                                  */
/* -------------------------------------------------------------------------- */

export default function MessagingPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const { t } = useAppI18n();
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
  const [errorType, setErrorType] = useState<"403" | "404" | "other">("other");
  const [job, setJob] = useState<JobInfo | null>(null);
  const [otherParty, setOtherParty] = useState<OtherParty | null>(null);
  const [conversation, setConversation] = useState<ConversationInfo | null>(
    null,
  );
  const [showContact, setShowContact] = useState(false);

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
        // FIX #2: Differentiate 403 vs 404 errors
        if (err instanceof ApiError) {
          if (err.status === 403) {
            setErrorType("403");
            setError(t.messages.error403);
          } else if (err.status === 404) {
            setErrorType("404");
            setError(t.messages.error404);
          } else {
            setErrorType("other");
            setError(err.message || t.messages.loadingError);
          }
        } else {
          setErrorType("other");
          const message =
            err instanceof Error ? err.message : t.messages.loadingError;
          setError(message);
        }
      } finally {
        setLoading(false);
      }
    },
    [jobId, t],
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
        setBypassWarning(t.messages.bypassWarning);
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
          err.body.error || err.body.detail || t.messages.sendError;
        setBypassWarning(String(errorMsg));
      } else {
        setBypassWarning(t.messages.networkError);
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

  // Loading state
  if (loading) {
    return (
      <div
        className="flex flex-col items-center justify-center"
        style={{ minHeight: "calc(100vh - 10rem)" }}
      >
        <Loader2 className="w-8 h-8 text-brand-600 animate-spin mb-4" />
        <p className="text-sm text-neutral-500">
          {t.messages.loadingConversation}
        </p>
      </div>
    );
  }

  // FIX #2: Differentiated error state
  if (error) {
    return (
      <div
        className="flex flex-col items-center justify-center px-4"
        style={{ minHeight: "calc(100vh - 10rem)" }}
      >
        <div
          className={`border rounded-xl p-6 max-w-md text-center ${
            errorType === "403"
              ? "bg-red-50 border-red-200"
              : errorType === "404"
                ? "bg-amber-50 border-amber-200"
                : "bg-neutral-50 border-neutral-200"
          }`}
        >
          <AlertTriangle
            className={`w-8 h-8 mx-auto mb-3 ${
              errorType === "403"
                ? "text-red-500"
                : errorType === "404"
                  ? "text-amber-500"
                  : "text-neutral-400"
            }`}
          />
          <h3
            className={`text-lg font-semibold mb-2 ${
              errorType === "403"
                ? "text-red-800"
                : errorType === "404"
                  ? "text-amber-800"
                  : "text-neutral-800"
            }`}
          >
            {errorType === "403"
              ? t.messages.accessDenied
              : errorType === "404"
                ? t.messages.conversationNotFound
                : t.messages.errorTitle}
          </h3>
          <p
            className={`text-sm mb-4 ${
              errorType === "403"
                ? "text-red-600"
                : errorType === "404"
                  ? "text-amber-600"
                  : "text-neutral-600"
            }`}
          >
            {error}
          </p>
          <button
            onClick={() => router.push("/messages")}
            className="text-sm font-medium text-brand-600 hover:text-brand-700"
          >
            {t.messages.backToMessages}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      className="flex flex-col max-w-3xl mx-auto -mb-20 lg:-mb-0"
      style={{
        height: "calc(100vh - 4rem - env(safe-area-inset-bottom, 0px))",
        maxHeight: "calc(100vh - 4rem)",
      }}
    >
      {/* ---------------------------------------------------------------- */}
      {/*  Header — FIX #10: Truncated addresses                          */}
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
            {otherParty?.name || t.messages.conversationFallback}
          </p>
          {job && (
            <div
              className="flex items-center gap-2 text-xs text-neutral-500"
              title={`${job.pickup_address} → ${job.dropoff_address}`}
            >
              <Truck className="w-3.5 h-3.5 flex-shrink-0" />
              <span className="truncate">
                {shortAddr(job.pickup_address)} →{" "}
                {shortAddr(job.dropoff_address)}
              </span>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          {job && <StatusBadge status={job.status} />}
        </div>
      </div>

      {/* ---------------------------------------------------------------- */}
      {/*  Contact Reveal — FIX #11: Collapsible                          */}
      {/* ---------------------------------------------------------------- */}
      {isBookingConfirmed && otherParty && (
        <div className="border-b border-neutral-200 flex-shrink-0">
          <button
            onClick={() => setShowContact(!showContact)}
            className="w-full px-4 py-2 flex items-center justify-between text-xs text-emerald-700 bg-emerald-50/50 hover:bg-emerald-50 transition-colors"
          >
            <span className="flex items-center gap-1.5 font-medium">
              {interpolate(t.messages.contactOf, {
                name: otherParty.name || t.messages.yourContact,
              })}
            </span>
            {showContact ? (
              <ChevronUp className="w-3.5 h-3.5" />
            ) : (
              <ChevronDown className="w-3.5 h-3.5" />
            )}
          </button>
          {showContact && (
            <div className="px-4 py-3 bg-emerald-50/30">
              <ContactReveal
                isBookingConfirmed={true}
                phone={otherParty.phone || undefined}
                email={otherParty.email || undefined}
                name={otherParty.name || undefined}
              />
            </div>
          )}
        </div>
      )}
      {!isBookingConfirmed && (
        <div className="px-4 py-2 bg-neutral-50 border-b border-neutral-200 flex-shrink-0">
          <div className="flex items-center gap-2 text-xs text-neutral-500">
            <Lock className="w-3.5 h-3.5 text-neutral-400" />
            <span>{t.messages.contactProtected}</span>
          </div>
        </div>
      )}

      {/* ---------------------------------------------------------------- */}
      {/*  Messages — FIX #13: Date separators                            */}
      {/* ---------------------------------------------------------------- */}
      <div className="flex-1 overflow-y-auto px-4 py-6 bg-white">
        {/* System header */}
        <div className="flex justify-center mb-6">
          <div className="bg-neutral-100 rounded-full px-4 py-1.5 flex items-center gap-2">
            <Info className="w-3.5 h-3.5 text-neutral-400" />
            <span className="text-xs text-neutral-500">
              {interpolate(t.messages.linkedToMission, { id: jobId })}
            </span>
          </div>
        </div>

        {messages.length === 0 && (
          <div className="text-center py-12">
            <p className="text-sm text-neutral-400">
              {t.messages.noMessageStart}
            </p>
          </div>
        )}

        {messages.map((msg, idx) => {
          // FIX #13: Show date separator when day changes
          const showDateSep =
            idx === 0 ||
            isDifferentDay(messages[idx - 1].created_at, msg.created_at);

          return (
            <React.Fragment key={msg.id}>
              {showDateSep && (
                <div className="flex items-center gap-3 my-4">
                  <div className="flex-1 h-px bg-neutral-200" />
                  <span className="text-xs text-neutral-400 font-medium px-2">
                    {dateSeparatorLabel(msg.created_at, t)}
                  </span>
                  <div className="flex-1 h-px bg-neutral-200" />
                </div>
              )}

              {msg.is_system ? (
                /* System message — special styling */
                <div className="flex justify-center mb-3">
                  <div className="bg-neutral-50 border border-neutral-200 rounded-lg px-4 py-2 max-w-[80%]">
                    <p className="text-xs text-neutral-600 whitespace-pre-wrap text-center">
                      {msg.content}
                    </p>
                  </div>
                </div>
              ) : (
                <MessageBubble
                  content={msg.content}
                  timestamp={msg.created_at}
                  isSender={msg.sender === currentUserId}
                  senderName={
                    msg.sender === currentUserId ? t.messages.you : msg.sender_name
                  }
                  isRead={msg.is_read}
                />
              )}
            </React.Fragment>
          );
        })}

        <div ref={messagesEndRef} />
      </div>

      {/* ---------------------------------------------------------------- */}
      {/*  Bypass Warning                                                  */}
      {/* ---------------------------------------------------------------- */}
      {bypassWarning && (
        <div className="px-4 py-2 bg-amber-50 border-t border-amber-200 flex items-start gap-2 flex-shrink-0">
          <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
          <p className="text-xs text-amber-700">{bypassWarning}</p>
          <button
            onClick={() => setBypassWarning(null)}
            className="text-amber-600 hover:text-amber-800 text-xs font-medium ms-auto flex-shrink-0"
          >
            ✕
          </button>
        </div>
      )}

      {/* ---------------------------------------------------------------- */}
      {/*  Input                                                           */}
      {/* ---------------------------------------------------------------- */}
      {conversation?.is_locked ? (
        <div className="bg-neutral-50 border-t border-neutral-200 px-4 py-4 flex-shrink-0">
          <div className="flex items-center justify-center gap-2 text-neutral-500">
            <Lock className="w-4 h-4" />
            <span className="text-sm">{t.messages.conversationLocked}</span>
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
              placeholder={t.messages.messagePlaceholder}
              rows={1}
              className="flex-1 p-3 border border-neutral-300 rounded-xl resize-none focus:ring-2 focus:ring-accent-500 focus:border-brand-600 text-sm max-h-32"
            />
            <button
              onClick={handleSend}
              disabled={!newMessage.trim() || sending}
              className="p-3 bg-brand-600 text-white rounded-xl hover:bg-brand-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0"
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
