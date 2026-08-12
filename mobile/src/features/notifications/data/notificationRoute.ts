// Convention `type + metadata → route`, figée en fonction pure testable (4.7).
//
// Avant ce fichier, aucun écran de détail n'était adressable depuis une
// notification : ni le tap dans le panneau (NotificationBell), ni — demain —
// le tap sur un push (4.8) ne menaient nulle part. Le `metadata` stocké en
// base est un JSON libre, hétérogène selon l'émetteur (`notifications/services.py`) :
// cette fonction est le seul endroit qui a le droit de le lire.
//
// Le rôle de l'utilisateur compte : un même `type` (ex. JOB_COMPLETED) part
// vers le CLIENT et le TRANSPORTEUR, mais seul le client a un écran de suivi
// adressable (`mission/[id]`) — le transporteur n'en a pas (pas construit par
// le Lot 2). Router les deux vers le même écran ferait plus de mal que de ne
// pas naviguer du tout : `resolveNotificationRoute` retourne `null` plutôt que
// d'ouvrir un écran qui n'a pas de sens pour ce rôle.

// string (pas UserRole) : cette fonction n'a besoin de reconnaître que
// CLIENT/TRANSPORTER, tout le reste (ADMIN/MODERATOR/undefined) tombe dans le
// même `null` par défaut — pas la peine de dupliquer l'union de authStore ici.
export type AppRole = string | undefined;

export type ResolvedRoute =
  | { pathname: '/mission/[id]'; params: { id: string } }
  | { pathname: '/mes-demandes' }
  | { pathname: '/requests/[jobId]'; params: { jobId: string } }
  | { pathname: '/messages/[jobId]'; params: { jobId: string } }
  | { pathname: '/gains' }
  | { pathname: '/search' }
  | { pathname: '/profile' }
  | null;

function str(value: unknown): string | null {
  if (typeof value === 'number' && Number.isFinite(value)) return String(value);
  if (typeof value === 'string' && value.length > 0) return value;
  return null;
}

// Événements client dont le job est déjà une mission adressable : le client
// n'en devient participant (donc autorisé côté serveur sur `mission/[id]`)
// qu'à l'acceptation. Router TRIP_REQUEST_COUNTERED/REJECTED vers ce même
// écran renverrait un 403 — ils partent vers `mes-demandes` à la place.
const CLIENT_MISSION_EVENTS = new Set([
  'TRIP_REQUEST_ACCEPTED',
  'JOB_STARTED',
  'JOB_COMPLETED',
  'JOB_CANCELLED',
  'ESCROW_HELD',
  'ESCROW_RELEASED',
  'ESCROW_REFUNDED',
  'ESCROW_BLOCKED',
  'DISPUTE_OPENED',
  'DISPUTE_RESOLVED',
  'DISPUTE_ESCALATED',
  'REVIEW_RECEIVED',
]);

const CLIENT_MES_DEMANDES_EVENTS = new Set([
  'TRIP_REQUEST_REJECTED',
  'TRIP_REQUEST_COUNTERED',
]);

export function resolveNotificationRoute(
  type: string,
  metadata: Record<string, unknown> | null | undefined,
  role: AppRole,
): ResolvedRoute {
  const meta = metadata ?? {};
  const jobId = str(meta.job_id);

  if (type === 'MESSAGE_RECEIVED') {
    return jobId ? { pathname: '/messages/[jobId]', params: { jobId } } : null;
  }

  if (type === 'CORRIDOR_TRIP_PUBLISHED') {
    return { pathname: '/search' };
  }

  if (role === 'CLIENT') {
    if (CLIENT_MISSION_EVENTS.has(type)) {
      return jobId ? { pathname: '/mission/[id]', params: { id: jobId } } : null;
    }
    if (CLIENT_MES_DEMANDES_EVENTS.has(type)) {
      return { pathname: '/mes-demandes' };
    }
    return null;
  }

  if (role === 'TRANSPORTER') {
    if (type === 'TRIP_REQUEST_RECEIVED') {
      return jobId ? { pathname: '/requests/[jobId]', params: { jobId } } : null;
    }
    if (type === 'ESCROW_RELEASED' || type === 'ESCROW_REFUNDED' || type === 'ESCROW_BLOCKED') {
      return { pathname: '/gains' };
    }
    // OFFER_* (canal classique) et JOB_* côté transporteur : pas d'écran de
    // détail construit sur mobile (canal classique hors périmètre, cf. plan
    // §5 ; pas de `mission/[id]` transporteur, cf. Lot 2). Rien plutôt qu'un
    // mauvais écran.
    return null;
  }

  return null;
}
