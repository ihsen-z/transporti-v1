"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import {
  Package,
  CreditCard,
  Shield,
  AlertCircle,
  Star,
  Bell as BellIcon,
  Check,
  CheckCheck,
  Search,
  ExternalLink,
  RefreshCw,
  Loader2,
  Filter,
} from "lucide-react";
import { apiClient } from "@/lib/api/client";
import { useAuth } from "@/hooks/useAuth";
import { useAppI18n, type AppTranslationKeys } from "@/lib/i18n/useAppI18n";

type NotificationsT = AppTranslationKeys["notifications"];

/* -------------------------------------------------------------------------- */
/*  Types                                                                      */
/* -------------------------------------------------------------------------- */

interface Notification {
  id: number;
  category: "PAYMENT" | "TRUST" | "JOB" | "DISPUTE" | "REVIEW" | "SYSTEM";
  type: string;
  title: string;
  message: string;
  is_read: boolean;
  created_at: string;
  metadata?: Record<string, any>;
}

/* -------------------------------------------------------------------------- */
/*  Helpers                                                                    */
/* -------------------------------------------------------------------------- */

const categoryIcons: Record<string, React.ElementType> = {
  PAYMENT: CreditCard,
  TRUST: Shield,
  JOB: Package,
  DISPUTE: AlertCircle,
  REVIEW: Star,
  SYSTEM: BellIcon,
};

const categoryColors: Record<string, string> = {
  PAYMENT: "text-emerald-600 bg-emerald-50 border-emerald-200",
  TRUST: "text-blue-600 bg-blue-50 border-blue-200",
  JOB: "text-brand-600 bg-brand-50 border-brand-200",
  DISPUTE: "text-orange-600 bg-orange-50 border-orange-200",
  REVIEW: "text-purple-600 bg-purple-50 border-purple-200",
  SYSTEM: "text-neutral-600 bg-neutral-100 border-neutral-200",
};

const getCategoryLabel = (cat: string, t: NotificationsT): string => {
  const map: Record<string, string> = {
    ALL: t.all,
    PAYMENT: t.catPayments,
    TRUST: t.catVerifications,
    JOB: t.catMissions,
    DISPUTE: t.catDisputes,
    REVIEW: t.catReviews,
    SYSTEM: t.catSystem,
  };
  return map[cat] || cat;
};

function relativeTime(dateStr: string, t: NotificationsT): string {
  try {
    const d = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffMin = Math.floor(diffMs / 60000);
    const diffH = Math.floor(diffMs / 3600000);
    const diffD = Math.floor(diffMs / 86400000);

    if (diffMin < 1) return t.now;
    if (diffMin < 60) return `Il y a ${diffMin} ${t.minutesAgo}`;
    if (diffH < 24) return `Il y a ${diffH}${t.hourAgo}`;
    if (diffD === 1) return t.yesterday;
    if (diffD < 7) return `Il y a ${diffD}${t.daysAgo}`;
    return d.toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
  } catch {
    return "";
  }
}

function getDateGroup(dateStr: string, t: NotificationsT): string {
  const d = new Date(dateStr);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today.getTime() - 86400000);
  const notifDay = new Date(d.getFullYear(), d.getMonth(), d.getDate());

  if (notifDay.getTime() === today.getTime()) return t.today;
  if (notifDay.getTime() === yesterday.getTime()) return t.yesterday;
  if (now.getTime() - notifDay.getTime() < 7 * 86400000) return t.thisWeek;
  return d.toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

/** Build an action link from notification metadata */
function getActionLink(
  notification: Notification,
  t: NotificationsT,
): { href: string; label: string } | null {
  const m = notification.metadata;
  if (!m) return null;

  // P1-06: Corrected deep links to actual routes
  if (m.job_id) {
    if (
      notification.category === "JOB" ||
      notification.category === "PAYMENT"
    ) {
      return { href: `/jobs/${m.job_id}`, label: t.actionSeeMission };
    }
    if (notification.category === "DISPUTE") {
      return { href: `/jobs/${m.job_id}`, label: t.actionSeeDispute };
    }
    return { href: `/jobs/${m.job_id}`, label: t.actionSeeDetails };
  }
  if (notification.category === "REVIEW" && m.review_id) {
    const targetId = m.target_id || "";
    return {
      href: targetId ? `/profile/${targetId}` : "/profile",
      label: t.actionSeeProfile,
    };
  }
  if (m.dispute_id) {
    return {
      href: `/disputes`,
      label: t.actionSeeDisputes,
    };
  }
  return null;
}

