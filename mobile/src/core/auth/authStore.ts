import { create } from 'zustand';
import { tokenService } from './tokenService';
import { mmkvStorage } from '../storage/mmkv';

export interface User {
  id: number;
  email: string;
  phone: string;
  role: 'CLIENT' | 'TRANSPORTER' | 'ADMIN' | 'MODERATOR';
  name: string;
  is_verified: boolean;
}

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (user: User, accessToken: string, refreshToken: string) => Promise<void>;
  logout: () => Promise<void>;
  restoreSession: () => Promise<boolean>;
  updateUser: (user: Partial<User>) => void;
}

const USER_STORAGE_KEY = 'auth_user';

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  isAuthenticated: false,
  isLoading: true,

  login: async (user, accessToken, refreshToken) => {
    try {
      await tokenService.saveTokens(accessToken, refreshToken);
      mmkvStorage.setItem(USER_STORAGE_KEY, JSON.stringify(user));
      set({ user, isAuthenticated: true, isLoading: false });
    } catch (error) {
      throw error;
    }
  },

  logout: async () => {
    set({ isLoading: true });
    try {
      await tokenService.clearTokens();
      mmkvStorage.removeItem(USER_STORAGE_KEY);
      set({ user: null, isAuthenticated: false, isLoading: false });
    } catch (error) {
      set({ isLoading: false });
      throw error;
    }
  },

  restoreSession: async () => {
    if (get().isAuthenticated) {
      return true;
    }
    set({ isLoading: true });
    try {
      const token = await tokenService.getAccessToken();
      const cachedUser = mmkvStorage.getItem(USER_STORAGE_KEY);

      if (token && cachedUser) {
        const user = JSON.parse(cachedUser) as User;
        set({ user, isAuthenticated: true, isLoading: false });
        return true;
      } else {
        await tokenService.clearTokens();
        mmkvStorage.removeItem(USER_STORAGE_KEY);
        set({ user: null, isAuthenticated: false, isLoading: false });
        return false;
      }
    } catch (error) {
      set({ user: null, isAuthenticated: false, isLoading: false });
      return false;
    }
  },

  updateUser: (updatedFields) => {
    const currentUser = get().user;
    if (currentUser) {
      const newUser = { ...currentUser, ...updatedFields };
      mmkvStorage.setItem(USER_STORAGE_KEY, JSON.stringify(newUser));
      set({ user: newUser });
    }
  },
}));
