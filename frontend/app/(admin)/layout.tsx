"use client";

import AdminSidebar from "@/components/admin/AdminSidebar";
import AdminHeader from "@/components/admin/AdminHeader";
import AuthGuard from "@/components/auth/AuthGuard";
import { ThemeProvider } from "@/components/admin/ThemeProvider";

function AdminLayoutInner({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-[#0f172a] transition-colors duration-300">
      {/* Admin Sidebar */}
      <AdminSidebar />

      {/* Admin Header */}
      <AdminHeader />

      {/* Contenu principal — `ms-` est logique : elle suit le sens de lecture, comme la barre
          latérale. Un ternaire vers `me-` posait la marge à l'opposé de la
          barre en arabe, qui recouvrait alors le contenu. */}
      <main className="min-h-screen pt-16 lg:ms-64">
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
        <AdminLayoutInner>{children}</AdminLayoutInner>
      </ThemeProvider>
    </AuthGuard>
  );
}
