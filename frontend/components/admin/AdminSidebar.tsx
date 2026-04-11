"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Truck,
  Users,
  CreditCard,
  ChevronLeft,
  ShieldCheck,
  AlertTriangle,
  Star,
} from "lucide-react";
import { AdminSidebarLogo } from "../brand/TransportiLogo";

const navItems = [
  { href: "/admin/dashboard", label: "Tableau de bord", icon: LayoutDashboard },
  { href: "/admin/jobs", label: "Transports", icon: Truck },
  { href: "/admin/users", label: "Utilisateurs", icon: Users },
  { href: "/admin/payments", label: "Paiements", icon: CreditCard },
  { href: "/admin/verifications", label: "Vérifications", icon: ShieldCheck },
  { href: "/admin/disputes", label: "Litiges", icon: AlertTriangle },
  { href: "/admin/reviews", label: "Avis", icon: Star },
];

export default function AdminSidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden lg:flex flex-col fixed left-0 top-0 h-screen w-64 bg-brand-600 text-white z-40">
      {/* Logo / Brand — official Transporti logo on white pill */}
      <div className="p-6 border-b border-white/10">
        <AdminSidebarLogo />
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-1">
        {navItems.map((item) => {
          const isActive =
            pathname === item.href || pathname.startsWith(item.href + "/");
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`
                                flex items-center gap-3 px-4 py-3 rounded-lg font-medium transition-all
                                ${
                                  isActive
                                    ? "bg-white/15 text-white border-l-2 border-accent-400"
                                    : "text-white/60 hover:bg-white/5 hover:text-white"
                                }
                            `}
            >
              <item.icon className="w-5 h-5" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-white/10">
        <Link
          href="/dashboard"
          className="flex items-center gap-2 text-sm text-white/50 hover:text-white transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
          Retour à l&apos;app
        </Link>
      </div>
    </aside>
  );
}
