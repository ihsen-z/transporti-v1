"use client";

import { createContext, useContext, useState, useEffect, useCallback } from "react";
import { appTranslations, type AppLocale, type AppTranslationKeys } from "./app-translations";

/* -------------------------------------------------------------------------- */
/*  Context                                                                    */
/* -------------------------------------------------------------------------- */

interface AppI18nContextType {
  locale: AppLocale;
  t: AppTranslationKeys;
  setLocale: (locale: AppLocale) => void;
  toggleLocale: () => void;
  dir: "ltr" | "rtl";
  isRTL: boolean;
}

const AppI18nContext = createContext<AppI18nContextType>({
  locale: "fr",
  t: appTranslations.fr,
  setLocale: () => {},
  toggleLocale: () => {},
  dir: "ltr",
  isRTL: false,
});

export function useAppI18n() {
  return useContext(AppI18nContext);
}

/* -------------------------------------------------------------------------- */
/*  Provider                                                                   */
/* -------------------------------------------------------------------------- */

const APP_LOCALE_KEY = "transporti-app-locale";

export function AppI18nProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<AppLocale>("fr");
  const [loaded, setLoaded] = useState(false);

  // Load preference from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem(APP_LOCALE_KEY) as AppLocale | null;
      if (saved && (saved === "fr" || saved === "ar")) {
        setLocaleState(saved);
      }
    } catch { /* ignore SSR */ }
    setLoaded(true);
  }, []);

  // Apply dir attribute to html element when locale changes
  useEffect(() => {
    if (!loaded) return;
    const dir = appTranslations[locale].dir;
    document.documentElement.setAttribute("dir", dir);
    document.documentElement.setAttribute("lang", locale);
  }, [locale, loaded]);

  const setLocale = useCallback((newLocale: AppLocale) => {
    setLocaleState(newLocale);
    try {
      localStorage.setItem(APP_LOCALE_KEY, newLocale);
    } catch { /* ignore */ }
  }, []);

  const toggleLocale = useCallback(() => {
    const next = locale === "fr" ? "ar" : "fr";
    setLocale(next);
  }, [locale, setLocale]);

  const t = appTranslations[locale] as AppTranslationKeys;
  const dir = t.dir as "ltr" | "rtl";
  const isRTL = dir === "rtl";

  if (!loaded) return null;

  return (
    <AppI18nContext.Provider value={{ locale, t, setLocale, toggleLocale, dir, isRTL }}>
      {children}
    </AppI18nContext.Provider>
  );
}
