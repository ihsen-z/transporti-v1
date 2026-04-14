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
  Inbox,
  ChevronRight,
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

/** Status badge config with dot color */
const STATUS_CONFIGS: Record<
  string,
  { label: string; dotColor: string; className: string }
> = {
  IN_PROGRESS: {
    label: "En cours",
    dotColor: "bg-brand-600",
    className: "bg-brand-600/5 text-brand-600",
  },
  COMPLETED: {
    label: "Terminée",
    dotColor: "bg-emerald-500",
    className: "bg-emerald-50 text-emerald-600",
  },
  DISPUTED: {
    label: "Litige",
    dotColor: "bg-red-500",
    className: "bg-red-50 text-red-600",
  },
  MATCHED: {
    label: "Confirmée",
    dotColor: "bg-brand-600",
    className: "bg-brand-600/5 text-brand-600",
  },
  CANCELLED: {
    label: "Annulée",
    dotColor: "bg-neutral-400",
    className: "bg-neutral-100 text-neutral-500",
  },
};

/* -------------------------------------------------------------------------- */
/*  StatusBadge — Enhanced with color dot                                      */
/* -------------------------------------------------------------------------- */

function StatusBadge({ status }: { status: string }) {
  const cfg = STATUS_CONFIGS[status];
  if (!cfg) return null;
  return (
    <span
      className={`inline-flex items-center gap-1.5 text-[10px] font-semibold px-2 py-0.5 rounded-full ${cfg.className}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${cfg.dotColor}`} />
      {cfg.label}
    </span>
  );
}

/* -------------------------------------------------------------------------- */
/*  ConversationCard — Premium list item                                       */
/* -------------------------------------------------------------------------- */

