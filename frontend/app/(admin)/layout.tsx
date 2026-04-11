"use client";

import AdminSidebar from "@/components/admin/AdminSidebar";
import AdminHeader from "@/components/admin/AdminHeader";
import AuthGuard from "@/components/auth/AuthGuard";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthGuard allowedRoles={["admin"]}>
      <div className="min-h-screen bg-neutral-50">
        {/* Admin Sidebar */}
        <AdminSidebar />

        {/* Admin Header */}
        <AdminHeader />

        {/* Main Content */}
        <main className="lg:ml-64 pt-16 min-h-screen">
          <div className="p-6">{children}</div>
        </main>
      </div>
    </AuthGuard>
  );
}
