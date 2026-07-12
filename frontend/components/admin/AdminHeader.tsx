"use client";

import {
  Bell,
  Search,
  Shield,
  Activity,
  Moon,
  Sun,
  Languages,
} from "lucide-react";
import { useTheme } from "./ThemeProvider";
import { useI18n } from "@/lib/i18n/useAppI18n";

interface AdminHeaderProps {
  title?: string;
}

export default function AdminHeader({
  title = "Admin Panel",
}: AdminHeaderProps) {
  const { isDark, toggleTheme } = useTheme();
  const { t, locale, toggleLocale, isRTL } = useI18n();

  return (
    <header
      className={`fixed top-0 h-16 bg-white dark:bg-[#1e293b] border-b border-neutral-200 dark:border-neutral-700 z-30 transition-colors duration-300 ${
        isRTL
          ? "lg:me-64 left-0 right-0 lg:right-64"
          : "lg:ms-64 left-0 right-0 lg:left-64"
      }`}
    >
      <div className="h-full px-6 flex items-center justify-between">
        {/* Left - Title */}
        <div className="flex items-center gap-4">
          <h1 className="text-xl font-bold text-neutral-800 dark:text-neutral-100">
            {title}
          </h1>
          <div className="hidden md:flex items-center gap-2 px-3 py-1.5 bg-accent-50 dark:bg-accent-900/30 text-accent-700 dark:text-accent-400 rounded-full text-sm">
            <Activity className="w-4 h-4" />
            <span className="font-medium">{t.header.systemOk}</span>
          </div>
        </div>

        {/* Right - Actions */}
        <div className="flex items-center gap-3">
          {/* Search (placeholder) */}
          <div className="hidden md:flex items-center gap-2 px-4 py-2 bg-neutral-100 dark:bg-neutral-800 rounded-lg text-neutral-500 dark:text-neutral-400">
            <Search className="w-4 h-4" />
            <span className="text-sm">{t.header.search}</span>
          </div>

          {/* Language Toggle */}
          <button
            onClick={toggleLocale}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg transition-all duration-300 hover:scale-105 active:scale-95
              bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300
              hover:bg-neutral-200 dark:hover:bg-neutral-700 text-sm font-medium"
            title={`Basculer vers: ${t.langLabel}`}
          >
            <Languages className="w-4 h-4" />
            <span className="hidden sm:inline">
              {locale === "fr" ? "FR" : "AR"}
            </span>
          </button>

          {/* Dark Mode Toggle */}
          <button
            onClick={toggleTheme}
            className="p-2 rounded-lg transition-all duration-300 hover:scale-105 active:scale-95
              bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-amber-400
              hover:bg-neutral-200 dark:hover:bg-neutral-700"
            title={isDark ? "Mode clair" : "Mode sombre"}
          >
            {isDark ? (
              <Sun className="w-5 h-5" />
            ) : (
              <Moon className="w-5 h-5" />
            )}
          </button>

          {/* Notifications */}
          <button className="relative p-2 text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-lg transition-colors">
            <Bell className="w-5 h-5" />
            <span className="absolute top-1 end-1 w-2 h-2 bg-red-500 rounded-full"></span>
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
