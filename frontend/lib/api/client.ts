// API Client — thin fetch wrapper with full CRUD + JWT auth
// Sprint 7.5 — API Transition Layer
// Sprint C  — Enhanced with POST/PUT/DELETE + auth header injection

import { config } from '@/lib/config';
import { getAccessToken, refreshAccessToken } from '@/lib/api/tokenManager';

export class ApiError extends Error {
    constructor(
        public status: number,
        public statusText: string,
        public body?: Record<string, unknown>,
        message?: string,
    ) {
        super(message || `API Error: ${status} ${statusText}`);
        this.name = 'ApiError';
    }
}

interface RequestOptions {
    headers?: Record<string, string>;
    signal?: AbortSignal;
    /** Skip automatic Authorization header injection (e.g. for login/register) */
    skipAuth?: boolean;
}

async function request<T>(
    method: string,
    path: string,
    body?: unknown,
    options: RequestOptions = {},
): Promise<T> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), config.API_TIMEOUT);

    try {
        const url = `${config.API_BASE_URL}${path}`;
        const headers: Record<string, string> = {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            ...options.headers,
        };

        // Inject JWT auth header if token is available and not skipped
        if (!options.skipAuth) {
            const token = getAccessToken();
            if (token) {
                headers['Authorization'] = `Bearer ${token}`;
            }
        }

        const fetchOptions: RequestInit = {
            method,
            headers,
            signal: options.signal || controller.signal,
        };

        // Only attach body for non-GET requests
        if (body !== undefined && method !== 'GET') {
            fetchOptions.body = JSON.stringify(body);
        }

        let response = await fetch(url, fetchOptions);

        // Auto-retry on 401 with token refresh (only once)
        if (response.status === 401 && !options.skipAuth) {
            const newTokens = await refreshAccessToken();
            if (newTokens) {
                headers['Authorization'] = `Bearer ${newTokens.access}`;
                response = await fetch(url, { ...fetchOptions, headers });
            }
        }

        if (!response.ok) {
            let errorBody: Record<string, unknown> | undefined;
            try {
                errorBody = await response.json();
            } catch {
                // Response body is not JSON, ignore
            }
            throw new ApiError(response.status, response.statusText, errorBody);
        }

        // Handle 204 No Content
        if (response.status === 204) {
            return undefined as T;
        }

        return await response.json() as T;
    } finally {
        clearTimeout(timeout);
    }
}

export const apiClient = {
    get: <T>(path: string, options?: RequestOptions) =>
        request<T>('GET', path, undefined, options),

    post: <T>(path: string, body?: unknown, options?: RequestOptions) =>
        request<T>('POST', path, body, options),

    put: <T>(path: string, body?: unknown, options?: RequestOptions) =>
        request<T>('PUT', path, body, options),

    patch: <T>(path: string, body?: unknown, options?: RequestOptions) =>
        request<T>('PATCH', path, body, options),

    delete: <T>(path: string, options?: RequestOptions) =>
        request<T>('DELETE', path, undefined, options),

    /**
     * Upload a file via multipart/form-data.
     * Does NOT set Content-Type header (browser auto-sets with boundary).
     */
    upload: async <T>(path: string, formData: FormData, options: RequestOptions = {}): Promise<T> => {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), config.API_TIMEOUT);

        try {
            const url = `${config.API_BASE_URL}${path}`;
            const headers: Record<string, string> = {
                'Accept': 'application/json',
                // NOT setting Content-Type — browser auto-sets multipart boundary
                ...options.headers,
            };

            if (!options.skipAuth) {
                const token = getAccessToken();
                if (token) {
                    headers['Authorization'] = `Bearer ${token}`;
                }
            }

            let response = await fetch(url, {
                method: 'POST',
                headers,
                body: formData,
                signal: options.signal || controller.signal,
            });

            // Auto-retry on 401 with token refresh
            if (response.status === 401 && !options.skipAuth) {
                const newTokens = await refreshAccessToken();
                if (newTokens) {
                    headers['Authorization'] = `Bearer ${newTokens.access}`;
                    response = await fetch(url, {
                        method: 'POST',
                        headers,
                        body: formData,
                        signal: controller.signal,
                    });
                }
            }

            if (!response.ok) {
                let errorBody: Record<string, unknown> | undefined;
                try { errorBody = await response.json(); } catch {}
                throw new ApiError(response.status, response.statusText, errorBody);
            }

            if (response.status === 204) return undefined as T;
            return await response.json() as T;
        } finally {
            clearTimeout(timeout);
        }
    },
};
