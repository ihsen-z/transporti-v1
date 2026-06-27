import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

const isWeb = Platform.OS === 'web';
const memoryStorage: Record<string, string> = {};
console.log('[secureStore] Environment:', { OS: Platform.OS, isWeb });

export const secureStorage = {
  setItem: async (key: string, value: string): Promise<void> => {
    if (isWeb) {
      try {
        localStorage.setItem(key, value);
      } catch (e: any) {
        console.error(`[secureStore] setItem failed for ${key}:`, e.message || String(e));
        memoryStorage[key] = value;
      }
      return;
    }
    await SecureStore.setItemAsync(key, value);
  },
  getItem: async (key: string): Promise<string | null> => {
    if (isWeb) {
      try {
        return localStorage.getItem(key);
      } catch (e: any) {
        console.error(`[secureStore] getItem failed for ${key}:`, e.message || String(e));
        return memoryStorage[key] || null;
      }
    }
    return await SecureStore.getItemAsync(key);
  },
  removeItem: async (key: string): Promise<void> => {
    if (isWeb) {
      try {
        localStorage.removeItem(key);
      } catch (e) {
        delete memoryStorage[key];
      }
      return;
    }
    await SecureStore.deleteItemAsync(key);
  },
};
