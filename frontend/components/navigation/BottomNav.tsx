"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Truck,
  Bell,
  MessageSquare,
  Settings,
  Search,
  FileText,
  PlusCircle,
} from "lucide-react";
import { getNotifications } from "@/lib/services/notifications";
import { getUnreadCount } from "@/lib/notifications";
import { useAuth } from "@/hooks/useAuth";

export default function BottomNav() {
  const pathname = usePathname();
  const { user } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);
  const role = user?.role?.toUpperCase();

  const fetchCount = useCallback(async () => {
    try {
      const result = await getNotifications();
      setUnreadCount(getUnreadCount(result.data));
    } catch (e) {
      // silent fail
    }
  }, []);

  useEffect(() => {
    fetchCount();
    const interval = setInterval(fetchCount, 60000); // 60s instead of 30s for perf
    return () => clearInterval(interval);
  }, [fetchCount]);

  // Role-aware nav items
  const navItems =
    role === "TRANSPORTER"
      ? [
          {
            href: "/dashboard",
            icon: LayoutDashboard,
            label: "Accueil",
            badge: 0,
          },
          { href: "/jobs/browse", icon: Search, label: "Missions", badge: 0 },
          { href: "/offers", icon: FileText, label: "Offres", badge: 0 },
          {
            href: "/notifications",
            icon: Bell,
            label: "Notifs",
            badge: unreadCount,
          },
          { href: "/settings", icon: Settings, label: "Profil", badge: 0 },
        ]
      : [
          {
            href: "/dashboard",
            icon: LayoutDashboard,
            label: "Accueil",
            badge: 0,
          },
          { href: "/jobs", icon: Truck, label: "Transports", badge: 0 },
          {
            href: "/messages",
            icon: MessageSquare,
            label: "Messages",
            badge: 0,
          },
          {
            href: "/notifications",
            icon: Bell,
            label: "Notifs",
            badge: unreadCount,
          },
          { href: "/settings", icon: Settings, label: "Profil", badge: 0 },
        ];

  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-neutral-200 z-fixed safe-area-bottom">
      <div className="flex items-center justify-around h-16">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive =
            pathname === item.href || pathname.startsWith(`${item.href}/`);

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`
                flex flex-col items-center justify-center flex-1 h-full py-2 px-1
                transition-colors duration-200
                ${
                  isActive
                    ? "text-brand-600"
                    : "text-neutral-500 hover:text-neutral-700"
                }
              `}
            >
              <div
                className={`
                relative p-1.5 rounded-lg transition-colors
                ${isActive ? "bg-brand-600/10" : ""}
              `}
              >
                <Icon className="w-5 h-5" />
                {item.badge > 0 && (
                  <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1 animate-pulse">
                    {item.badge > 9 ? "9+" : item.badge}
                  </span>
                )}
              </div>
              <span
                className={`text-xs mt-1 font-medium ${isActive ? "text-brand-600" : ""}`}
              >
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
