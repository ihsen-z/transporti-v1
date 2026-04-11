"use client";

import {
  X,
  Check,
  CheckCheck,
  Package,
  CreditCard,
  Shield,
  AlertCircle,
  Star,
  Bell as BellIcon,
} from "lucide-react";
import type { Notification } from "@/lib/notifications";
import { formatTimeAgo, getCategoryColor } from "@/lib/notifications";

interface NotificationDropdownProps {
  notifications: Notification[];
  isOpen: boolean;
  onClose: () => void;
  onMarkAsRead: (id: number) => void;
  onMarkAllAsRead: () => void;
}

const categoryIcons = {
  PAYMENT: CreditCard,
  TRUST: Shield,
  JOB: Package,
  DISPUTE: AlertCircle,
  REVIEW: Star,
  SYSTEM: BellIcon,
};

export default function NotificationDropdown({
  notifications,
  isOpen,
  onClose,
  onMarkAsRead,
  onMarkAllAsRead,
}: NotificationDropdownProps) {
  if (!isOpen) return null;

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-modal-backdrop" onClick={onClose} />

      {/* Dropdown */}
      <div className="absolute right-0 top-full mt-2 w-96 max-w-[calc(100vw-2rem)] bg-white rounded-xl shadow-2xl border border-neutral-200 z-modal overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-neutral-200 bg-neutral-50">
          <div>
            <h3 className="text-lg font-bold text-neutral-900">
              Notifications
            </h3>
            {unreadCount > 0 && (
              <p className="text-sm text-neutral-600">
                {unreadCount} non lue{unreadCount > 1 ? "s" : ""}
              </p>
            )}
          </div>
          <div className="flex items-center gap-2">
            {unreadCount > 0 && (
              <button
                onClick={onMarkAllAsRead}
                className="text-sm text-brand-600 hover:text-brand-700 font-medium flex items-center gap-1"
                title="Tout marquer comme lu"
              >
                <CheckCheck className="w-4 h-4" />
                <span className="hidden sm:inline">Tout lire</span>
              </button>
            )}
            <button
              onClick={onClose}
              className="p-1 text-neutral-500 hover:text-neutral-700 hover:bg-neutral-200 rounded transition-colors"
              aria-label="Fermer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Notification List */}
        <div className="max-h-[32rem] overflow-y-auto">
          {notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
              <div className="w-16 h-16 bg-neutral-100 rounded-full flex items-center justify-center mb-4">
                <BellIcon className="w-8 h-8 text-neutral-400" />
              </div>
              <h4 className="text-lg font-semibold text-neutral-900 mb-2">
                Aucune notification
              </h4>
              <p className="text-sm text-neutral-600 max-w-xs">
                Vous n&apos;avez pas encore de notifications. Elles apparaîtront
                ici.
              </p>
            </div>
          ) : (
            <ul className="divide-y divide-neutral-100">
              {notifications.map((notification) => {
                const Icon = categoryIcons[notification.category];
                const colorClasses = getCategoryColor(notification.category);

                return (
                  <li
                    key={notification.id}
                    className={`p-4 hover:bg-neutral-50 transition-colors ${
                      !notification.is_read ? "bg-brand-600/5/30" : ""
                    }`}
                  >
                    <div className="flex gap-3">
                      {/* Icon */}
                      <div
                        className={`flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center ${colorClasses}`}
                      >
                        <Icon className="w-5 h-5" />
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2 mb-1">
                          <h4
                            className={`text-sm font-semibold ${
                              !notification.is_read
                                ? "text-neutral-900"
                                : "text-neutral-700"
                            }`}
                          >
                            {notification.title}
                          </h4>
                          {!notification.is_read && (
                            <span className="flex-shrink-0 w-2 h-2 bg-cta-500 rounded-full mt-1.5" />
                          )}
                        </div>
                        <p className="text-sm text-neutral-600 mb-2 line-clamp-2">
                          {notification.message}
                        </p>
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-neutral-500">
                            {formatTimeAgo(notification.created_at)}
                          </span>
                          {!notification.is_read && (
                            <button
                              onClick={() => onMarkAsRead(notification.id)}
                              className="text-xs text-brand-600 hover:text-brand-700 font-medium flex items-center gap-1"
                            >
                              <Check className="w-3 h-3" />
                              Marquer comme lu
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {/* Footer */}
        {notifications.length > 0 && (
          <div className="p-3 border-t border-neutral-200 bg-neutral-50">
            <a
              href="/notifications"
              className="block text-center text-sm font-medium text-brand-600 hover:text-brand-700 transition-colors"
            >
              Voir toutes les notifications
            </a>
          </div>
        )}
      </div>
    </>
  );
}
