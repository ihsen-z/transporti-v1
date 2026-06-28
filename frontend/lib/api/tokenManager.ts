// JWT Token Manager — Handles token storage, retrieval, and refresh

import { config } from '@/lib/config';

const ACCESS_TOKEN_KEY = 'transporti_access_token';
const REFRESH_TOKEN_KEY = 'transporti_refresh_token';

export interface TokenPair {
    access: string;
    refresh: string;
}

/**
 * Global event bus for session lifecycle events.
 * Emits 'session-expired' when the refresh token fails,
 * allowing AuthContext to perform a clean logout + redirect.
 */
export const sessionEvents = typeof window !== 'undefined'
    ? new EventTarget()
    : null;

/**
 * Store JWT tokens in localStorage.
 * Only called after a successful login or token refresh.
 */
export function storeTokens(tokens: TokenPair): void {
    if (typeof window === 'undefined') return;
    localStorage.setItem(ACCESS_TOKEN_KEY, tokens.access);
    localStorage.setItem(REFRESH_TOKEN_KEY, tokens.refresh);
}

/**
 * Get the current access token (if any).
 */
export function getAccessToken(): string | null {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem(ACCESS_TOKEN_KEY);
}

/**
 * Get the current refresh token (if any).
 */
export function getRefreshToken(): string | null {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem(REFRESH_TOKEN_KEY);
}

/**
 * Clear all stored tokens (called on logout).
 */
export function clearTokens(): void {
    if (typeof window === 'undefined') return;
    localStorage.removeItem(ACCESS_TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
}

/**
 * Check if we have a stored access token.
 */
export function hasTokens(): boolean {
    return getAccessToken() !== null;
}

/** Flag to prevent multiple session-expired events firing simultaneously */
let isRefreshing = false;

/**
 * Attempt to refresh the access token using the stored refresh token.
 * Returns the new token pair, or null if refresh failed.
 * Emits 'session-expired' on failure so AuthContext can react.
 */
export async function refreshAccessToken(): Promise<TokenPair | null> {
    const refreshToken = getRefreshToken();
    if (!refreshToken) return null;

    // Prevent concurrent refresh attempts from each emitting expired
    if (isRefreshing) return null;
    isRefreshing = true;

    try {
        const response = await fetch(`${config.API_BASE_URL}/api/auth/token/refresh/`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ refresh: refreshToken }),
        });

        if (!response.ok) {
            // Refresh token is invalid/expired — session is dead
            clearTokens();
            sessionEvents?.dispatchEvent(new CustomEvent('session-expired'));
            return null;
        }

        const data = await response.json();
        const newTokens: TokenPair = {
            access: data.access,
            refresh: data.refresh || refreshToken, // Some backends return new refresh, some don't
        };
        storeTokens(newTokens);
        return newTokens;
    } catch {
        clearTokens();
        sessionEvents?.dispatchEvent(new CustomEvent('session-expired'));
        return null;
    } finally {
        isRefreshing = false;
    }
}
