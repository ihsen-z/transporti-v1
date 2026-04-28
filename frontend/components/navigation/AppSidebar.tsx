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
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import NavItem from "./NavItem";
import { SidebarLogo } from "@/components/brand/TransportiLogo";
import { useAppI18n } from "@/lib/i18n/useAppI18n";
import type { LucideIcon } from "lucide-react";

export default function AppSidebar() {
  const { user } = useAuth();
  const { t } = useAppI18n();
  const role = user?.role?.toUpperCase();

  type NavItemDef = { href: string; icon: LucideIcon; label: string };

  const commonItems: NavItemDef[] = [
    { href: "/dashboard", icon: LayoutDashboard, label: t.nav.dashboard },
    {
      href: "/jobs",
      icon: Truck,
      label: role === "TRANSPORTER" ? t.nav.myMissions : t.nav.myTransports,
    },
    { href: "/messages", icon: MessageSquare, label: t.nav.messages },
    { href: "/notifications", icon: Bell, label: t.nav.notifications },
  ];

  const clientItems: NavItemDef[] = [
    { href: "/jobs/new", icon: PlusCircle, label: t.nav.publishAd },
    { href: "/jobs/return-trips", icon: RotateCcw, label: t.nav.returnTrips },
  ];

  const transporterItems: NavItemDef[] = [
    { href: "/jobs/browse", icon: Search, label: t.nav.findMission },
    { href: "/offers", icon: FileText, label: t.nav.myOffers },
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
    <aside className="hidden lg:flex flex-col w-64 bg-white border-r border-neutral-200 h-screen fixed left-0 top-0 pt-0 z-sidebar">
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
      <div className="px-4 py-2 border-t border-neutral-100 space-y-1">
        {bottomItems.map((item) => (
          <NavItem key={item.href} {...item} />
        ))}
      </div>

      {/* Footer */}
      <div className="px-4 py-4 border-t border-neutral-100">
        <Link href={`/profile/${user?.id || ""}`}>
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
