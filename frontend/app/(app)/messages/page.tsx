"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  MessageSquare,
  Search,
  ArrowRight,
  Loader2,
  AlertCircle,
  RefreshCw,
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
/*  Messages Inbox — Lists all conversations (REAL API)                        */
/* -------------------------------------------------------------------------- */

export default function MessagesInboxPage() {
  const { isAuthenticated } = useAuth();
  const [conversations, setConversations] = useState<ConversationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  const fetchConversations = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiClient.get<
        ConversationItem[] | { results: ConversationItem[] }
      >("/api/conversations/");
      // Handle paginated response from DRF
      const items = Array.isArray(data)
        ? data
        : (data as { results: ConversationItem[] }).results;
      setConversations(items);
    } catch (err: unknown) {
      const message =
        err instanceof Error
          ? err.message
          : "Erreur lors du chargement des conversations.";
      setError(message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isAuthenticated) {
      fetchConversations();
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

  const formatDate = (dateStr: string) => {
    try {
      return new Date(dateStr).toLocaleDateString("fr-FR", {
        day: "numeric",
        month: "short",
      });
    } catch {
      return "";
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "IN_PROGRESS":
        return (
          <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-brand-600/5 text-brand-600">
            En cours
          </span>
        );
      case "COMPLETED":
        return (
          <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-emerald-50 text-emerald-600">
            Terminée
          </span>
        );
      case "DISPUTED":
        return (
          <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-red-50 text-red-600">
            Litige
          </span>
        );
      default:
        return null;
    }
  };

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
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={fetchConversations}
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
            onClick={fetchConversations}
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
          <div className="w-16 h-16 bg-neutral-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <MessageSquare className="w-8 h-8 text-neutral-400" />
          </div>
          <h3 className="text-lg font-semibold text-neutral-900 mb-2">
            {searchQuery ? "Aucun résultat" : "Aucun message"}
          </h3>
          <p className="text-neutral-500 text-sm">
            {searchQuery
              ? `Aucune conversation ne correspond à "${searchQuery}".`
              : "Vos conversations apparaîtront ici une fois qu'un transporteur aura accepté votre demande."}
          </p>
        </div>
      )}

      {/* Conversations List */}
      {!loading && filteredConversations.length > 0 && (
        <div className="space-y-2">
          {filteredConversations.map((conv) => (
            <Link
              key={conv.id}
              href={`/messages/${conv.job}`}
              className="flex items-center gap-4 p-4 bg-white border border-neutral-200 rounded-xl hover:border-brand-600/30 hover:shadow-sm transition-all group"
            >
              {/* Avatar */}
              <div className="w-12 h-12 bg-brand-600/10 rounded-full flex items-center justify-center flex-shrink-0">
                <span className="text-lg font-semibold text-brand-600">
                  {conv.other_party_name.charAt(0).toUpperCase()}
                </span>
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-semibold text-neutral-900 truncate">
                      {conv.other_party_name}
                    </h3>
                    {getStatusBadge(conv.job_status)}
                  </div>
                  <span className="text-xs text-neutral-400 flex-shrink-0 ml-2">
                    {conv.last_message
                      ? formatDate(conv.last_message.created_at)
                      : formatDate(conv.updated_at)}
                  </span>
                </div>
                <p className="text-xs text-neutral-500 mb-1 truncate">
                  {conv.job_title}
                </p>
                <p className="text-sm text-neutral-600 truncate">
                  {conv.last_message?.content || "Aucun message encore."}
                </p>
              </div>

              {/* Unread badge + Arrow */}
              <div className="flex items-center gap-2 flex-shrink-0">
                {conv.unread_count > 0 && (
                  <span className="w-5 h-5 bg-brand-600 text-white text-xs font-bold rounded-full flex items-center justify-center">
                    {conv.unread_count}
                  </span>
                )}
                {conv.is_locked && (
                  <span className="text-xs text-neutral-400">🔒</span>
                )}
                <ArrowRight className="w-4 h-4 text-neutral-300 group-hover:text-brand-600 transition-colors" />
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
