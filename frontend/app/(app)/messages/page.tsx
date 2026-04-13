"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import {
  MessageSquare,
  Search,
  ArrowRight,
  Loader2,
  AlertCircle,
  RefreshCw,
  Lock,
} from "lucide-react";
import { apiClient } from "@/lib/api/client";
import { useAuth } from "@/hooks/useAuth";

/* -------------------------------------------------------------------------- */
/*  Types                                                                      */
/* -------------------------------------------------------------------------- */

interface LastMessage {
  id: number;
  sender: number | null;
  sender_name: string;
  content: string;
  is_system: boolean;
  is_read: boolean;
  created_at: string;
}

interface ConversationItem {
  id: number;
  job: number;
  is_locked: boolean;
  created_at: string;
  updated_at: string;
  last_message: LastMessage | null;
  message_count: number;
  unread_count: number;
  job_title: string;
  job_status: string;
  other_party_name: string;
}

/* -------------------------------------------------------------------------- */
/*  Helpers                                                                    */
/* -------------------------------------------------------------------------- */

/** Relative time formatting (il y a 2h, Hier, etc.) */
function relativeTime(dateStr: string): string {
  try {
    const d = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffMin = Math.floor(diffMs / 60000);
    const diffH = Math.floor(diffMs / 3600000);
    const diffD = Math.floor(diffMs / 86400000);

    if (diffMin < 1) return "À l'instant";
    if (diffMin < 60) return `Il y a ${diffMin} min`;
    if (diffH < 24) return `Il y a ${diffH}h`;
    if (diffD === 1) return "Hier";
    if (diffD < 7) return `Il y a ${diffD}j`;
    return d.toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
  } catch {
    return "";
  }
}

/* -------------------------------------------------------------------------- */
/*  Messages Inbox — Lists all conversations (REAL API + Polling)              */
/* -------------------------------------------------------------------------- */

const POLL_INTERVAL_MS = 30_000;

