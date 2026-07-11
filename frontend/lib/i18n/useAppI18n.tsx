"use client";

import { createContext, useContext, useState, useEffect, useCallback } from "react";
import { fr, type AppLocale } from "./locales/fr";

export type { AppLocale };
// Union of both dictionaries (the `ar` import is type-only — erased at build
// time, so it does not defeat the code-splitting of the Arabic chunk).
export type AppTranslationKeys = typeof fr | typeof import("./locales/ar").ar;

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
  t: fr,
  setLocale: () => {},
  toggleLocale: () => {},
  dir: "ltr",
  isRTL: false,
});

export function useAppI18n() {
  return useContext(AppI18nContext);
}

/**
 * Compatibility shim for the admin section (ex-`useI18n` from lib/i18n/index).
 * Returns the same locale controls but scopes `t` to the `admin` namespace,
 * so admin components keep using `t.sidebar.*`, `t.header.*`, `t.langLabel`, etc.
 */
export function useI18n() {
  const ctx = useContext(AppI18nContext);
  return { ...ctx, t: (ctx.t as typeof fr).admin };
}

/* -------------------------------------------------------------------------- */
/*  Provider                                                                   */
/* -------------------------------------------------------------------------- */

const APP_LOCALE_KEY = "transporti-app-locale";

export function AppI18nProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<AppLocale>("fr");
  const [loaded, setLoaded] = useState(false);
  // `fr` is bundled statically (default language). `ar` is code-split and
  // loaded on demand, so French users never download the Arabic dictionary.
  const [dict, setDict] = useState<AppTranslationKeys>(fr);

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

  // Load the active dictionary (dynamic import for `ar`)
  useEffect(() => {
    let active = true;
    if (locale === "ar") {
      import("./locales/ar").then((m) => {
        if (active) setDict(m.ar);
      });
    } else {
      setDict(fr);
    }
    return () => { active = false; };
  }, [locale]);

  // Apply dir attribute to html element when the dictionary changes
  useEffect(() => {
    if (!loaded) return;
    document.documentElement.setAttribute("dir", dict.dir);
    document.documentElement.setAttribute("lang", locale);
  }, [locale, loaded, dict]);

  const setLocale = useCallback((newLocale: AppLocale) => {
    setLocaleState(newLocale);
    try {
      localStorage.setItem(APP_LOCALE_KEY, newLocale);
    } catch { /* ignore */ }
  }, []);

  const toggleLocale = useCallback(() => {
    setLocaleState((prev) => {
      const next = prev === "fr" ? "ar" : "fr";
      try { localStorage.setItem(APP_LOCALE_KEY, next); } catch { /* ignore */ }
      return next;
    });
  }, []);

  const dir = dict.dir as "ltr" | "rtl";
  const isRTL = dir === "rtl";

  if (!loaded) return null;

  return (
    <AppI18nContext.Provider value={{ locale, t: dict, setLocale, toggleLocale, dir, isRTL }}>
      {children}
    </AppI18nContext.Provider>
  );
}
