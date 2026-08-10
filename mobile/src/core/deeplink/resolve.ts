// Résolution PURE d'un lien profond vers une action applicative.
//
// Isolée du hook pour être testable : c'est la partie fragile. Selon la
// plateforme et la forme de l'URL, `transporti://payment/callback?...` se lit
// tantôt comme hostname='payment' + path='callback', tantôt comme
// path='payment/callback' — et un lien mal interprété, c'est un paiement qui
// n'est jamais vérifié, donc un escrow bloqué en INITIATED.

export type DeepLinkAction =
  | { type: 'payment-callback'; jobId: number | null; success: boolean; gatewayRef: string | null }
  | { type: 'reset-password'; uid: string; token: string }
  | { type: 'unknown' };

export interface ParsedUrl {
  hostname?: string | null;
  path?: string | null;
  queryParams?: Record<string, string | string[] | undefined> | null;
}

function firstParam(value: string | string[] | undefined): string | null {
  if (Array.isArray(value)) return value[0] ?? null;
  return value ?? null;
}

/** Recompose une route comparable à partir des morceaux fournis par le parseur. */
export function normalizeRoute(hostname?: string | null, path?: string | null): string {
  return [hostname, path]
    .filter((part): part is string => typeof part === 'string' && part.length > 0)
    .join('/')
    .replace(/^\/+|\/+$/g, '')
    .replace(/\/{2,}/g, '/')
    .toLowerCase();
}

export function resolveDeepLinkAction(parsed: ParsedUrl): DeepLinkAction {
  const route = normalizeRoute(parsed.hostname, parsed.path);
  const params = parsed.queryParams ?? {};

  if (route.endsWith('payment/callback')) {
    const rawJobId = firstParam(params.job_id);
    const jobId = rawJobId !== null ? Number(rawJobId) : NaN;
    return {
      type: 'payment-callback',
      jobId: Number.isFinite(jobId) && jobId > 0 ? jobId : null,
      success: firstParam(params.status) === 'success',
      gatewayRef: firstParam(params.ref),
    };
  }

  if (route.endsWith('reset-password')) {
    const uid = firstParam(params.uid);
    const token = firstParam(params.token);
    if (uid && token) return { type: 'reset-password', uid, token };
  }

  return { type: 'unknown' };
}