/* -------------------------------------------------------------------------- */
/*  Polling Config                                                             */
/* -------------------------------------------------------------------------- */

const POLL_INTERVAL_MS = 30_000;

/* -------------------------------------------------------------------------- */
/*  Component                                                                  */
/* -------------------------------------------------------------------------- */

export default function NotificationsPage() {
  const { isAuthenticated, user } = useAuth();
  const { t: allT } = useAppI18n();
  const t = allT.notifications;
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<"all" | "unread">("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const pollRef = useRef<NodeJS.Timeout | null>(null);

  /* ---- Fetch ---- */
  const fetchNotifications = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    setError(null);
    try {
      const data = await apiClient.get<
        Notification[] | { results: Notification[] }
      >("/api/notifications/my/");
      const items = Array.isArray(data)
        ? data
        : (data as { results: Notification[] }).results;
      setNotifications(items);
    } catch (err: unknown) {
      const message =
        err instanceof Error
          ? err.message
          : t.loading;
      if (!silent) setError(message);
    } finally {
      setLoading(false);
    }
  }, []);

  /* ---- Polling + visibility (#8, #20) ---- */
  useEffect(() => {
    if (isAuthenticated) {
      fetchNotifications();
      pollRef.current = setInterval(
        () => fetchNotifications(true),
        POLL_INTERVAL_MS,
      );

      const handleVisibility = () => {
        if (document.visibilityState === "visible") {
          fetchNotifications(true);
        }
      };
      document.addEventListener("visibilitychange", handleVisibility);

      return () => {
        if (pollRef.current) clearInterval(pollRef.current);
        document.removeEventListener("visibilitychange", handleVisibility);
      };
    }
  }, [isAuthenticated, fetchNotifications]);

  /* ---- Mark as read (Fix #2 — persist via API) ---- */
  const handleMarkAsRead = async (id: number) => {
    // Optimistic update
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, is_read: true } : n)),
    );
    try {
      await apiClient.post(`/api/notifications/${id}/read/`);
    } catch {
      // Revert on failure
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, is_read: false } : n)),
      );
    }
  };

  const handleMarkAllAsRead = async () => {
    const prevState = notifications.map((n) => ({ ...n }));
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    try {
      await apiClient.post("/api/notifications/read-all/");
    } catch {
      setNotifications(prevState);
    }
  };

  /* ---- Filtering ---- */
  const filteredNotifications = notifications.filter((n) => {
    if (filter === "unread" && n.is_read) return false;
    if (categoryFilter !== "ALL" && n.category !== categoryFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        n.title.toLowerCase().includes(q) || n.message.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  /* ---- Group by date (#13) ---- */
  const groupedNotifications: { label: string; items: Notification[] }[] = [];
  let lastGroup = "";
  filteredNotifications.forEach((n) => {
    const group = getDateGroup(n.created_at, t);
    if (group !== lastGroup) {
      groupedNotifications.push({ label: group, items: [n] });
      lastGroup = group;
    } else {
      groupedNotifications[groupedNotifications.length - 1].items.push(n);
    }
  });

  /* ---- Category counts for filter badges ---- */
  const categoryCounts: Record<string, number> = { ALL: notifications.length };
  notifications.forEach((n) => {
    categoryCounts[n.category] = (categoryCounts[n.category] || 0) + 1;
  });

  /* ---- Available category filters (only show if notifications exist) ---- */
  const availableCategories = [
    "ALL",
    ...Object.keys(categoryCounts).filter(
      (k) => k !== "ALL" && categoryCounts[k] > 0,
    ),
  ];

  /* ---- Render ---- */
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-neutral-900 mb-2">
              {t.pageTitle}
            </h1>
            <p className="text-neutral-600">
              {t.pageSubtitle}
            </p>
          </div>
          <button
            onClick={() => fetchNotifications()}
            className="p-2 text-neutral-500 hover:text-brand-600 hover:bg-neutral-100 rounded-lg transition-colors"
            title={t.refresh}
          >
            <RefreshCw className={`w-5 h-5 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {/* Controls Bar */}
      <div className="bg-white rounded-xl shadow-sm border border-neutral-200 p-4 mb-6">
        <div className="flex flex-col gap-4">
          {/* Row 1: Read filter + Search + Mark All */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setFilter("all")}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  filter === "all"
                    ? "bg-brand-600 text-white shadow-sm"
                    : "bg-neutral-100 text-neutral-700 hover:bg-neutral-200"
                }`}
              >
                {t.all} ({notifications.length})
              </button>
              <button
                onClick={() => setFilter("unread")}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  filter === "unread"
                    ? "bg-brand-600 text-white shadow-sm"
                    : "bg-neutral-100 text-neutral-700 hover:bg-neutral-200"
                }`}
              >
                {t.unread} ({unreadCount})
              </button>
            </div>

            <div className="flex items-center gap-3">
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={t.search}
                  className="pl-9 pr-3 py-2 bg-neutral-50 border border-neutral-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 w-48"
                />
              </div>

              {/* Mark All Read */}
              {unreadCount > 0 && (
                <button
                  onClick={handleMarkAllAsRead}
                  className="flex items-center gap-2 px-4 py-2 text-brand-600 hover:text-brand-700 hover:bg-brand-50 rounded-lg font-medium transition-colors text-sm"
                >
                  <CheckCheck className="w-4 h-4" />
                  <span className="hidden sm:inline">
                    {t.markAllRead}
                  </span>
                </button>
              )}
            </div>
          </div>

          {/* Row 2: Category Filter (#5) */}
          {availableCategories.length > 2 && (
            <div className="flex items-center gap-2 overflow-x-auto pb-1">
              <Filter className="w-4 h-4 text-neutral-400 flex-shrink-0" />
              {availableCategories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setCategoryFilter(cat)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors whitespace-nowrap ${
                    categoryFilter === cat
                      ? "bg-brand-600 text-white"
                      : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200"
                  }`}
                >
                  {getCategoryLabel(cat, t)} ({categoryCounts[cat] || 0})
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Error State */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6 flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
          <p className="text-red-700 text-sm">{error}</p>
          <button
            onClick={() => fetchNotifications()}
            className="ml-auto text-red-600 hover:text-red-700 text-sm font-medium"
          >
            {t.retry}
          </button>
        </div>
      )}

      {/* Loading State */}
      {loading && notifications.length === 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-neutral-200 p-12">
          <div className="flex flex-col items-center justify-center text-center">
            <Loader2 className="w-10 h-10 text-brand-600 animate-spin mb-4" />
            <p className="text-neutral-600">{t.loading}</p>
          </div>
        </div>
      )}

      {/* Empty State */}
      {!loading && filteredNotifications.length === 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-neutral-200 p-12">
          <div className="flex flex-col items-center justify-center text-center">
            <div className="w-20 h-20 bg-gradient-to-br from-brand-50 to-brand-100 rounded-2xl flex items-center justify-center mb-4">
              <BellIcon className="w-10 h-10 text-brand-400" />
            </div>
            <h3 className="text-xl font-semibold text-neutral-900 mb-2">
              {filter === "unread"
                ? t.noUnread
                : categoryFilter !== "ALL"
                  ? `${t.noNotificationsInCategory} ${getCategoryLabel(categoryFilter, t).toLowerCase()}`
                  : t.noNotifications}
            </h3>
            <p className="text-neutral-600 max-w-md">
              {filter === "unread"
                ? t.successDesc
                : t.noNotificationsDesc}
            </p>
          </div>
        </div>
      )}

      {/* Notifications List — Grouped by Date (#13) */}
      {!loading && groupedNotifications.length > 0 && (
        <div className="space-y-6">
          {groupedNotifications.map((group) => (
            <div key={group.label}>
              {/* Date Separator */}
              <div className="flex items-center gap-3 mb-3">
                <h2 className="text-sm font-semibold text-neutral-500 uppercase tracking-wider">
                  {group.label}
                </h2>
                <div className="flex-1 h-px bg-neutral-200" />
              </div>

              {/* Notification Cards */}
              <div className="space-y-3">
                {group.items.map((notification) => {
                  const Icon = categoryIcons[notification.category] || BellIcon;
                  const colorClasses =
                    categoryColors[notification.category] ||
                    categoryColors.SYSTEM;
                  const actionLink = getActionLink(notification, t);

                  return (
                    <div
                      key={notification.id}
                      className={`bg-white rounded-xl shadow-sm border transition-all hover:shadow-md group ${
                        !notification.is_read
                          ? "border-brand-200 bg-brand-50/30 ring-1 ring-brand-100"
                          : "border-neutral-200"
                      }`}
                    >
                      <div className="p-5">
                        <div className="flex gap-4">
                          {/* Category Icon */}
                          <div
                            className={`flex-shrink-0 w-12 h-12 rounded-xl flex items-center justify-center border ${colorClasses}`}
                          >
                            <Icon className="w-6 h-6" />
                          </div>

                          {/* Content */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-3 mb-1.5">
                              <div className="flex items-center gap-2">
                                <h3
                                  className={`text-base font-semibold ${
                                    !notification.is_read
                                      ? "text-neutral-900"
                                      : "text-neutral-700"
                                  }`}
                                >
                                  {notification.title}
                                </h3>
                                {!notification.is_read && (
                                  <span className="flex-shrink-0 w-2.5 h-2.5 bg-cta-500 rounded-full animate-pulse" />
                                )}
                              </div>
                              <span className="flex-shrink-0 text-xs text-neutral-500 pt-0.5">
                                {relativeTime(notification.created_at, t)}
                              </span>
                            </div>

                            <p className="text-neutral-600 text-sm mb-3 leading-relaxed">
                              {notification.message}
                            </p>

                            {/* Metadata Badges */}
                            {notification.metadata &&
                              Object.keys(notification.metadata).length > 0 && (
                                <div className="flex flex-wrap gap-2 mb-3">
                                  {notification.metadata.amount && (
                                    <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                                      {notification.metadata.amount} TND
                                    </span>
                                  )}
                                  {notification.metadata.job_id && (
                                    <Link
                                      href={`/jobs/${notification.metadata.job_id}`}
                                      className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-neutral-100 text-neutral-700 hover:bg-brand-50 hover:text-brand-700 transition-colors border border-neutral-200"
                                    >
                                      Mission #{notification.metadata.job_id}
                                      <ExternalLink className="w-3 h-3 ml-1" />
                                    </Link>
                                  )}
                                  {notification.metadata.rating && (
                                    <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-purple-50 text-purple-700 border border-purple-200">
                                      {"⭐".repeat(
                                        notification.metadata.rating,
                                      )}
                                    </span>
                                  )}
                                </div>
                              )}

                            {/* Actions Row */}
                            <div className="flex items-center gap-3">
                              {/* Action Link (#4) */}
                              {actionLink && (
                                <Link
                                  href={actionLink.href}
                                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-brand-600 hover:text-brand-700 bg-brand-50 hover:bg-brand-100 rounded-lg transition-colors"
                                >
                                  <ExternalLink className="w-3.5 h-3.5" />
                                  {actionLink.label}
                                </Link>
                              )}

                              {/* Mark as Read */}
                              {!notification.is_read && (
                                <button
                                  onClick={() =>
                                    handleMarkAsRead(notification.id)
                                  }
                                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-neutral-600 hover:text-brand-600 hover:bg-neutral-100 rounded-lg transition-colors"
                                >
                                  <Check className="w-3.5 h-3.5" />
                                  {t.markRead}
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
