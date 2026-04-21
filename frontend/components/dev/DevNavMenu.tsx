"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Menu,
  X,
  Home,
  LogIn,
  UserPlus,
  KeyRound,
  LayoutDashboard,
  Truck,
  Search,
  PlusCircle,
  RotateCcw,
  Send,
  MessageSquare,
  Bell,
  Settings,
  HelpCircle,
  Shield,
  FileText,
  Scale,
  Eye,
  UserCircle,
  ShieldCheck,
  Users,
  Briefcase,
  CreditCard,
  Star,
  AlertTriangle,
  Lock,
  ChevronDown,
  ChevronRight,
} from "lucide-react";

/* -------------------------------------------------------------------------- */
/*  Route Map — Grouped by Section                                             */
/* -------------------------------------------------------------------------- */

interface RouteItem {
  path: string;
  label: string;
  icon: React.ElementType;
  dynamic?: boolean; // contains [id] or [userId]
}

interface RouteGroup {
  title: string;
  color: string;
  bg: string;
  routes: RouteItem[];
}

const ROUTE_MAP: RouteGroup[] = [
  {
    title: "🏠 Public",
    color: "text-emerald-400",
    bg: "bg-emerald-500/10",
    routes: [
      { path: "/", label: "Landing Page", icon: Home },
      { path: "/access-denied", label: "Accès refusé", icon: Lock },
    ],
  },
  {
    title: "🔑 Authentification",
    color: "text-amber-400",
    bg: "bg-amber-500/10",
    routes: [
      { path: "/login", label: "Connexion", icon: LogIn },
      { path: "/register", label: "Inscription", icon: UserPlus },
      {
        path: "/forgot-password",
        label: "Mot de passe oublié",
        icon: KeyRound,
      },
      { path: "/reset-password", label: "Réinitialiser MDP", icon: KeyRound },
    ],
  },
  {
    title: "📊 Application — Client/Transporteur",
    color: "text-blue-400",
    bg: "bg-blue-500/10",
    routes: [
      { path: "/dashboard", label: "Tableau de bord", icon: LayoutDashboard },
      { path: "/jobs", label: "Mes Transports", icon: Truck },
      { path: "/jobs/browse", label: "Parcourir les offres", icon: Search },
      { path: "/jobs/new", label: "Nouvelle annonce", icon: PlusCircle },
      { path: "/jobs/1", label: "Détail Job #1", icon: Eye, dynamic: true },
      { path: "/jobs/return-trip", label: "Trajet retour", icon: RotateCcw },
      { path: "/offers", label: "Mes Offres", icon: Send },
      { path: "/messages", label: "Messages", icon: MessageSquare },
      { path: "/notifications", label: "Notifications", icon: Bell },
      { path: "/disputes", label: "Litiges", icon: Scale },
      { path: "/settings", label: "Paramètres", icon: Settings },
      { path: "/help", label: "Centre d'aide", icon: HelpCircle },
      { path: "/verification", label: "Vérification", icon: ShieldCheck },
      { path: "/privacy", label: "Politique de confidentialité", icon: Shield },
      { path: "/terms", label: "Conditions d'utilisation", icon: FileText },
    ],
  },
  {
    title: "👤 Profils",
    color: "text-purple-400",
    bg: "bg-purple-500/10",
    routes: [
      {
        path: "/profile/3",
        label: "Profil Transporteur #3",
        icon: UserCircle,
        dynamic: true,
      },
      {
        path: "/transporter/3",
        label: "Détail Transporteur #3",
        icon: Truck,
        dynamic: true,
      },
    ],
  },
  {
    title: "⚙️ Admin Panel",
    color: "text-red-400",
    bg: "bg-red-500/10",
    routes: [
      { path: "/admin", label: "Admin — Accueil", icon: Shield },
      {
        path: "/admin/dashboard",
        label: "Admin — Dashboard",
        icon: LayoutDashboard,
      },
      { path: "/admin/users", label: "Admin — Utilisateurs", icon: Users },
      { path: "/admin/jobs", label: "Admin — Jobs", icon: Briefcase },
      { path: "/admin/payments", label: "Admin — Paiements", icon: CreditCard },
      { path: "/admin/reviews", label: "Admin — Avis", icon: Star },
      {
        path: "/admin/disputes",
        label: "Admin — Litiges",
        icon: AlertTriangle,
      },
      {
        path: "/admin/verifications",
        label: "Admin — Vérifications",
        icon: ShieldCheck,
      },
    ],
  },
];

/* -------------------------------------------------------------------------- */
/*  Component                                                                  */
/* -------------------------------------------------------------------------- */

