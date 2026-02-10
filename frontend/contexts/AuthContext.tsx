'use client';

import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from 'react';
import { type AuthUser, type UserRole, mockUsers, getDefaultRedirect } from '@/lib/auth';

interface AuthContextType {
    user: AuthUser | null;
    role: UserRole;
    isAuthenticated: boolean;
    isAdmin: boolean;
    login: (role: Exclude<UserRole, 'guest'>) => void;
    logout: () => void;
    switchRole: (role: Exclude<UserRole, 'guest'>) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const STORAGE_KEY = 'transporti_auth_role';

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<AuthUser | null>(null);
    const [role, setRole] = useState<UserRole>('guest');
    const [isInitialized, setIsInitialized] = useState(false);

    // Load persisted role on mount
    useEffect(() => {
        if (typeof window !== 'undefined') {
            const savedRole = localStorage.getItem(STORAGE_KEY) as UserRole | null;
            if (savedRole && savedRole !== 'guest' && mockUsers[savedRole as keyof typeof mockUsers]) {
                setUser(mockUsers[savedRole as keyof typeof mockUsers]);
                setRole(savedRole);
            }
            setIsInitialized(true);
        }
    }, []);

    const login = useCallback((newRole: Exclude<UserRole, 'guest'>) => {
        const mockUser = mockUsers[newRole];
        setUser(mockUser);
        setRole(newRole);
        localStorage.setItem(STORAGE_KEY, newRole);
    }, []);

    const logout = useCallback(() => {
        setUser(null);
        setRole('guest');
        localStorage.removeItem(STORAGE_KEY);
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
        logout,
        switchRole,
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
