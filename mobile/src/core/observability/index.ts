import { env } from '@/core/env';

// Point d'entrée unique de l'observabilité.
//
// Pourquoi une indirection plutôt qu'un appel direct au SDK : le compte Sentry
// n'est pas encore provisionné (DSN absent). Les appelants — ErrorBoundary,
// intercepteurs, mutations critiques — doivent pouvoir être écrits MAINTENANT
// sans dépendre de cette décision d'infrastructure. Le jour où le DSN existe,
// seul ce fichier change : aucun site d'appel n'est touché.
//
// Tant que EXPO_PUBLIC_SENTRY_DSN est vide, les erreurs partent dans la console
// et l'application se comporte exactement comme avant.

type ErrorContext = Record<string, string>;

// Renseigné par initObservability() quand un DSN est présent. Typé au minimum
// nécessaire pour éviter un `any` (règle projet : zéro any non justifié).
interface Reporter {
  captureException(error: Error, hint?: { extra?: ErrorContext }): void;
  setTag(key: string, value: string): void;
}

let reporter: Reporter | null = null;

export function isObservabilityEnabled(): boolean {
  return reporter !== null;
}

/**
 * À appeler une fois, au plus tôt dans le cycle de vie de l'app.
 *
 * L'import du SDK est dynamique et protégé : tant que `@sentry/react-native`
 * n'est pas installé, l'app démarre normalement au lieu d'échouer au bundling.
 */
export async function initObservability(): Promise<void> {
  if (!env.sentryDsn) return;

  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const sentry = require('@sentry/react-native') as {
      init: (options: Record<string, unknown>) => void;
    } & Reporter;

    sentry.init({
      dsn: env.sentryDsn,
      // Les traces d'une app mobile contiennent des identifiants de mission :
      // on n'envoie jamais les données personnelles par défaut.
      sendDefaultPii: false,
      environment: env.buildProfile || 'development',
      release: `${env.appVersion}${env.commitSha ? `+${env.commitSha}` : ''}`,
    });
    reporter = sentry;

    if (env.commitSha) sentry.setTag('commit', env.commitSha);
  } catch {
    // SDK absent ou init impossible : on continue sans observabilité plutôt que
    // d'empêcher l'application de démarrer.
    reporter = null;
  }
}

/** Remonte une erreur non rattrapée. Ne lève jamais. */
export function reportError(error: Error, context?: ErrorContext): void {
  if (reporter) {
    reporter.captureException(error, context ? { extra: context } : undefined);
    return;
  }
  // Repli développement : au moins visible dans les logs Metro.
  console.error('[transporti]', error.message, context ?? '');
}
