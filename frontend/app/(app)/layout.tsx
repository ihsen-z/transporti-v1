"use client";

import AppSidebar from "@/components/navigation/AppSidebar";
import AppHeader from "@/components/navigation/AppHeader";
import BottomNav from "@/components/navigation/BottomNav";
import TrustFooter from "@/components/layout/TrustFooter";
import AuthGuard from "@/components/auth/AuthGuard";
import DocumentTitle from "@/components/layout/DocumentTitle";
import { useAppI18n } from "@/lib/i18n/useAppI18n";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { isRTL } = useAppI18n();
  const sidebarMargin = isRTL ? "lg:me-64" : "lg:ms-64";

  return (
    <AuthGuard allowedRoles={["client", "transporter", "admin"]}>
      <DocumentTitle />
      <div className="min-h-screen bg-neutral-50 flex flex-col">
        {/* Desktop Sidebar */}
        <AppSidebar />

        {/* App Header */}
        <AppHeader />

        {/* Main Content */}
        <main className={`${sidebarMargin} pt-16 pb-20 lg:pb-0 flex-1`}>
          {children}
        </main>

        {/* Trust Footer (Desktop) */}
        <div className={`${sidebarMargin} hidden lg:block`}>
          <TrustFooter />
        </div>

        {/* Mobile Bottom Navigation */}
        <BottomNav />
      </div>
    </AuthGuard>
  );
}
