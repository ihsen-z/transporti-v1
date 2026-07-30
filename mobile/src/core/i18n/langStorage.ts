import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';

// Persistance du choix de langue, en LECTURE SYNCHRONE pour initialiser i18n
// (et le sens RTL) sans flash ni désynchronisation :
//   - web    : localStorage
//   - natif  : expo-secure-store API synchrone (getItem/setItem, SDK 52+)
// La lecture synchrone est indispensable : la langue conditionne
// I18nManager.forceRTL, qui doit être posé avant le premier rendu / au boot.
const LANG_KEY = 'transporti.lang';

export type AppLang = 'fr' | 'ar';

// Ce module est évalué au chargement (init i18n). Le web statique d'Expo
// prérend côté Node où `localStorage` n'existe pas -> on garde l'accès derrière
// `typeof` pour ne pas casser le prerender.
const hasLocalStorage = typeof localStorage !== 'undefined';

export function getStoredLang(): AppLang | null {
  let v: string | null = null;
  if (Platform.OS === 'web') {
    v = hasLocalStorage ? localStorage.getItem(LANG_KEY) : null;
  } else {
    v = SecureStore.getItem(LANG_KEY);
  }
  return v === 'fr' || v === 'ar' ? v : null;
}

export function setStoredLang(lang: AppLang): void {
  if (Platform.OS === 'web') {
    if (hasLocalStorage) localStorage.setItem(LANG_KEY, lang);
    return;
  }
  SecureStore.setItem(LANG_KEY, lang);
}
