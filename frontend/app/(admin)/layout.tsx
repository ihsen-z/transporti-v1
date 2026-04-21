"use client";

import AdminSidebar from "@/components/admin/AdminSidebar";
import AdminHeader from "@/components/admin/AdminHeader";
import AuthGuard from "@/components/auth/AuthGuard";
import { ThemeProvider } from "@/components/admin/ThemeProvider";
import { I18nProvider, useI18n } from "@/lib/i18n";

function AdminLayoutInner({ children }: { children: React.ReactNode }) {
  const { isRTL } = useI18n();

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-[#0f172a] transition-colors duration-300">
      {/* Admin Sidebar */}
      <AdminSidebar />

      {/* Admin Header */}
      <AdminHeader />

      {/* Main Content — RTL: margin flips */}
      <main className={`pt-16 min-h-screen ${isRTL ? "lg:mr-64" : "lg:ml-64"}`}>
        <div className="p-6">{children}</div>
      </main>
    </div>
  );
}

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthGuard allowedRoles={["admin"]}>
      <ThemeProvider>
        <I18nProvider>
          <AdminLayoutInner>{children}</AdminLayoutInner>
        </I18nProvider>
      </ThemeProvider>
    </AuthGuard>
  );
}
