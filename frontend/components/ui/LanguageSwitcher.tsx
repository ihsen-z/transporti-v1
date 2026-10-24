"use client";

import { useAppI18n } from "@/lib/i18n/useAppI18n";
import { Globe } from "lucide-react";

/**
 * Compact language toggle button for the app header.
 * Switches between FR and AR.
 */
export default function LanguageSwitcher({
  surface = "light",
}: {
  /** `on-blue` = verre sur le bandeau bleu ; `light` = fond clair. */
  surface?: "light" | "on-blue";
}) {
  const { locale, toggleLocale, t } = useAppI18n();

  const surfaceClasses =
    surface === "on-blue"
      ? "bg-white/[0.16] border border-white/30 text-white hover:bg-white/[0.24]"
      : "bg-app border border-line text-ink-500 hover:border-line-strong hover:text-blue-700";

  return (
    <button
      onClick={toggleLocale}
      className={`flex h-10 items-center gap-1.5 rounded-chip px-3 text-[13px] font-semibold transition-colors duration-120 active:translate-y-px ${surfaceClasses}`}
      title={locale === "fr" ? "Passer à l'arabe" : "التبديل إلى الفرنسية"}
      aria-label="Switch language"
    >
      <Globe className="h-4 w-4" strokeWidth={2} />
      <span>{t.switchFlag}</span>
      <span className="hidden sm:inline">{t.switchLabel}</span>
    </button>
  );
}
