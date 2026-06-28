// Centralized API Error Handler
// Production Hardening — user-friendly error interpretation

import { ApiError } from './client';

export interface ErrorInfo {
    title: string;
    message: string;
    action: 'retry' | 'login' | 'fix' | 'contact';
    retryable: boolean;
}

/**
 * Interprets API errors into user-friendly French messages.
 * Used by components to display toast/inline error feedback.
 */
export function handleApiError(error: unknown): ErrorInfo {
    // Timeout / Network
    if (error instanceof DOMException && error.name === 'AbortError') {
        return {
            title: 'Délai dépassé',
            message: 'Le serveur met trop de temps à répondre. Vérifiez votre connexion.',
            action: 'retry',
            retryable: true,
        };
    }

    if (error instanceof TypeError && error.message.includes('fetch')) {
        return {
            title: 'Connexion impossible',
            message: 'Impossible de joindre le serveur. Vérifiez votre connexion internet.',
            action: 'retry',
            retryable: true,
        };
    }

    // API errors (HTTP status codes)
    if (error instanceof ApiError) {
        switch (error.status) {
            case 400:
                return {
                    title: 'Données invalides',
                    message: extractValidationMessage(error.body) || 'Vérifiez les informations saisies.',
                    action: 'fix',
                    retryable: false,
                };
            case 401:
                return {
                    title: 'Session expirée',
                    message: 'Veuillez vous reconnecter.',
                    action: 'login',
                    retryable: false,
                };
            case 403:
                return {
                    title: 'Accès refusé',
                    message: 'Vous n\'avez pas les droits pour cette action.',
                    action: 'contact',
                    retryable: false,
                };
            case 404:
                return {
                    title: 'Introuvable',
                    message: 'La ressource demandée n\'existe pas ou a été supprimée.',
                    action: 'fix',
                    retryable: false,
                };
            case 409:
                return {
                    title: 'Conflit',
                    message: 'Cette action a déjà été effectuée ou est en conflit.',
                    action: 'retry',
                    retryable: false,
                };
            case 429:
                return {
                    title: 'Trop de requêtes',
                    message: 'Veuillez patienter quelques instants avant de réessayer.',
                    action: 'retry',
                    retryable: true,
                };
            default:
                if (error.status >= 500) {
                    return {
                        title: 'Erreur serveur',
                        message: 'Une erreur interne est survenue. Réessayez dans quelques instants.',
                        action: 'retry',
                        retryable: true,
                    };
                }
        }
    }

    // Unknown error
    return {
        title: 'Erreur inattendue',
        message: 'Quelque chose s\'est mal passé. Veuillez réessayer.',
        action: 'retry',
        retryable: true,
    };
}

/**
 * Extract the most relevant validation message from a DRF error response body.
 */
function extractValidationMessage(body?: Record<string, unknown>): string | null {
    if (!body) return null;

    // DRF format: { "field": ["error message"] } or { "detail": "message" }
    if (typeof body.detail === 'string') return body.detail;
    if (typeof body.error === 'string') return body.error;

    // Extract first field error
    for (const key of Object.keys(body)) {
        const value = body[key];
        if (Array.isArray(value) && value.length > 0) {
            return `${key}: ${value[0]}`;
        }
    }

    return null;
}
