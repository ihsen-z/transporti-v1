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
  Heart,
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
  const favorisItem: NavItemDef = {
    href: "/favoris",
    icon: Heart,
    label: t.favorites.title,
  };

  const transporterItems: NavItemDef[] = [
    {
      href: "/retours",
      icon: RotateCcw,
      label: t.header.pageTitles.returns,
    },
    {
      href: "/demandes-recues",
      icon: Inbox,
      label: t.header.pageTitles.receivedRequests,
    },
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
    mainItems = [
      ...clientItems,
      ...mainItems,
      { href: "/portefeuille", icon: Wallet, label: t.nav.wallet },
      favorisItem,
      avisItem,
    ];
  } else if (role === "TRANSPORTER") {
    mainItems = [...mainItems, ...transporterItems, avisItem];
  }

  return (
    <aside
      className={`fixed top-0 z-sidebar hidden h-screen w-64 flex-col bg-surface lg:flex dark:bg-neutral-900 ${
        isRTL
          ? "right-0 border-s border-line dark:border-neutral-800"
          : "left-0 border-e border-line dark:border-neutral-800"
      }`}
    >
      {/* Zone logo — même hauteur que la barre haute (64px) */}
      <div className="flex h-16 items-center overflow-hidden border-b border-line px-5">
        <Link href="/dashboard">
          <SidebarLogo />
        </Link>
      </div>

      {/* Navigation principale — pile en flex, jamais de marges empilées */}
      <nav className="flex flex-1 flex-col gap-1 overflow-y-auto px-3 py-5">
        {mainItems.map((item) => (
          <NavItem key={item.href} {...item} />
        ))}
      </nav>

      {/* Navigation basse */}
      <div className="flex flex-col gap-1 border-t border-line px-3 py-2 dark:border-neutral-800">
        {bottomItems.map((item) => (
          <NavItem key={item.href} {...item} />
        ))}
        {/* Le sélecteur de thème a été retiré des écrans métier le 26/08/2026 :
            app/(app) ne porte aucun style `dark:`, donc activer le thème sombre
            y produisait une interface hybride (barre latérale sombre, contenu
            clair). Le mode sombre reste actif et réellement stylé en zone
            d'administration. Voir
            docs/PLAN_ACTION_MISE_A_NIVEAU_WEB_2026-08-26.md, lot 0.3. */}
      </div>

      {/* Pied — identité de la session */}
      <div className="border-t border-line px-3 py-3">
        <Link
          href="/compte"
          className="block rounded-tile bg-app px-3.5 py-3 transition-colors duration-120 hover:bg-blue-50"
        >
          <p className="text-[11.5px] font-semibold text-ink-300">
            {t.nav.connectedAs}
          </p>
          <p className="truncate text-[14.5px] font-bold text-ink-900">
            {user?.first_name || user?.name || t.nav.user}
          </p>
          <p className="text-[11.5px] font-semibold text-blue-600">
            {role === "TRANSPORTER"
              ? t.nav.transporter
              : role === "CLIENT"
                ? t.nav.client
                : user?.role || "Guest"}
          </p>
        </Link>
      </div>
    </aside>
  );
}
