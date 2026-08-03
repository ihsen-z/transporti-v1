import type { PersistedClient } from '@tanstack/react-query-persist-client';
import type { QueryState } from '@tanstack/react-query';
import { isPersistableQueryKey, stripFailureReasons } from './queryPersister';

// Etat de requete complet plutot qu'un cast : les 12 champs sont obligatoires,
// les ecrire documente la forme reellement persistee.
function queryState(overrides: Partial<QueryState> = {}): QueryState {
  return {
    data: { ok: true },
    dataUpdateCount: 1,
    dataUpdatedAt: 1_700_000_000_000,
    error: null,
    errorUpdateCount: 0,
    errorUpdatedAt: 0,
    fetchFailureCount: 0,
    fetchFailureReason: null,
    fetchMeta: null,
    isInvalidated: false,
    status: 'success',
    fetchStatus: 'idle',
    ...overrides,
  };
}

// React Query type `fetchFailureReason` en Error : on reproduit une AxiosError
// telle qu'elle arrive reellement, avec son nom et sa stack.
function axiosLikeError(message: string): Error {
  const error = new Error(message);
  error.name = 'AxiosError';
  return error;
}

function persistedClient(states: QueryState[]): PersistedClient {
  return {
    timestamp: 1_700_000_000_000,
    buster: '0.1.0',
    clientState: {
      mutations: [],
      queries: states.map((state, index) => ({
        queryHash: `["q${index}"]`,
        queryKey: [`q${index}`],
        state,
      })),
    },
  };
}

// Le choix de ce qui entre dans le cache persiste n'est pas cosmetique : une
// requete sondee toutes les 5 s ferait reserialiser tout le cache a chaque
// tour, et un compteur de non-lus perime s'afficherait faux a l'ouverture.
describe('isPersistableQueryKey', () => {
  it('persiste les donnees de liste et le profil', () => {
    expect(isPersistableQueryKey(['auth', 'profile'])).toBe(true);
    expect(isPersistableQueryKey(['myRequests'])).toBe(true);
    expect(isPersistableQueryKey(['myReturnTrips'])).toBe(true);
    expect(isPersistableQueryKey(['conversations'])).toBe(true);
  });

  it('exclut les requetes sondees en continu', () => {
    expect(isPersistableQueryKey(['notificationsUnreadCount'])).toBe(false);
    expect(isPersistableQueryKey(['jobMessages'])).toBe(false);
  });

  it('exclut jobMessages quel que soit son parametre', () => {
    // La cle reelle est ['jobMessages', jobId] : c'est la racine qui decide,
    // sinon chaque conversation ouverte echapperait a l'exclusion.
    expect(isPersistableQueryKey(['jobMessages', 42])).toBe(false);
    expect(isPersistableQueryKey(['jobMessages', null])).toBe(false);
  });

  it('laisse passer une cle dont la racine n est pas une chaine', () => {
    expect(isPersistableQueryKey([42])).toBe(true);
    expect(isPersistableQueryKey([])).toBe(true);
  });
});

// Une AxiosError persistee embarque sa stack trace complete : quelques Ko par
// requete en echec, pour une information sans valeur au redemarrage suivant.
describe('stripFailureReasons', () => {
  it('efface la raison d echec sans toucher aux donnees', () => {
    const client = persistedClient([
      queryState({ fetchFailureCount: 2, fetchFailureReason: axiosLikeError('Network Error') }),
    ]);

    const cleaned = stripFailureReasons(client);
    const query = cleaned.clientState.queries[0];

    expect(query?.state.fetchFailureReason).toBeNull();
    // Le reste doit survivre : c'est tout l'interet du cache.
    expect(query?.state.data).toEqual({ ok: true });
    expect(query?.state.status).toBe('success');
    expect(query?.state.fetchFailureCount).toBe(2);
    expect(cleaned.buster).toBe('0.1.0');
  });

  it('n altere pas le client d origine', () => {
    const reason = axiosLikeError('Network Error');
    const client = persistedClient([queryState({ fetchFailureReason: reason })]);

    stripFailureReasons(client);

    // React Query reutilise l'objet cote memoire : le muter fausserait l'etat
    // de l'app en plus du fichier.
    expect(client.clientState.queries[0]?.state.fetchFailureReason).toBe(reason);
  });

  it('traite toutes les requetes, pas seulement la premiere', () => {
    const client = persistedClient([
      queryState({ fetchFailureReason: axiosLikeError('a') }),
      queryState({ fetchFailureReason: axiosLikeError('b') }),
    ]);

    const cleaned = stripFailureReasons(client);

    expect(cleaned.clientState.queries.map((q) => q.state.fetchFailureReason)).toEqual([
      null,
      null,
    ]);
  });
});
