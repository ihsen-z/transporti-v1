import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';

// Stockage sécurisé des JWT (Keychain iOS / Keystore Android via expo-secure-store).
// Les tokens sont des secrets : jamais de stockage non chiffré (règle sécurité).
// Sur le web, fallback vers localStorage (pas de SecureStore disponible).
const ACCESS_KEY = 'transporti.access';
const REFRESH_KEY = 'transporti.refresh';

const isWeb = Platform.OS === 'web';

export const tokenService = {
  async getAccess(): Promise<string | null> {
    if (isWeb) return localStorage.getItem(ACCESS_KEY);
    return SecureStore.getItemAsync(ACCESS_KEY);
  },
  async getRefresh(): Promise<string | null> {
    if (isWeb) return localStorage.getItem(REFRESH_KEY);
    return SecureStore.getItemAsync(REFRESH_KEY);
  },
  async setTokens(access: string, refresh: string): Promise<void> {
    if (isWeb) {
      localStorage.setItem(ACCESS_KEY, access);
      localStorage.setItem(REFRESH_KEY, refresh);
      return;
    }
    await SecureStore.setItemAsync(ACCESS_KEY, access);
    await SecureStore.setItemAsync(REFRESH_KEY, refresh);
  },
  async clear(): Promise<void> {
    if (isWeb) {
      localStorage.removeItem(ACCESS_KEY);
      localStorage.removeItem(REFRESH_KEY);
      return;
    }
    await SecureStore.deleteItemAsync(ACCESS_KEY);
    await SecureStore.deleteItemAsync(REFRESH_KEY);
  },
};
