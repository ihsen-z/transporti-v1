// Quelles données rafraîchir quand un push arrive, l'application ouverte ?
//
// Les sondages ont été ralentis (core/api/polling.ts) : sans ce relais, un
// message reçu mettrait jusqu'à une minute à apparaître dans la pastille. Le
// push dit déjà ce qui a changé ; il suffit de l'écouter. Fonction pure, comme
// `resolveNotificationRoute`, et elle lit le `metadata` de la même façon.

export type QueryKeyToRefresh = readonly unknown[];

function jobIdFrom(metadata: Record<string, unknown>): number | null {
  const raw = metadata.job_id;
  const id = typeof raw === 'string' ? Number(raw) : raw;
  return typeof id === 'number' && Number.isInteger(id) && id > 0 ? id : null;
}

export function queriesToRefresh(
  type: string,
  metadata: Record<string, unknown>,
): QueryKeyToRefresh[] {
  // Toute notification fait monter le compteur de la cloche et la liste.
  const keys: QueryKeyToRefresh[] = [['notificationsUnreadCount'], ['notifications']];
  const jobId = jobIdFrom(metadata);

  if (type === 'MESSAGE_RECEIVED') {
    keys.push(['conversations']);
    if (jobId !== null) keys.push(['jobMessages', jobId]);
    return keys;
  }

  // Les autres événements portent sur une mission : son écran, s'il est
  // ouvert, doit refléter le nouvel état sans attendre son prochain sondage.
  // Les clés reprennent `jobDetailKey` et `['jobEscrow', id]` (voir
  // useDeepLinkRouting, qui invalide déjà ces deux-là).
  if (jobId !== null) {
    keys.push(['jobDetail', jobId], ['jobEscrow', jobId]);
  }
  return keys;
}
