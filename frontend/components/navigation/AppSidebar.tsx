"use client";

import Link from "next/link";
import {
  LayoutDashboard,
  Truck,
  Bell,
  PlusCircle,
  Search,
  ShieldCheck,
  FileText,
  MessageSquare,
  Settings,
  HelpCircle,
  RotateCcw,
  AlertTriangle,
  UserCircle,
  Wallet,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import NavItem from "./NavItem";
import { SidebarLogo } from "@/components/brand/TransportiLogo";
import { useAppI18n } from "@/lib/i18n/useAppI18n";
import ThemeToggle from "@/components/ui/ThemeToggle";
import type { LucideIcon } from "lucide-react";

export default function AppSidebar() {
  const { user } = useAuth();
  const { t, isRTL } = useAppI18n();
  const role = user?.role?.toUpperCase();

  type NavItemDef = { href: string; icon: LucideIcon; label: string };

  const commonItems: NavItemDef[] = [
    { href: "/dashboard", icon: LayoutDashboard, label: t.nav.dashboard },
    {
      href: `/profile/${user?.id || ""}`,
      icon: UserCircle,
      label: t.nav.myProfile || "Mon Profil",
    },
    {
      href: "/jobs",
      icon: Truck,
      label: role === "TRANSPORTER" ? t.nav.myMissions : t.nav.myTransports,
    },
    { href: "/messages", icon: MessageSquare, label: t.nav.messages },
    { href: "/notifications", icon: Bell, label: t.nav.notifications },
    { href: "/disputes", icon: AlertTriangle, label: t.nav.disputes },
  ];

  const clientItems: NavItemDef[] = [
    { href: "/jobs/new", icon: PlusCircle, label: t.nav.publishAd },
    { href: "/jobs/return-trips", icon: RotateCcw, label: t.nav.returnTrips },
  ];

  const transporterItems: NavItemDef[] = [
    { href: "/jobs/browse", icon: Search, label: t.nav.findMission },
    { href: "/offers", icon: FileText, label: t.nav.myOffers },
    { href: "/wallet", icon: Wallet, label: t.nav.wallet },
    { href: "/jobs/return-trip", icon: RotateCcw, label: t.nav.returnTrip },
    { href: "/verification", icon: ShieldCheck, label: t.nav.verification },
  ];

  const bottomItems: NavItemDef[] = [
    { href: "/help", icon: HelpCircle, label: t.nav.helpCenter },
    { href: "/settings", icon: Settings, label: t.nav.settings },
  ];

  let mainItems = [...commonItems];
  if (role === "CLIENT") {
    mainItems = [...clientItems, ...mainItems];
  } else if (role === "TRANSPORTER") {
    mainItems = [...mainItems, ...transporterItems];
  }

  return (
    <aside
      className={`hidden lg:flex flex-col w-64 bg-white dark:bg-neutral-900 ${isRTL ? "border-s border-neutral-200 dark:border-neutral-800" : "border-e border-neutral-200 dark:border-neutral-800"} h-screen fixed ${isRTL ? "right-0" : "left-0"} top-0 pt-0 z-sidebar`}
    >
      {/* Logo Area */}
      <div className="px-6 py-4 border-b border-neutral-100 h-16 flex items-center overflow-hidden">
        <Link href="/dashboard">
          <SidebarLogo />
        </Link>
      </div>

      {/* Main Navigation */}
      <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto">
        {mainItems.map((item) => (
          <NavItem key={item.href} {...item} />
        ))}
      </nav>

      {/* Bottom Navigation */}
      <div className="px-4 py-2 border-t border-neutral-100 dark:border-neutral-800 space-y-1">
        {bottomItems.map((item) => (
          <NavItem key={item.href} {...item} />
        ))}
        <div className="flex items-center justify-between px-3 py-2">
          <span className="text-xs text-neutral-400">Thème</span>
          <ThemeToggle />
        </div>
      </div>

      {/* Footer */}
      <div className="px-4 py-4 border-t border-neutral-100">
        <Link href="/settings">
          <div className="px-4 py-3 bg-neutral-50 rounded-lg hover:bg-neutral-100 transition-colors cursor-pointer">
            <p className="text-xs text-neutral-500 mb-1">{t.nav.connectedAs}</p>
            <p className="text-sm font-bold text-neutral-900 truncate">
              {user?.first_name || user?.name || t.nav.user}
            </p>
            <p className="text-xs text-brand-600 font-medium">
              {role === "TRANSPORTER"
                ? t.nav.transporter
                : role === "CLIENT"
                  ? t.nav.client
                  : user?.role || "Guest"}
            </p>
          </div>
        </Link>
      </div>
    </aside>
  );
}
