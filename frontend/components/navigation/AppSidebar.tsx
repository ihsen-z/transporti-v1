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
  BarChart3,
  Star,
  Inbox,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { RETURN_TRIPS_FIRST } from "@/lib/flags";
import NavItem from "./NavItem";
import { SidebarLogo } from "@/components/brand/TransportiLogo";
import { useAppI18n } from "@/lib/i18n/useAppI18n";
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
    { href: "/litiges", icon: AlertTriangle, label: t.nav.disputes },
  ];

  // RETURN_TRIPS_FIRST (pivot): searching an existing trip is the primary
  // client action; publishing a classic request is the fallback.
  const clientItems: NavItemDef[] = RETURN_TRIPS_FIRST
    ? [
        { href: "/recherche", icon: Search, label: t.nav.findTrip },
        {
          href: "/demandes/nouvelle",
          icon: PlusCircle,
          label: t.nav.publishAd,
        },
      ]
    : [
        {
          href: "/demandes/nouvelle",
          icon: PlusCircle,
          label: t.nav.publishAd,
        },
        {
          href: "/recherche",
          icon: RotateCcw,
          label: t.nav.returnTrips,
        },
      ];

  // Le retour passe en tête (IA-2) : c'est la racine du transporteur, pas une
  // entrée parmi d'autres. « Compléter mon aller » (/demandes) devient
  // secondaire, conformément au pivot.
  const transporterItems: NavItemDef[] = [
    { href: "/retours", icon: RotateCcw, label: "Mes retours" },
    { href: "/demandes-recues", icon: Inbox, label: "Demandes reçues" },
    { href: "/retours/nouveau", icon: PlusCircle, label: t.nav.returnTrip },
    { href: "/demandes", icon: Search, label: t.nav.findMission },
    { href: "/mes-offres", icon: FileText, label: t.nav.myOffers },
    { href: "/portefeuille", icon: Wallet, label: t.nav.wallet },
    // T5.4 — B-3b avait ete livre au lot 1 sans aucun ecran pour le lire.
    { href: "/performance", icon: BarChart3, label: t.performance.title },
    { href: "/documents", icon: ShieldCheck, label: t.nav.verification },
  ];

  // C5.2 — les avis concernent les DEUX roles : chacun en recoit.
  const avisItem: NavItemDef = {
    href: "/mes-avis",
    icon: Star,
    label: t.myReviews.title,
  };

  const bottomItems: NavItemDef[] = [
    { href: "/help", icon: HelpCircle, label: t.nav.helpCenter },
    { href: "/compte", icon: Settings, label: t.nav.settings },
  ];

  let mainItems = [...commonItems];
  if (role === "CLIENT") {
    mainItems = [...clientItems, ...mainItems, avisItem];
  } else if (role === "TRANSPORTER") {
    mainItems = [...mainItems, ...transporterItems, avisItem];
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
        {/* Le sélecteur de thème a été retiré des écrans métier le 26/08/2026 :
            app/(app) et app/(marketing) ne portent aucun style `dark:`, donc
            activer le thème sombre y produisait une interface hybride (barre
            latérale sombre, contenu clair). Le mode sombre reste actif et
            réellement stylé en zone d'administration. Voir
            docs/PLAN_ACTION_MISE_A_NIVEAU_WEB_2026-08-26.md, lot 0.3. */}
      </div>

      {/* Footer */}
      <div className="px-4 py-4 border-t border-neutral-100">
        <Link href="/compte">
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
