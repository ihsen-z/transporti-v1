'use client';

import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from 'react';
import { type AuthUser, type UserRole, mockUsers, getDefaultRedirect } from '@/lib/auth';
import { config } from '@/lib/config';
import { apiClient, ApiError } from '@/lib/api/client';
import {
    storeTokens, clearTokens, hasTokens, getAccessToken,
    type TokenPair,
} from '@/lib/api/tokenManager';

// Backend response shape (from POST /api/auth/login/ and /api/auth/register/)
interface AuthApiResponse {
    message: string;
    user: {
        id: number;
        email: string;
        phone: string;
        role: string; // UPPERCASE: 'CLIENT' | 'TRANSPORTER' | 'ADMIN'
        first_name: string;
        last_name: string;
        is_phone_verified: boolean;
        verification_status: string | null;
    };
    tokens: TokenPair;
}

interface RegisterPayload {
    email: string;
    password: string;
    password_confirm: string;
    username: string;
    phone: string;
    role: 'CLIENT' | 'TRANSPORTER';
    first_name?: string;
    last_name?: string;
}

/** Map backend UPPERCASE role to frontend lowercase UserRole */
function mapBackendRole(backendRole: string): Exclude<UserRole, 'guest'> {
    const mapping: Record<string, Exclude<UserRole, 'guest'>> = {
        'CLIENT': 'client',
        'TRANSPORTER': 'transporter',
        'ADMIN': 'admin',
        'MODERATOR': 'admin',
    };
    return mapping[backendRole] || 'client';
}

/** Convert backend user response to frontend AuthUser shape */
function toAuthUser(apiUser: AuthApiResponse['user']): AuthUser {
    return {
        id: apiUser.id,
        name: `${apiUser.first_name} ${apiUser.last_name}`,
        email: apiUser.email,
        role: mapBackendRole(apiUser.role),
    };
}

interface AuthContextType {
    user: AuthUser | null;
    role: UserRole;
    isAuthenticated: boolean;
    isAdmin: boolean;
    /** Mock login — selects a role and loads mock user (existing behavior) */
    login: (role: Exclude<UserRole, 'guest'>) => void;
    /** Real login — authenticates via backend API with email/password */
    loginWithCredentials: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
    /** Real register — creates account via backend API */
    registerWithCredentials: (payload: RegisterPayload) => Promise<{ success: boolean; error?: string }>;
    logout: () => void;
    switchRole: (role: Exclude<UserRole, 'guest'>) => void;
    /** Whether auth is loading (hydrating from tokens) */
    isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const STORAGE_KEY = 'transporti_auth_role';
const USER_DATA_KEY = 'transporti_auth_user';

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<AuthUser | null>(null);
    const [role, setRole] = useState<UserRole>('guest');
    const [isInitialized, setIsInitialized] = useState(false);
    const [isLoading, setIsLoading] = useState(false);

    // Load persisted auth on mount
    useEffect(() => {
        if (typeof window === 'undefined') return;

        // Try to hydrate from stored user data (works for both mock and real)
        const savedUserJson = localStorage.getItem(USER_DATA_KEY);
        const savedRole = localStorage.getItem(STORAGE_KEY) as UserRole | null;

        if (savedUserJson) {
            try {
                const savedUser = JSON.parse(savedUserJson) as AuthUser;
                setUser(savedUser);
                setRole(savedUser.role);
            } catch {
                // Corrupted data, fall through to mock check
            }
        } else if (savedRole && savedRole !== 'guest' && mockUsers[savedRole as keyof typeof mockUsers]) {
            // Backward compat: hydrate from old mock-only storage
            setUser(mockUsers[savedRole as keyof typeof mockUsers]);
            setRole(savedRole);
        }

        setIsInitialized(true);
    }, []);

    /** Mock login — preserves existing behavior exactly */
    const login = useCallback((newRole: Exclude<UserRole, 'guest'>) => {
        const mockUser = mockUsers[newRole];
        setUser(mockUser);
        setRole(newRole);
        localStorage.setItem(STORAGE_KEY, newRole);
        localStorage.setItem(USER_DATA_KEY, JSON.stringify(mockUser));
    }, []);

    /** Real JWT login via backend API */
    const loginWithCredentials = useCallback(async (
        email: string,
        password: string,
    ): Promise<{ success: boolean; error?: string }> => {
        setIsLoading(true);
        try {
            const data = await apiClient.post<AuthApiResponse>(
                '/api/auth/login/',
                { email, password },
                { skipAuth: true },
            );

            // Store JWT tokens
            storeTokens(data.tokens);

            // Map to frontend user shape
            const authUser = toAuthUser(data.user);
            setUser(authUser);
            setRole(authUser.role);
            localStorage.setItem(STORAGE_KEY, authUser.role);
            localStorage.setItem(USER_DATA_KEY, JSON.stringify(authUser));

            return { success: true };
        } catch (err) {
            if (err instanceof ApiError && err.body) {
                const messages = Object.values(err.body).flat();
                return { success: false, error: String(messages[0] || 'Login failed.') };
            }
            return { success: false, error: 'Network error. Please try again.' };
        } finally {
            setIsLoading(false);
        }
    }, []);

    /** Real registration via backend API */
    const registerWithCredentials = useCallback(async (
        payload: RegisterPayload,
    ): Promise<{ success: boolean; error?: string }> => {
        setIsLoading(true);
        try {
            const data = await apiClient.post<AuthApiResponse>(
                '/api/auth/register/',
                payload,
                { skipAuth: true },
            );

            // Store JWT tokens (auto-login)
            storeTokens(data.tokens);

            // Map to frontend user shape
            const authUser = toAuthUser(data.user);
            setUser(authUser);
            setRole(authUser.role);
            localStorage.setItem(STORAGE_KEY, authUser.role);
            localStorage.setItem(USER_DATA_KEY, JSON.stringify(authUser));

            return { success: true };
        } catch (err) {
            if (err instanceof ApiError && err.body) {
                const messages = Object.values(err.body).flat();
                return { success: false, error: String(messages[0] || 'Registration failed.') };
            }
            return { success: false, error: 'Network error. Please try again.' };
        } finally {
            setIsLoading(false);
        }
    }, []);

    const logout = useCallback(() => {
        setUser(null);
        setRole('guest');
        clearTokens();
        localStorage.removeItem(STORAGE_KEY);
        localStorage.removeItem(USER_DATA_KEY);
    }, []);

    const switchRole = useCallback((newRole: Exclude<UserRole, 'guest'>) => {
        login(newRole);
    }, [login]);

    const value: AuthContextType = {
        user,
        role,
        isAuthenticated: role !== 'guest',
        isAdmin: role === 'admin',
        login,
        loginWithCredentials,
        registerWithCredentials,
        logout,
        switchRole,
        isLoading,
    };

    // Prevent flash of unauthenticated content
    if (!isInitialized) {
        return null;
    }

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
}

export { getDefaultRedirect };

