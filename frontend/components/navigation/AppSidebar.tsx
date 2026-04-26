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
  Briefcase,
  UserCircle,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import NavItem from "./NavItem";
import { SidebarLogo } from "@/components/brand/TransportiLogo";

export default function AppSidebar() {
  const { user } = useAuth();
  const role = user?.role?.toUpperCase();

  const commonItems = [
    { href: "/dashboard", icon: LayoutDashboard, label: "Tableau de bord" },
    {
      href: "/jobs",
      icon: Truck,
      label: role === "TRANSPORTER" ? "Mes Missions" : "Mes Transports",
    },
    { href: "/messages", icon: MessageSquare, label: "Messages" },
    { href: "/notifications", icon: Bell, label: "Notifications" },
  ];

  const clientItems = [
    { href: "/jobs/new", icon: PlusCircle, label: "Publier une annonce" },
  ];

  const transporterItems = [
    { href: "/jobs/browse", icon: Search, label: "Trouver une mission" },
    { href: "/offers", icon: FileText, label: "Mes offres" },
    { href: "/jobs/return-trip", icon: RotateCcw, label: "Trajet retour" },
    { href: "/verification", icon: ShieldCheck, label: "Vérification" },
  ];

  const bottomItems = [
    { href: "/help", icon: HelpCircle, label: "Centre d'aide" },
    { href: "/settings", icon: Settings, label: "Paramètres" },
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
            <p className="text-xs text-neutral-500 mb-1">
              Connecté en tant que
            </p>
            <p className="text-sm font-bold text-neutral-900 truncate">
              {user?.first_name || user?.name || "Utilisateur"}
            </p>
            <p className="text-xs text-brand-600 font-medium">
              {role === "TRANSPORTER"
                ? "Transporteur"
                : role === "CLIENT"
                  ? "Client"
                  : user?.role || "Guest"}
            </p>
          </div>
        </Link>
      </div>
    </aside>
  );
}
