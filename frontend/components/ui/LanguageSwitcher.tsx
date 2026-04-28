"use client";

import { useAppI18n } from "@/lib/i18n/useAppI18n";
import { Globe } from "lucide-react";

/**
 * Compact language toggle button for the app header.
 * Switches between FR and AR.
 */
export default function LanguageSwitcher() {
  const { locale, toggleLocale, t } = useAppI18n();

  return (
    <button
      onClick={toggleLocale}
      className="flex items-center gap-1.5 px-3 py-1.5 bg-neutral-100 hover:bg-neutral-200 rounded-full text-sm font-medium text-neutral-700 transition-all hover:scale-105 active:scale-95"
      title={locale === "fr" ? "Passer à l'arabe" : "التبديل إلى الفرنسية"}
      aria-label="Switch language"
    >
      <Globe className="w-4 h-4" />
      <span>{t.switchFlag}</span>
      <span className="hidden sm:inline">{t.switchLabel}</span>
    </button>
  );
}
