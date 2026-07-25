import { Platform } from 'react-native';

// Persistance du choix de langue. Lecture SYNCHRONE sur web (localStorage) pour
// initialiser i18n sans flash. Sur natif, la persistance synchrone arrivera avec
// MMKV (différé) : on retourne null -> langue de l'appareil par défaut.
const LANG_KEY = 'transporti.lang';

export type AppLang = 'fr' | 'ar';

// Ce module est évalué au chargement (init i18n). Le web statique d'Expo
// prérend côté Node où `localStorage` n'existe pas -> on garde l'accès derrière
// `typeof` pour ne pas casser le prerender.
const hasLocalStorage = typeof localStorage !== 'undefined';

export function getStoredLang(): AppLang | null {
  if (Platform.OS === 'web' && hasLocalStorage) {
    const v = localStorage.getItem(LANG_KEY);
    return v === 'fr' || v === 'ar' ? v : null;
  }
  return null;
}

export function setStoredLang(lang: AppLang): void {
  if (Platform.OS === 'web' && hasLocalStorage) {
    localStorage.setItem(LANG_KEY, lang);
  }
  // Natif : persistance différée (MMKV, S1).
}
