import { useMutation, useQueryClient } from '@tanstack/react-query';
import { isAxiosError } from 'axios';
import { apiClient } from '@/core/api/client';
import type { CompleteRequest } from './dto';
import { QUERIES_AFTER_DELIVERY, invalidateAll } from './afterMission';

export type CompleteErrorKind =
  | 'pin_required'
  | 'pin_invalid'
  | 'pin_locked'
  | 'state'
  | 'forbidden'
  | 'network'
  | 'unknown';

// Précisions que le serveur joint à certains refus de clôture.
export interface CompleteDetails {
  // 423 PIN_LOCKED : secondes avant de pouvoir réessayer. `null` = absent ou nul,
  // c'est-à-dire verrouillé jusqu'à intervention du support.
  retryAfterSeconds: number | null;
  // 400 PIN_INVALID : essais restants avant le verrouillage, `null` si non fourni.
  remainingAttempts: number | null;
}

const NO_DETAILS: CompleteDetails = { retryAfterSeconds: null, remainingAttempts: null };

export class CompleteError extends Error {
  constructor(
    public readonly kind: CompleteErrorKind,
    public readonly details: CompleteDetails = NO_DETAILS,
  ) {
    super(kind);
    this.name = 'CompleteError';
  }
}

// Entier strictement positif, sinon null (absent, nul, négatif ou non numérique).
function positiveInt(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) && value > 0 ? Math.ceil(value) : null;
}

// Lit `retry_after_seconds` et `remaining_attempts` dans le corps d'un refus.
// Fonction pure : le corps est de forme inconnue, on valide chaque champ.
export function parseCompleteDetails(data: unknown): CompleteDetails {
  if (typeof data !== 'object' || data === null) return NO_DETAILS;
  const body = data as Record<string, unknown>;
  const remaining = body.remaining_attempts;
  return {
    retryAfterSeconds: positiveInt(body.retry_after_seconds),
    // Zéro essai restant est une valeur valide (le prochain échec verrouille).
    remainingAttempts:
      typeof remaining === 'number' && Number.isFinite(remaining) && remaining >= 0
        ? Math.floor(remaining)
        : null,
  };
}

interface CompleteArgs {
  jobId: number;
  body: CompleteRequest;
}

// Classe un échec de clôture. Fonction pure, exportée pour être testée : la
// forme du verrouillage (423 ou 429, code `PIN_LOCKED`) est un contrat serveur
// récent, et un faux négatif ferait répéter des codes au transporteur pendant
// qu'il est verrouillé.
export function classifyCompleteFailure(
  status: number | undefined,
  code: string | undefined,
): CompleteErrorKind {
  // Après plusieurs codes faux, le serveur verrouille la clôture. Le code
  // fait foi quel que soit le statut HTTP ; sans code, seul 423 (« Locked »)
  // est sans ambiguïté : un 429 nu est le limiteur général de requêtes.
  if (code === 'PIN_LOCKED' || status === 423) return 'pin_locked';
  if (status === 400) {
    if (code === 'PIN_REQUIRED') return 'pin_required';
    if (code === 'PIN_INVALID') return 'pin_invalid';
    return 'state';
  }
  if (status === 403) return 'forbidden';
  if (status === undefined) return 'network';
  return 'unknown';
}

// POST jobs/<id>/complete/ — clôture par PIN (D7). Le backend renvoie
// un `code` (PIN_REQUIRED / PIN_INVALID / PIN_LOCKED) qu'on remonte en type métier.
async function postComplete({ jobId, body }: CompleteArgs): Promise<void> {
  try {
    await apiClient.post(`jobs/${jobId}/complete/`, body);
  } catch (err) {
    if (isAxiosError(err)) {
      // data est typé unknown par axios : cast ciblé sur le champ `code`.
      const code = (err.response?.data as { code?: string } | undefined)?.code;
      throw new CompleteError(
        classifyCompleteFailure(err.response?.status, code),
        parseCompleteDetails(err.response?.data),
      );
    }
    throw new CompleteError('unknown');
  }
}

export function useCompleteJob() {
  const qc = useQueryClient();
  return useMutation<void, CompleteError, CompleteArgs>({
    mutationFn: postComplete,
    onSuccess: () => {
      invalidateAll(qc, QUERIES_AFTER_DELIVERY);
    },
  });
}
