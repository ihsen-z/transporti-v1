import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { appStorage } from '@/core/storage/appStorage';

// Persistance du choix de langue, en LECTURE SYNCHRONE pour initialiser i18n
// (et le sens RTL) sans flash ni désynchronisation. Le stockage est délégué à
// MMKV via `appStorage`, qui couvre le natif comme le web.
// La lecture synchrone est indispensable : la langue conditionne
// I18nManager.forceRTL, qui doit être posé avant le premier rendu / au boot.
const LANG_KEY = 'transporti.lang';

export type AppLang = 'fr' | 'ar';

function toAppLang(value: string | null): AppLang | null {
  return value === 'fr' || value === 'ar' ? value : null;
}

// Migration ponctuelle : avant MMKV, la langue était rangée dans
// expo-secure-store (natif) ou localStorage (web). Sans cette relecture, une
// app déjà installée repartirait en FR — et en LTR — après la mise à jour.
// On recopie la valeur dans MMKV, puis on purge l'ancien emplacement.
// À noter : MMKV préfixe ses clés sur le web, il n'y a donc pas de collision
// avec l'ancienne entrée localStorage.
function migrateLegacyLang(): AppLang | null {
  if (Platform.OS === 'web') {
    if (typeof localStorage === 'undefined') return null;
    const legacy = toAppLang(localStorage.getItem(LANG_KEY));
    if (legacy === null) return null;
    appStorage.setString(LANG_KEY, legacy);
    localStorage.removeItem(LANG_KEY);
    return legacy;
  }

  const legacy = toAppLang(SecureStore.getItem(LANG_KEY));
  if (legacy === null) return null;
  appStorage.setString(LANG_KEY, legacy);
  // Purge au mieux : expo-secure-store n'offre pas de suppression synchrone, et
  // un échec est sans conséquence puisque MMKV fait désormais autorité.
  void SecureStore.deleteItemAsync(LANG_KEY).catch(() => undefined);
  return legacy;
}

export function getStoredLang(): AppLang | null {
  const stored = toAppLang(appStorage.getString(LANG_KEY));
  return stored ?? migrateLegacyLang();
}

export function setStoredLang(lang: AppLang): void {
  appStorage.setString(LANG_KEY, lang);
}