function ConversationCard({ conv }: { conv: ConversationItem }) {
  const hasUnread = conv.unread_count > 0;
  const isLocked = conv.is_locked;
  const time = conv.last_message
    ? relativeTime(conv.last_message.created_at)
    : relativeTime(conv.updated_at);
  const isRecent = time === "À l'instant" || time.includes("min");

  return (
    <Link
      href={`/messages/${conv.job}`}
      className={`
        group relative flex items-center gap-4 p-4 rounded-2xl border transition-all duration-200
        ${
          hasUnread
            ? "bg-brand-600/[0.02] border-brand-600/20 border-l-[3px] border-l-brand-600 hover:shadow-md hover:-translate-y-0.5"
            : isLocked
              ? "bg-neutral-50/50 border-neutral-200 opacity-70 hover:opacity-100"
              : "bg-white border-neutral-100 hover:border-brand-600/20 hover:shadow-sm hover:-translate-y-0.5"
        }
      `}
    >
      {/* Avatar */}
      <div className="relative flex-shrink-0">
        <div
          className={`w-12 h-12 rounded-full flex items-center justify-center transition-transform group-hover:scale-105 ${
            hasUnread
              ? "bg-brand-600 text-white shadow-lg shadow-brand-600/20"
              : "bg-gradient-to-br from-brand-600/10 to-brand-600/5 text-brand-600"
          }`}
        >
          <span
            className={`font-semibold ${hasUnread ? "text-lg" : "text-base"}`}
          >
            {conv.other_party_name.charAt(0).toUpperCase()}
          </span>
        </div>
        {/* Online indicator dot */}
        {hasUnread && (
          <span className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-accent-500 border-2 border-white rounded-full" />
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        {/* Row 1: Name + Status + Time */}
        <div className="flex items-center justify-between mb-0.5">
          <div className="flex items-center gap-2 min-w-0">
            <h3
              className={`text-sm truncate ${
                hasUnread
                  ? "font-bold text-neutral-900"
                  : "font-semibold text-neutral-800"
              }`}
            >
              {conv.other_party_name}
            </h3>
            <StatusBadge status={conv.job_status} />
            {isLocked && (
              <Lock className="w-3 h-3 text-neutral-400 flex-shrink-0" />
            )}
          </div>
          <span
            className={`text-xs flex-shrink-0 ml-2 ${
              isRecent && hasUnread
                ? "font-semibold text-brand-600"
                : "text-neutral-400"
            }`}
          >
            {time}
          </span>
        </div>

        {/* Row 2: Job title */}
        <p className="text-[11px] text-neutral-400 mb-1 truncate tracking-wide uppercase font-medium">
          {conv.job_title}
        </p>

        {/* Row 3: Last message preview */}
        <p
          className={`text-sm truncate leading-snug ${
            hasUnread ? "text-neutral-800 font-medium" : "text-neutral-500"
          }`}
        >
          {conv.last_message?.is_system && (
            <span className="inline-block mr-1 text-brand-600">🤖</span>
          )}
          {conv.last_message?.content || "Aucun message encore."}
        </p>
      </div>

      {/* Right: Unread badge + Arrow */}
      <div className="flex items-center gap-2.5 flex-shrink-0">
        {hasUnread && (
          <span className="min-w-[22px] h-[22px] bg-brand-600 text-white text-[11px] font-bold rounded-full flex items-center justify-center px-1.5 shadow-sm shadow-brand-600/30 animate-pulse">
            {conv.unread_count}
          </span>
        )}
        <ChevronRight
          className={`w-4 h-4 transition-all duration-200 ${
            hasUnread
              ? "text-brand-600"
              : "text-neutral-300 group-hover:text-brand-600 group-hover:translate-x-0.5"
          }`}
        />
      </div>
    </Link>
  );
}

/* -------------------------------------------------------------------------- */
/*  Messages Inbox — Premium List (Variant A)                                  */
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
          <h1 className="text-2xl font-bold text-neutral-900 tracking-tight">
            Messages
          </h1>
          <p className="text-sm text-neutral-500 mt-1">
            {loading
              ? "Chargement..."
              : `${filteredConversations.length} conversation${filteredConversations.length > 1 ? "s" : ""}`}
            {totalUnread > 0 && !loading && (
              <span className="ml-2 inline-flex items-center gap-1">
                <span className="w-1.5 h-1.5 bg-brand-600 rounded-full animate-pulse" />
                <span className="text-brand-600 font-semibold">
                  {totalUnread} non lu{totalUnread > 1 ? "s" : ""}
                </span>
              </span>
            )}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => fetchConversations()}
            disabled={loading}
            className="p-2.5 hover:bg-brand-600/5 rounded-xl transition-colors disabled:opacity-50 group"
            title="Actualiser"
          >
            <RefreshCw
              className={`w-4 h-4 text-neutral-400 group-hover:text-brand-600 transition-colors ${loading ? "animate-spin" : ""}`}
            />
          </button>
          <div className="relative">
            <Search className="w-4 h-4 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              placeholder="Rechercher..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 pr-4 py-2.5 border border-neutral-200 rounded-xl text-sm focus:ring-2 focus:ring-accent-500/30 focus:border-accent-500 outline-none w-52 transition-all bg-neutral-50/50 focus:bg-white placeholder:text-neutral-400"
            />
          </div>
        </div>
      </div>

      {/* Error State */}
      {error && (
        <div className="flex items-center gap-3 p-4 bg-red-50 border border-red-200 rounded-2xl mb-6 animate-fade-in">
          <div className="w-10 h-10 bg-red-100 rounded-xl flex items-center justify-center flex-shrink-0">
            <AlertCircle className="w-5 h-5 text-red-500" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium text-red-800">
              Erreur de chargement
            </p>
            <p className="text-xs text-red-600 mt-0.5">{error}</p>
          </div>
          <button
            onClick={() => fetchConversations()}
            className="text-sm font-semibold text-red-600 hover:text-red-800 px-3 py-1.5 rounded-lg hover:bg-red-100 transition-colors"
          >
            Réessayer
          </button>
        </div>
      )}

      {/* Loading State */}
      {loading && (
        <div className="text-center py-20 animate-fade-in">
          <div className="w-16 h-16 bg-brand-600/5 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Loader2 className="w-8 h-8 text-brand-600 animate-spin" />
          </div>
          <p className="text-sm text-neutral-500 font-medium">
            Chargement des conversations...
          </p>
        </div>
      )}

      {/* Empty State — Enhanced with gradient */}
      {!loading && !error && filteredConversations.length === 0 && (
        <div className="text-center py-20 animate-fade-in">
          <div className="relative w-24 h-24 mx-auto mb-6">
            <div className="absolute inset-0 bg-gradient-to-br from-brand-600/10 to-accent-500/10 rounded-3xl rotate-6 animate-pulse" />
            <div className="absolute inset-0 flex items-center justify-center">
              <Inbox className="w-12 h-12 text-brand-600 -rotate-6" />
            </div>
          </div>
          <h3 className="text-lg font-bold text-neutral-900 mb-2">
            {searchQuery ? "Aucun résultat" : "Aucun message"}
          </h3>
          <p className="text-neutral-500 text-sm max-w-sm mx-auto leading-relaxed">
            {searchQuery
              ? `Aucune conversation ne correspond à "${searchQuery}".`
              : emptyMessage}
          </p>
          {!searchQuery && (
            <Link
              href={role === "TRANSPORTER" ? "/jobs/browse" : "/jobs/new"}
              className="inline-flex items-center gap-2 mt-6 text-sm font-semibold text-white bg-accent-500 hover:bg-accent-600 px-5 py-2.5 rounded-xl transition-all hover:shadow-md hover:-translate-y-0.5"
            >
              {role === "TRANSPORTER"
                ? "Trouver une mission"
                : "Publier une annonce"}
              <ArrowRight className="w-4 h-4" />
            </Link>
          )}
        </div>
      )}

      {/* Conversations List — Premium cards */}
      {!loading && filteredConversations.length > 0 && (
        <div className="space-y-2">
          {filteredConversations.map((conv, index) => (
            <div
              key={conv.id}
              className="animate-fade-in"
              style={{ animationDelay: `${index * 50}ms` }}
            >
              <ConversationCard conv={conv} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
