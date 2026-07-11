"use client";

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  type ReactNode,
} from "react";
import { useRouter } from "next/navigation";
import { type AuthUser, type UserRole, getDefaultRedirect } from "@/lib/auth";
import { apiClient, ApiError } from "@/lib/api/client";
import {
  storeTokens,
  clearTokens,
  hasTokens,
  getAccessToken,
  sessionEvents,
  type TokenPair,
} from "@/lib/api/tokenManager";

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
    verification_status: string | null; // 'VERIFIED' | 'PENDING' | 'UNVERIFIED' | 'REJECTED' | null
  };
  tokens: TokenPair;
}

interface RegisterPayload {
  email: string;
  password: string;
  password_confirm: string;
  username: string;
  phone: string;
  role: "CLIENT" | "TRANSPORTER";
  first_name?: string;
  last_name?: string;
}

/** Map backend UPPERCASE role to frontend lowercase UserRole */
function mapBackendRole(backendRole: string): Exclude<UserRole, "guest"> {
  const mapping: Record<string, Exclude<UserRole, "guest">> = {
    CLIENT: "client",
    TRANSPORTER: "transporter",
    ADMIN: "admin",
    MODERATOR: "admin",
  };
  return mapping[backendRole] || "client";
}

/** Convert backend user response to frontend AuthUser shape */
function toAuthUser(apiUser: AuthApiResponse["user"]): AuthUser {
  return {
    id: apiUser.id,
    name: `${apiUser.first_name} ${apiUser.last_name}`,
    first_name: apiUser.first_name,
    last_name: apiUser.last_name,
    email: apiUser.email,
    phone: apiUser.phone,
    role: mapBackendRole(apiUser.role),
    is_verified: apiUser.verification_status === "VERIFIED",
  };
}

interface AuthContextType {
  user: AuthUser | null;
  role: UserRole;
  isAuthenticated: boolean;
  isAdmin: boolean;
  /** @deprecated Use loginWithCredentials instead */
  login: (role: Exclude<UserRole, "guest">) => void;
  /** Real login — authenticates via backend API with email/password */
  loginWithCredentials: (
    email: string,
    password: string,
  ) => Promise<{ success: boolean; role?: UserRole; error?: string }>;
  /** Real register — creates account via backend API */
  registerWithCredentials: (
    payload: RegisterPayload,
  ) => Promise<{ success: boolean; error?: string }>;
  /** Social login — exchanges provider token for Transporti JWT */
  loginWithSocialToken: (
    provider: "google" | "facebook",
    accessToken: string,
  ) => Promise<{ success: boolean; role?: UserRole; error?: string }>;
  logout: () => void;
  switchRole: (role: Exclude<UserRole, "guest">) => void;
  /** Update local user data (after profile update) */
  updateUser: (updates: Partial<AuthUser>) => void;
  /** Whether auth is loading (hydrating from tokens) */
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const STORAGE_KEY = "transporti_auth_role";
const USER_DATA_KEY = "transporti_auth_user";

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [role, setRole] = useState<UserRole>("guest");
  const [isInitialized, setIsInitialized] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  // Load persisted auth on mount
  useEffect(() => {
    if (typeof window === "undefined") return;

    // Try to hydrate from stored user data (works for both mock and real)
    const savedUserJson = localStorage.getItem(USER_DATA_KEY);
    const savedRole = localStorage.getItem(STORAGE_KEY) as UserRole | null;

    if (savedUserJson) {
      try {
        const savedUser = JSON.parse(savedUserJson) as AuthUser;
        setUser(savedUser);
        setRole(savedUser.role);
      } catch {
        // Corrupted data, clear
        localStorage.removeItem(USER_DATA_KEY);
      }
    }

    setIsInitialized(true);
  }, []);

  // Hydrate fresh verification status from backend on mount
  // This ensures is_verified stays current even if admin verified the transporter
  // after their last login session
  useEffect(() => {
    if (typeof window === "undefined" || !hasTokens()) return;

    const hydrateProfile = async () => {
      try {
        const data = await apiClient.get<{
          user: AuthApiResponse["user"] & { avatar_url?: string };
        }>("/api/auth/profile/");
        if (data?.user) {
          const freshVerified = data.user.verification_status === "VERIFIED";
          setUser((prev) => {
            if (!prev) return prev;
            const updated: AuthUser = {
              ...prev,
              is_verified: freshVerified,
              first_name: data.user.first_name || prev.first_name,
              last_name: data.user.last_name || prev.last_name,
              name:
                `${data.user.first_name || ""} ${data.user.last_name || ""}`.trim() ||
                prev.name,
              email: data.user.email || prev.email,
              phone: data.user.phone || prev.phone,
            };
            localStorage.setItem(USER_DATA_KEY, JSON.stringify(updated));
            return updated;
          });
        }
      } catch {
        // Non-blocking: if profile fetch fails, keep cached data
      }
    };
    hydrateProfile();
  }, []);

