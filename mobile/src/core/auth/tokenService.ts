import * as SecureStore from 'expo-secure-store';

// Stockage sécurisé des JWT (Keychain iOS / Keystore Android via expo-secure-store).
// Les tokens sont des secrets : jamais de stockage non chiffré (règle sécurité).
const ACCESS_KEY = 'transporti.access';
const REFRESH_KEY = 'transporti.refresh';

export const tokenService = {
  getAccess(): Promise<string | null> {
    return SecureStore.getItemAsync(ACCESS_KEY);
  },
  getRefresh(): Promise<string | null> {
    return SecureStore.getItemAsync(REFRESH_KEY);
  },
  async setTokens(access: string, refresh: string): Promise<void> {
    await SecureStore.setItemAsync(ACCESS_KEY, access);
    await SecureStore.setItemAsync(REFRESH_KEY, refresh);
  },
  async clear(): Promise<void> {
    await SecureStore.deleteItemAsync(ACCESS_KEY);
    await SecureStore.deleteItemAsync(REFRESH_KEY);
  },
};
