import { create } from 'zustand';
import { tokenService } from './tokenService';

// Rôles portés par l'utilisateur backend (l'autorisation reste autoritative
// côté serveur via RequireRole ; le mobile ne fait que de l'affichage conditionnel).
export type UserRole = 'CLIENT' | 'TRANSPORTER' | 'ADMIN' | 'MODERATOR';

export interface AuthUser {
  id: number;
  email: string;
  role: UserRole;
  isVerified: boolean;
}

type AuthStatus = 'idle' | 'loading' | 'authenticated' | 'unauthenticated';

interface AuthState {
  user: AuthUser | null;
  status: AuthStatus;
  hydrate: () => Promise<void>;
  setSession: (user: AuthUser, access: string, refresh: string) => Promise<void>;
  logout: () => Promise<void>;
}

// État d'auth client. En S0 l'état vit en mémoire (la persistance riche du
// profil viendra avec MMKV en S1) ; les tokens sont déjà persistés de façon
// sécurisée via tokenService.
export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  status: 'idle',
  async hydrate() {
    set({ status: 'loading' });
    const access = await tokenService.getAccess();
    // Le profil complet (/auth/profile) sera rechargé en S1.
    set({ status: access ? 'authenticated' : 'unauthenticated' });
  },
  async setSession(user, access, refresh) {
    await tokenService.setTokens(access, refresh);
    set({ user, status: 'authenticated' });
  },
  async logout() {
    await tokenService.clear();
    set({ user: null, status: 'unauthenticated' });
  },
}));
