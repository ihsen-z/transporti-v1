"use client";

import { useState, useEffect } from "react";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Truck,
  Users,
  CreditCard,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  AlertTriangle,
  Star,
  ScrollText,
  Menu,
  X,
} from "lucide-react";
import { AdminSidebarLogo } from "../brand/TransportiLogo";
import { useI18n } from "@/lib/i18n/useAppI18n";

export default function AdminSidebar() {
  const pathname = usePathname();
  const { t, isRTL } = useI18n();
  const [mobileOpen, setMobileOpen] = useState(false);

  // Close mobile menu on route change
  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  const navItems = [
    {
      href: "/admin/dashboard",
      label: t.sidebar.dashboard,
      icon: LayoutDashboard,
    },
    { href: "/admin/jobs", label: t.sidebar.transports, icon: Truck },
    { href: "/admin/users", label: t.sidebar.users, icon: Users },
    { href: "/admin/payments", label: t.sidebar.payments, icon: CreditCard },
    {
      href: "/admin/verifications",
      label: t.sidebar.verifications,
      icon: ShieldCheck,
    },
    { href: "/admin/disputes", label: t.sidebar.disputes, icon: AlertTriangle },
    { href: "/admin/reviews", label: t.sidebar.reviews, icon: Star },
    { href: "/admin/audit-log", label: t.sidebar.auditLog, icon: ScrollText },
  ];

  const BackIcon = isRTL ? ChevronRight : ChevronLeft;

  const sidebarContent = (
    <>
      {/* Logo / Brand */}
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
                    ? `bg-white/15 text-white ${isRTL ? "border-r-2 border-accent-400" : "border-l-2 border-accent-400"}`
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
          <BackIcon className="w-4 h-4" />
          {t.sidebar.backToApp}
        </Link>
      </div>
    </>
  );

  return (
    <>
      {/* Mobile hamburger button */}
      <button
        onClick={() => setMobileOpen(true)}
        className={`lg:hidden fixed top-4 ${isRTL ? 'right-4' : 'left-4'} z-50 p-2 rounded-lg bg-brand-600 text-white shadow-lg hover:bg-brand-700 transition-colors`}
        aria-label="Open menu"
      >
        <Menu className="w-5 h-5" />
      </button>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/50 z-50 backdrop-blur-sm"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Mobile sidebar (slide-in) */}
      <aside
        className={`lg:hidden fixed top-0 h-screen w-64 bg-brand-600 dark:bg-[#0c1f4d] text-white z-[60] transition-transform duration-300 flex flex-col
          ${isRTL ? 'right-0' : 'left-0'}
          ${mobileOpen ? 'translate-x-0' : (isRTL ? 'translate-x-full' : '-translate-x-full')}
        `}
      >
        {/* Close button */}
        <button
          onClick={() => setMobileOpen(false)}
          className={`absolute top-4 ${isRTL ? 'left-4' : 'right-4'} p-2 rounded-lg hover:bg-white/10 transition-colors`}
          aria-label="Close menu"
        >
          <X className="w-5 h-5" />
        </button>
        {sidebarContent}
      </aside>

      {/* Desktop sidebar (always visible) */}
      <aside
        className={`hidden lg:flex flex-col fixed top-0 h-screen w-64 bg-brand-600 dark:bg-[#0c1f4d] text-white z-40 transition-colors duration-300 ${isRTL ? "right-0" : "left-0"}`}
      >
        {sidebarContent}
      </aside>
    </>
  );
}
