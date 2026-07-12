import type { AppLocale } from "./locales/fr";

/*
 * Source de vérité de la locale hors React, pour que lib/format.ts (dates,
 * devise) reste sans dépendance React. Synchronisée par AppI18nProvider :
 * initialisée au module-load depuis localStorage, mise à jour au toggle.
 * Côté SSR il n'y a pas de localStorage → reste "fr" (langue par défaut),
 * cohérent avec le rendu serveur.
 */

const readInitial = (): AppLocale => {
  try {
    const saved = localStorage.getItem("transporti-app-locale");
    return saved === "ar" ? "ar" : "fr";
  } catch {
    return "fr";
  }
};

let current: AppLocale = typeof window !== "undefined" ? readInitial() : "fr";

export function getCurrentLocale(): AppLocale {
  return current;
}

export function setCurrentLocale(locale: AppLocale): void {
  current = locale;
}