export function DevNavMenu() {
  const [isOpen, setIsOpen] = useState(false);
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const pathname = usePathname();

  const toggleGroup = (title: string) => {
    setCollapsed((prev) => ({ ...prev, [title]: !prev[title] }));
  };

  const totalRoutes = ROUTE_MAP.reduce((acc, g) => acc + g.routes.length, 0);

  return (
    <>
      {/* ── FAB Button ── */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-5 right-5 z-[9999] w-14 h-14 rounded-full shadow-2xl flex items-center justify-center transition-all duration-300 hover:scale-110 active:scale-95"
        style={{
          background: isOpen
            ? "linear-gradient(135deg, #EF4444, #DC2626)"
            : "linear-gradient(135deg, #F97316, #EA580C)",
        }}
        title="🧪 Dev Navigation (provisoire)"
      >
        {isOpen ? (
          <X className="w-6 h-6 text-white" />
        ) : (
          <Menu className="w-6 h-6 text-white" />
        )}
      </button>

      {/* ── Overlay ── */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[9998]"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* ── Menu Panel ── */}
      <div
        className={`fixed top-0 right-0 h-full w-[360px] max-w-[90vw] z-[9999] transform transition-transform duration-300 ease-out ${
          isOpen ? "translate-x-0" : "translate-x-full"
        }`}
        style={{
          background: "linear-gradient(180deg, #0F172A 0%, #1E293B 100%)",
        }}
      >
        {/* Header */}
        <div className="px-5 pt-5 pb-4 border-b border-white/10">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                🧪 Dev Navigator
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                {totalRoutes} pages • Menu provisoire de test
              </p>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center transition-colors"
            >
              <X className="w-4 h-4 text-slate-400" />
            </button>
          </div>

          {/* Current Path indicator */}
          <div className="mt-3 px-3 py-2 rounded-lg bg-white/5 border border-white/10">
            <p className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold">
              Page actuelle
            </p>
            <p className="text-sm text-cyan-400 font-mono mt-0.5 truncate">
              {pathname || "/"}
            </p>
          </div>
        </div>

        {/* Routes List */}
        <div className="overflow-y-auto h-[calc(100%-140px)] px-3 py-3 space-y-1">
          {ROUTE_MAP.map((group) => {
            const isCollapsed = collapsed[group.title] ?? false;
            return (
              <div key={group.title} className="mb-2">
                {/* Group Header */}
                <button
                  onClick={() => toggleGroup(group.title)}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-lg ${group.bg} transition-colors hover:opacity-90`}
                >
                  <span
                    className={`text-xs font-bold uppercase tracking-wider ${group.color}`}
                  >
                    {group.title}
                    <span className="ml-2 text-[10px] opacity-60">
                      ({group.routes.length})
                    </span>
                  </span>
                  {isCollapsed ? (
                    <ChevronRight
                      className={`w-4 h-4 ${group.color} opacity-60`}
                    />
                  ) : (
                    <ChevronDown
                      className={`w-4 h-4 ${group.color} opacity-60`}
                    />
                  )}
                </button>

                {/* Route Items */}
                {!isCollapsed && (
                  <div className="mt-1 space-y-0.5">
                    {group.routes.map((route) => {
                      const isActive = pathname === route.path;
                      const Icon = route.icon;
                      return (
                        <Link
                          key={route.path}
                          href={route.path}
                          onClick={() => setIsOpen(false)}
                          className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all group ${
                            isActive
                              ? "bg-white/10 text-white font-semibold"
                              : "text-slate-300 hover:bg-white/5 hover:text-white"
                          }`}
                        >
                          <Icon
                            className={`w-4 h-4 flex-shrink-0 ${
                              isActive
                                ? "text-cyan-400"
                                : "text-slate-500 group-hover:text-slate-300"
                            }`}
                          />
                          <span className="truncate">{route.label}</span>
                          {route.dynamic && (
                            <span className="ml-auto text-[9px] px-1.5 py-0.5 rounded bg-orange-500/20 text-orange-400 font-mono">
                              [id]
                            </span>
                          )}
                          {isActive && (
                            <span className="ml-auto w-1.5 h-1.5 rounded-full bg-cyan-400 flex-shrink-0" />
                          )}
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="absolute bottom-0 left-0 right-0 px-5 py-3 border-t border-white/10 bg-slate-900/80 backdrop-blur">
          <p className="text-[10px] text-slate-500 text-center">
            ⚠️ Composant provisoire — supprimer avant production
          </p>
        </div>
      </div>
    </>
  );
}
