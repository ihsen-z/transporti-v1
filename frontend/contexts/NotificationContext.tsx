"use client";

import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  useRef,
  type ReactNode,
} from "react";
import type { Notification } from "@/lib/services/types";
import {
  getNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
} from "@/lib/services/notifications";
import { useAuth } from "@/contexts/AuthContext";

/* -------------------------------------------------------------------------- */
/*  NotificationContext — Centralised polling for the entire app              */
/*  Replaces per-component polling in AppHeader (30s) + BottomNav (60s)       */
/*  Single source: 1 req/30s instead of 3-5/min                              */
/* -------------------------------------------------------------------------- */

interface NotificationContextType {
  notifications: Notification[];
  unreadCount: number;
  /** Fetch fresh notifications from API (called by context + dropdown open) */
  refresh: () => Promise<void>;
  /** Mark a single notification as read */
  markAsRead: (id: number) => Promise<void>;
  /** Mark all notifications as read */
  markAllRead: () => Promise<void>;
  /** Whether a fetch is in progress */
  loading: boolean;
}

const NotificationContext = createContext<NotificationContextType | undefined>(
  undefined,
);

const POLL_INTERVAL_MS = 30_000; // 30 seconds

export function NotificationProvider({ children }: { children: ReactNode }) {
  const { isAuthenticated } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  const refresh = useCallback(async () => {
    if (!isAuthenticated) return;
    setLoading(true);
    try {
      const result = await getNotifications();
      setNotifications(result.data);
    } catch {
      // Fail silently — stale data is better than no data
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated]);

  const markAsRead = useCallback(
    async (id: number) => {
      // Optimistic update
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, is_read: true } : n)),
      );
      try {
        await markNotificationAsRead(id);
      } catch {
        // Revert on failure
        refresh();
      }
    },
    [refresh],
  );

  const markAllRead = useCallback(async () => {
    // Optimistic update
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    try {
      await markAllNotificationsAsRead();
    } catch {
      refresh();
    }
  }, [refresh]);

  // Start polling when authenticated, stop when not
  useEffect(() => {
    if (!isAuthenticated) {
      setNotifications([]);
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }

    // Initial fetch
    refresh();

    // Poll every 30s
    intervalRef.current = setInterval(refresh, POLL_INTERVAL_MS);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [isAuthenticated, refresh]);

  const value: NotificationContextType = {
    notifications,
    unreadCount,
    refresh,
    markAsRead,
    markAllRead,
    loading,
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error(
      "useNotifications must be used within a NotificationProvider",
    );
  }
  return context;
}
