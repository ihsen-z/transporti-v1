"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Menu, X, User, LogOut, Shield, ChevronDown } from "lucide-react";
import TransportiLogo from "@/components/brand/TransportiLogo";
import NotificationBell from "@/components/notifications/NotificationBell";
import NotificationDropdown from "@/components/notifications/NotificationDropdown";
import { getUnreadCount } from "@/lib/notifications";
import { getNotifications } from "@/lib/services/notifications";
import type { Notification } from "@/lib/notifications";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/components/ui/Toast";
import { roleLabels, roleColors } from "@/lib/auth";

export default function AppHeader() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const { user, role, isAdmin, logout } = useAuth();
  const { showToast } = useToast();
  const router = useRouter();

  const fetchNotifications = useCallback(async () => {
    try {
      const result = await getNotifications();
      setNotifications(result.data);
    } catch (e) {
      console.error("Failed to fetch notifications:", e);
    }
  }, []);

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 30000); // 30s poll
    return () => clearInterval(interval);
  }, [fetchNotifications]);

  const unreadCount = getUnreadCount(notifications);

  const handleMarkAsRead = async (id: number) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, is_read: true } : n)),
    );
    try {
      await fetch("/api/notifications/" + id + "/read/", {
        method: "POST",
      }).catch(() => {});
      // Also try via apiClient for auth
      const { apiClient } = await import("@/lib/api/client");
      apiClient.post(`/api/notifications/${id}/read/`).catch(() => {});
    } catch {}
  };

  const handleMarkAllAsRead = async () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    try {
      const { apiClient } = await import("@/lib/api/client");
      apiClient.post("/api/notifications/read-all/").catch(() => {});
    } catch {}
  };

  const handleLogout = () => {
    logout();
    showToast("success", "Déconnexion effectuée");
    router.push("/");
  };

  return (
    <header className="fixed top-0 left-0 right-0 lg:left-64 bg-white border-b border-neutral-200 z-fixed h-16">
      <div className="h-full px-4 sm:px-6 lg:px-8 flex items-center justify-between">
        {/* Mobile: Logo */}
        <div className="flex items-center gap-3 lg:hidden">
          <Link href="/" className="flex items-center gap-2">
            <TransportiLogo context="mobile" size={28} showWordmark />
          </Link>
        </div>

        {/* Desktop: Page Title & Role Badge */}
        <div className="hidden lg:flex items-center gap-3">
          <h1 className="text-lg font-semibold text-neutral-900">
            Application
          </h1>
          <span
            className={`px-2.5 py-1 rounded-full text-xs font-medium ${roleColors[role]}`}
          >
            {roleLabels[role]}
          </span>
          {isAdmin && (
            <Link
              href="/admin/dashboard"
              className="flex items-center gap-1 px-2.5 py-1 bg-brand-600 text-white rounded-full text-xs font-medium hover:bg-brand-700 transition-colors"
            >
              <Shield className="w-3 h-3" />
              Admin
            </Link>
          )}
        </div>

        {/* Right Side Actions */}
        <div className="flex items-center gap-3">
          {/* Notifications */}
          <div className="relative">
            <NotificationBell
              unreadCount={unreadCount}
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            />
            <NotificationDropdown
              notifications={notifications}
              isOpen={isDropdownOpen}
              onClose={() => setIsDropdownOpen(false)}
              onMarkAsRead={handleMarkAsRead}
              onMarkAllAsRead={handleMarkAllAsRead}
            />
          </div>

          {/* User Menu */}
          <div className="relative">
            <button
              onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
              className="flex items-center gap-2 px-3 py-1.5 bg-brand-600/10 text-brand-600 rounded-full hover:bg-brand-600/15 transition-colors"
            >
              <div className="w-7 h-7 bg-brand-600/20 rounded-full flex items-center justify-center">
                <span className="text-sm font-semibold">
                  {user?.name?.charAt(0) || "U"}
                </span>
              </div>
              <span className="hidden sm:block text-sm font-medium max-w-[100px] truncate">
                {user?.name || "Utilisateur"}
              </span>
              <ChevronDown className="w-4 h-4" />
            </button>

            {/* User Dropdown */}
            {isUserMenuOpen && (
              <div className="absolute right-0 top-full mt-2 w-56 bg-white rounded-lg shadow-xl border border-neutral-200 overflow-hidden z-50">
                <div className="p-3 bg-neutral-50 border-b border-neutral-200">
                  <p className="font-medium text-neutral-900">{user?.name}</p>
                  <p className="text-xs text-neutral-500">{user?.email}</p>
                </div>
                <div className="p-2">
                  <Link
                    href="/settings"
                    className="w-full flex items-center gap-2 px-3 py-2 text-sm text-neutral-700 hover:bg-neutral-50 rounded-lg transition-colors"
                  >
                    <User className="w-4 h-4" />
                    Paramètres
                  </Link>
                  <Link
                    href="/help"
                    className="w-full flex items-center gap-2 px-3 py-2 text-sm text-neutral-700 hover:bg-neutral-50 rounded-lg transition-colors"
                  >
                    <Menu className="w-4 h-4" />
                    Centre d&apos;aide
                  </Link>
                  <div className="border-t border-neutral-100 my-1" />
                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                  >
                    <LogOut className="w-4 h-4" />
                    Déconnexion
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
