import { Platform } from 'react-native';
import { secureStorage } from './secureStore';

let storage: any = null;
let isNativeMMKVAvailable = false;

// Try to dynamically load react-native-mmkv to avoid crashes in environments where native modules aren't linked (like Expo Go or Web)
if (Platform.OS !== 'web') {
  try {
    const { createMMKV } = require('react-native-mmkv');
    storage = createMMKV({
      id: 'transporti-storage',
    });
    isNativeMMKVAvailable = true;
  } catch (e) {
    console.warn('react-native-mmkv is not available in Expo Go. Falling back to secureStorage with sync memory cache.');
  }
}

// Synchronous in-memory cache for environments without native MMKV
const memoryStorage: Record<string, string> = {};

// Preload common keys from secureStorage into the sync memory cache at startup
const keysToPreload = ['user', 'offline_queue', 'auth_user'];
if (!isNativeMMKVAvailable) {
  keysToPreload.forEach((key) => {
    secureStorage.getItem(key)
      .then((value) => {
        if (value !== null) {
          memoryStorage[key] = value;
        }
      })
      .catch((err) => {
        console.error(`Failed to preload key ${key} from secureStorage`, err);
      });
  });
}

const isWeb = Platform.OS === 'web';

export const mmkvStorage = {
  setItem: (key: string, value: string) => {
    if (isNativeMMKVAvailable && storage) {
      storage.set(key, value);
    } else if (isWeb) {
      try {
        localStorage.setItem(key, value);
      } catch (e) {
        memoryStorage[key] = value;
      }
    } else {
      memoryStorage[key] = value;
      // Persist asynchronously to secureStorage in the background
      secureStorage.setItem(key, value).catch(() => {});
    }
  },
  getItem: (key: string): string | null => {
    if (isNativeMMKVAvailable && storage) {
      const value = storage.getString(key);
      return value ?? null;
    } else if (isWeb) {
      try {
        return localStorage.getItem(key);
      } catch (e) {
        return memoryStorage[key] ?? null;
      }
    } else {
      return memoryStorage[key] ?? null;
    }
  },
  removeItem: (key: string) => {
    if (isNativeMMKVAvailable && storage) {
      storage.remove(key);
    } else if (isWeb) {
      try {
        localStorage.removeItem(key);
      } catch (e) {
        delete memoryStorage[key];
      }
    } else {
      delete memoryStorage[key];
      // Remove asynchronously from secureStorage in the background
      secureStorage.removeItem(key).catch(() => {});
    }
  },
  clear: () => {
    if (isNativeMMKVAvailable && storage) {
      storage.clearAll();
    } else if (isWeb) {
      try {
        localStorage.clear();
      } catch (e) {
        Object.keys(memoryStorage).forEach((key) => {
          delete memoryStorage[key];
        });
      }
    } else {
      Object.keys(memoryStorage).forEach((key) => {
        delete memoryStorage[key];
        secureStorage.removeItem(key).catch(() => {});
      });
    }
  },
};