  // Listen for session-expired events from tokenManager
  // This handles the case where the refresh token expires (after 7 days)
  // and the user is silently logged out with a redirect to /login
  useEffect(() => {
    if (!sessionEvents) return;
    const events = sessionEvents;

    const handleSessionExpired = () => {
      setUser(null);
      setRole("guest");
      localStorage.removeItem(STORAGE_KEY);
      localStorage.removeItem(USER_DATA_KEY);
      router.push("/login?expired=true");
    };

    events.addEventListener("session-expired", handleSessionExpired);
    return () => {
      events.removeEventListener("session-expired", handleSessionExpired);
    };
  }, [router]);

  /** @deprecated Use loginWithCredentials for real authentication */
  const login = useCallback((newRole: Exclude<UserRole, "guest">) => {
    console.warn(
      "[Transporti] login(role) is deprecated. Use loginWithCredentials() instead.",
    );
  }, []);

  /** Real JWT login via backend API */
  const loginWithCredentials = useCallback(
    async (
      email: string,
      password: string,
    ): Promise<{ success: boolean; role?: UserRole; error?: string }> => {
      setIsLoading(true);
      try {
        const data = await apiClient.post<AuthApiResponse>(
          "/api/auth/login/",
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

        return { success: true, role: authUser.role };
      } catch (err) {
        if (err instanceof ApiError && err.body) {
          const messages = Object.values(err.body).flat();
          return {
            success: false,
            error: String(messages[0] || "Login failed."),
          };
        }
        return { success: false, error: "Network error. Please try again." };
      } finally {
        setIsLoading(false);
      }
    },
    [],
  );

  /** Real registration via backend API */
  const registerWithCredentials = useCallback(
    async (
      payload: RegisterPayload,
    ): Promise<{ success: boolean; error?: string }> => {
      setIsLoading(true);
      try {
        const data = await apiClient.post<AuthApiResponse>(
          "/api/auth/register/",
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
          return {
            success: false,
            error: String(messages[0] || "Registration failed."),
          };
        }
        return { success: false, error: "Network error. Please try again." };
      } finally {
        setIsLoading(false);
      }
    },
    [],
  );

  /** Social login — exchange provider token for Transporti JWT */
  const loginWithSocialToken = useCallback(
    async (
      provider: "google" | "facebook",
      accessToken: string,
    ): Promise<{ success: boolean; role?: UserRole; error?: string }> => {
      setIsLoading(true);
      try {
        const data = await apiClient.post<AuthApiResponse>(
          `/api/auth/social/${provider}/`,
          { access_token: accessToken },
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

        return { success: true, role: authUser.role };
      } catch (err) {
        if (err instanceof ApiError && err.body) {
          const messages = Object.values(err.body).flat();
          return {
            success: false,
            error: String(messages[0] || "Social login failed."),
          };
        }
        return { success: false, error: "Network error. Please try again." };
      } finally {
        setIsLoading(false);
      }
    },
    [],
  );

  const logout = useCallback(() => {
    setUser(null);
    setRole("guest");
    clearTokens();
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(USER_DATA_KEY);
  }, []);

  const switchRole = useCallback(
    (newRole: Exclude<UserRole, "guest">) => {
      login(newRole);
    },
    [login],
  );

  /** Update local user data (e.g. after profile save) */
  const updateUser = useCallback((updates: Partial<AuthUser>) => {
    setUser((prev) => {
      if (!prev) return prev;
      const updated = { ...prev, ...updates };
      localStorage.setItem(USER_DATA_KEY, JSON.stringify(updated));
      return updated;
    });
  }, []);

  const value: AuthContextType = {
    user,
    role,
    isAuthenticated: role !== "guest",
    isAdmin: role === "admin",
    login,
    loginWithCredentials,
    registerWithCredentials,
    loginWithSocialToken,
    logout,
    switchRole,
    updateUser,
    isLoading,
  };

  // Prevent flash of unauthenticated content
  if (!isInitialized) {
    return null;
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}

export { getDefaultRedirect };
