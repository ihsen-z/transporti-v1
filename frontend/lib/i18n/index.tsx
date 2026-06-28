"use client";

import { createContext, useContext, useState, useEffect, useCallback } from "react";
import { translations, type Locale, type TranslationKeys } from "./translations";

/* -------------------------------------------------------------------------- */
/*  Context                                                                    */
/* -------------------------------------------------------------------------- */

interface I18nContextType {
  locale: Locale;
  t: TranslationKeys;
  setLocale: (locale: Locale) => void;
  toggleLocale: () => void;
  dir: "ltr" | "rtl";
  isRTL: boolean;
}

const I18nContext = createContext<I18nContextType>({
  locale: "fr",
  t: translations.fr,
  setLocale: () => {},
  toggleLocale: () => {},
  dir: "ltr",
  isRTL: false,
});

export function useI18n() {
  return useContext(I18nContext);
}

/* -------------------------------------------------------------------------- */
/*  Provider                                                                   */
/* -------------------------------------------------------------------------- */

const STORAGE_KEY = "transporti-admin-locale";

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>("fr");
  const [loaded, setLoaded] = useState(false);

  // Load preference from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY) as Locale | null;
      if (saved && (saved === "fr" || saved === "ar")) {
        setLocaleState(saved);
      }
    } catch { /* ignore */ }
    setLoaded(true);
  }, []);

  // Apply dir attribute to html element when locale changes
  useEffect(() => {
    if (!loaded) return;
    const dir = translations[locale].dir;
    document.documentElement.setAttribute("dir", dir);
    document.documentElement.setAttribute("lang", locale);
  }, [locale, loaded]);

  const setLocale = useCallback((newLocale: Locale) => {
    setLocaleState(newLocale);
    localStorage.setItem(STORAGE_KEY, newLocale);
  }, []);

  const toggleLocale = useCallback(() => {
    const next = locale === "fr" ? "ar" : "fr";
    setLocale(next);
  }, [locale, setLocale]);

  const t = translations[locale] as TranslationKeys;
  const dir = t.dir;
  const isRTL = dir === "rtl";

  if (!loaded) return null;

  return (
    <I18nContext.Provider value={{ locale, t, setLocale, toggleLocale, dir, isRTL }}>
      {children}
    </I18nContext.Provider>
  );
}
