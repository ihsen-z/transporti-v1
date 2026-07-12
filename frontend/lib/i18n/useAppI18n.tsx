"use client";

import { createContext, useContext, useState, useEffect, useCallback } from "react";
import { fr, type AppLocale } from "./locales/fr";
import { setCurrentLocale } from "./currentLocale";

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

// Lecture synchrone de la préférence, pour un rendu initial correct sans flash
// (le script inline de app/layout.tsx a déjà posé lang/dir avant le paint).
// Le dictionnaire initial reste `fr` même en `ar` : le chunk `ar` est chargé
// en async dans l'effet ci-dessous, donc aucun rendu ne dépend de `locale`
// seul → pas de mismatch d'hydratation.
function readSavedLocale(): AppLocale {
  try {
    const saved = localStorage.getItem(APP_LOCALE_KEY);
    return saved === "ar" ? "ar" : "fr";
  } catch {
    return "fr";
  }
}

export function AppI18nProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<AppLocale>("fr");
  // `fr` is bundled statically (default language). `ar` is code-split and
  // loaded on demand, so French users never download the Arabic dictionary.
  const [dict, setDict] = useState<AppTranslationKeys>(fr);

  // Read the persisted preference once, after mount (SSR-safe).
  useEffect(() => {
    const saved = readSavedLocale();
    if (saved !== "fr") setLocaleState(saved);
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

  // Apply dir/lang + sync the non-React locale (lib/format.ts) on every change.
  useEffect(() => {
    document.documentElement.setAttribute("dir", dict.dir);
    document.documentElement.setAttribute("lang", locale);
    setCurrentLocale(locale);
  }, [locale, dict]);

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

  return (
    <AppI18nContext.Provider value={{ locale, t: dict, setLocale, toggleLocale, dir, isRTL }}>
      {children}
    </AppI18nContext.Provider>
  );
}
