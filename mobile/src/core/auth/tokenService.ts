import { secureStorage } from '../storage/secureStore';

const ACCESS_TOKEN_KEY = 'access_token';
const REFRESH_TOKEN_KEY = 'refresh_token';

export const tokenService = {
  getAccessToken: async (): Promise<string | null> => {
    return await secureStorage.getItem(ACCESS_TOKEN_KEY);
  },
  getRefreshToken: async (): Promise<string | null> => {
    return await secureStorage.getItem(REFRESH_TOKEN_KEY);
  },
  saveTokens: async (access: string, refresh: string): Promise<void> => {
    await secureStorage.setItem(ACCESS_TOKEN_KEY, access);
    await secureStorage.setItem(REFRESH_TOKEN_KEY, refresh);
  },
  clearTokens: async (): Promise<void> => {
    await secureStorage.removeItem(ACCESS_TOKEN_KEY);
    await secureStorage.removeItem(REFRESH_TOKEN_KEY);
  },
};
