"use client";

import { useTranslationContext } from "../lib/i18n/TranslationContext";
import { dictionaries, Locale } from "../lib/i18n/dictionaries";

export function useTranslation() {
  const { locale, setLocale } = useTranslationContext();
  
  const t = (key: string): string => {
    const dictionary = dictionaries[locale];
    if (dictionary && dictionary[key]) {
      return dictionary[key];
    }
    // Fallback to key if not found
    return key;
  };

  const isRtl = locale === "ar";

  return { t, locale, setLocale, isRtl };
}
