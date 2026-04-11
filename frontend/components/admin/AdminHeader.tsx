"use client";

import { Bell, Search, Shield, Activity } from "lucide-react";

interface AdminHeaderProps {
  title?: string;
}

export default function AdminHeader({
  title = "Admin Panel",
}: AdminHeaderProps) {
  return (
    <header className="lg:ml-64 fixed top-0 right-0 left-0 lg:left-64 h-16 bg-white border-b border-neutral-200 z-30">
      <div className="h-full px-6 flex items-center justify-between">
        {/* Left - Title */}
        <div className="flex items-center gap-4">
          <h1 className="text-xl font-bold text-neutral-800">{title}</h1>
          <div className="hidden md:flex items-center gap-2 px-3 py-1.5 bg-accent-50 text-accent-700 rounded-full text-sm">
            <Activity className="w-4 h-4" />
            <span className="font-medium">Système opérationnel</span>
          </div>
        </div>

        {/* Right - Actions */}
        <div className="flex items-center gap-4">
          {/* Search (placeholder) */}
          <div className="hidden md:flex items-center gap-2 px-4 py-2 bg-neutral-100 rounded-lg text-neutral-500">
            <Search className="w-4 h-4" />
            <span className="text-sm">Rechercher...</span>
          </div>

          {/* Notifications */}
          <button className="relative p-2 text-neutral-600 hover:bg-neutral-100 rounded-lg transition-colors">
            <Bell className="w-5 h-5" />
            <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
          </button>

          {/* Admin Badge */}
          <div className="flex items-center gap-2 px-3 py-1.5 bg-brand-600 text-white rounded-lg">
            <Shield className="w-4 h-4" />
            <span className="text-sm font-medium">Admin</span>
          </div>
        </div>
      </div>
    </header>
  );
}