export default function MessagesInboxPage() {
  const { isAuthenticated, user } = useAuth();
  const [conversations, setConversations] = useState<ConversationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const pollRef = useRef<NodeJS.Timeout | null>(null);

  const role = user?.role?.toUpperCase();

  const fetchConversations = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    setError(null);
    try {
      const data = await apiClient.get<
        ConversationItem[] | { results: ConversationItem[] }
      >("/api/conversations/");
      const items = Array.isArray(data)
        ? data
        : (data as { results: ConversationItem[] }).results;
      setConversations(items);
    } catch (err: unknown) {
      const message =
        err instanceof Error
          ? err.message
          : "Erreur lors du chargement des conversations.";
      if (!silent) setError(message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isAuthenticated) {
      fetchConversations();
      // FIX #19: Auto-polling every 30s for the inbox
      pollRef.current = setInterval(
        () => fetchConversations(true),
        POLL_INTERVAL_MS,
      );

      // FIX #20: Refresh immediately when page becomes visible
      // (e.g., returning from a thread page or switching tabs)
      const handleVisibility = () => {
        if (document.visibilityState === "visible") {
          fetchConversations(true);
        }
      };
      document.addEventListener("visibilitychange", handleVisibility);
      window.addEventListener("focus", () => fetchConversations(true));

      return () => {
        if (pollRef.current) clearInterval(pollRef.current);
        document.removeEventListener("visibilitychange", handleVisibility);
        window.removeEventListener("focus", () => fetchConversations(true));
      };
    }
  }, [isAuthenticated, fetchConversations]);

  // Filter conversations by search query
  const filteredConversations = conversations.filter((conv) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      conv.other_party_name.toLowerCase().includes(q) ||
      conv.job_title.toLowerCase().includes(q) ||
      (conv.last_message?.content || "").toLowerCase().includes(q)
    );
  });

  const totalUnread = conversations.reduce((sum, c) => sum + c.unread_count, 0);

  const getStatusBadge = (status: string) => {
    const configs: Record<string, { label: string; className: string }> = {
      IN_PROGRESS: {
        label: "En cours",
        className: "bg-brand-600/5 text-brand-600",
      },
      COMPLETED: {
        label: "Terminée",
        className: "bg-emerald-50 text-emerald-600",
      },
      DISPUTED: { label: "Litige", className: "bg-red-50 text-red-600" },
      MATCHED: {
        label: "Confirmée",
        className: "bg-brand-600/5 text-brand-600",
      },
      CANCELLED: {
        label: "Annulée",
        className: "bg-neutral-100 text-neutral-500",
      },
    };
    const cfg = configs[status];
    if (!cfg) return null;
    return (
      <span
        className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${cfg.className}`}
      >
        {cfg.label}
      </span>
    );
  };

  // FIX #8: Adapt empty state message to user role
  const emptyMessage =
    role === "TRANSPORTER"
      ? "Vos conversations apparaîtront ici une fois qu'un client aura accepté votre offre."
      : "Vos conversations apparaîtront ici une fois qu'un transporteur aura accepté votre demande.";

  return (
    <div className="p-6 lg:p-8 max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900">Messages</h1>
          <p className="text-sm text-neutral-500 mt-1">
            {loading
              ? "..."
              : `${filteredConversations.length} conversation${filteredConversations.length > 1 ? "s" : ""}`}
            {totalUnread > 0 && !loading && (
              <span className="ml-2 text-brand-600 font-semibold">
                · {totalUnread} non lu{totalUnread > 1 ? "s" : ""}
              </span>
            )}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => fetchConversations()}
            disabled={loading}
            className="p-2 hover:bg-neutral-100 rounded-lg transition-colors disabled:opacity-50"
            title="Actualiser"
          >
            <RefreshCw
              className={`w-4 h-4 text-neutral-500 ${loading ? "animate-spin" : ""}`}
            />
          </button>
          <div className="relative">
            <Search className="w-4 h-4 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Rechercher..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 pr-4 py-2 border border-neutral-200 rounded-lg text-sm focus:ring-2 focus:ring-accent-500 focus:border-brand-600 outline-none w-48"
            />
          </div>
        </div>
      </div>

      {/* Error State */}
      {error && (
        <div className="flex items-center gap-3 p-4 bg-red-50 border border-red-200 rounded-xl mb-6">
          <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
          <div className="flex-1">
            <p className="text-sm text-red-700">{error}</p>
          </div>
          <button
            onClick={() => fetchConversations()}
            className="text-sm font-medium text-red-600 hover:text-red-800"
          >
            Réessayer
          </button>
        </div>
      )}

      {/* Loading State */}
      {loading && (
        <div className="text-center py-16">
          <Loader2 className="w-8 h-8 text-brand-600 animate-spin mx-auto mb-4" />
          <p className="text-sm text-neutral-500">
            Chargement des conversations...
          </p>
        </div>
      )}

      {/* Empty State */}
      {!loading && !error && filteredConversations.length === 0 && (
        <div className="text-center py-16">
          <div className="w-20 h-20 bg-gradient-to-br from-brand-600/10 to-accent-500/10 rounded-2xl flex items-center justify-center mx-auto mb-5 rotate-6">
            <MessageSquare className="w-10 h-10 text-brand-600 -rotate-6" />
          </div>
          <h3 className="text-lg font-semibold text-neutral-900 mb-2">
            {searchQuery ? "Aucun résultat" : "Aucun message"}
          </h3>
          <p className="text-neutral-500 text-sm max-w-sm mx-auto">
            {searchQuery
              ? `Aucune conversation ne correspond à "${searchQuery}".`
              : emptyMessage}
          </p>
        </div>
      )}

      {/* Conversations List — FIX #9: Enhanced design */}
      {!loading && filteredConversations.length > 0 && (
        <div className="space-y-2">
          {filteredConversations.map((conv) => {
            const hasUnread = conv.unread_count > 0;
            const isLocked = conv.is_locked;

            return (
              <Link
                key={conv.id}
                href={`/messages/${conv.job}`}
                className={`flex items-center gap-4 p-4 rounded-xl border transition-all group ${
                  hasUnread
                    ? "bg-brand-600/[0.02] border-brand-600/20 hover:border-brand-600/40 hover:shadow-md"
                    : isLocked
                      ? "bg-neutral-50 border-neutral-200 opacity-75 hover:opacity-100"
                      : "bg-white border-neutral-200 hover:border-brand-600/30 hover:shadow-sm"
                }`}
              >
                {/* Avatar */}
                <div
                  className={`w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0 ${
                    hasUnread
                      ? "bg-brand-600 text-white"
                      : "bg-brand-600/10 text-brand-600"
                  }`}
                >
                  <span className="text-lg font-semibold">
                    {conv.other_party_name.charAt(0).toUpperCase()}
                  </span>
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <h3
                        className={`text-sm truncate ${
                          hasUnread
                            ? "font-bold text-neutral-900"
                            : "font-semibold text-neutral-900"
                        }`}
                      >
                        {conv.other_party_name}
                      </h3>
                      {getStatusBadge(conv.job_status)}
                      {isLocked && (
                        <Lock className="w-3 h-3 text-neutral-400" />
                      )}
                    </div>
                    <span className="text-xs text-neutral-400 flex-shrink-0 ml-2">
                      {conv.last_message
                        ? relativeTime(conv.last_message.created_at)
                        : relativeTime(conv.updated_at)}
                    </span>
                  </div>
                  <p className="text-xs text-neutral-500 mb-1 truncate">
                    {conv.job_title}
                  </p>
                  <p
                    className={`text-sm truncate ${
                      hasUnread
                        ? "text-neutral-800 font-medium"
                        : "text-neutral-600"
                    }`}
                  >
                    {conv.last_message?.is_system && "🤖 "}
                    {conv.last_message?.content || "Aucun message encore."}
                  </p>
                </div>

                {/* Unread badge + Arrow */}
                <div className="flex items-center gap-2 flex-shrink-0">
                  {hasUnread && (
                    <span className="min-w-[20px] h-5 bg-brand-600 text-white text-xs font-bold rounded-full flex items-center justify-center px-1">
                      {conv.unread_count}
                    </span>
                  )}
                  <ArrowRight className="w-4 h-4 text-neutral-300 group-hover:text-brand-600 transition-colors" />
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
