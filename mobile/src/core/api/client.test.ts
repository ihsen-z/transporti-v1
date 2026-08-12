import axios from 'axios';
import MockAdapter from 'axios-mock-adapter';
import { apiClient } from './client';

// Tout est mocké : ni SecureStore/localStorage (tokenService) ni le store
// zustand réel n'existent d'intérêt ici — seul le contrat HTTP de client.ts
// (Bearer, anticipation d'expiration, anti-stampede, refresh, déconnexion)
// est sous test. Mêmes conventions de mock que authStore.test.ts. Les noms
// préfixés `mock` sont requis par Babel pour hisser ces jest.mock() au-dessus
// de l'import de `./client` ci-dessus, quel que soit l'ordre dans le fichier.
//
// `getAccess`/`setTokens` partagent un état en mémoire (comme le vrai
// tokenService partage SecureStore) : un `setTokens` doit être relu par le
// `getAccess` suivant, notamment quand l'intercepteur de réponse rejoue la
// requête originale via `apiClient(original)`, qui repasse par l'intercepteur
// de requête et donc par un nouveau `getAccess()`.
let storedAccess: string | null = null;
let storedRefresh: string | null = 'refresh-token';

const mockGetAccess = jest.fn(() => Promise.resolve(storedAccess));
const mockGetRefresh = jest.fn(() => Promise.resolve(storedRefresh));
const mockSetTokens = jest.fn((access: string, refresh: string) => {
  storedAccess = access;
  storedRefresh = refresh;
  return Promise.resolve();
});
jest.mock('@/core/auth/tokenService', () => ({
  tokenService: {
    getAccess: () => mockGetAccess(),
    getRefresh: () => mockGetRefresh(),
    setTokens: (access: string, refresh: string) => mockSetTokens(access, refresh),
  },
}));

const mockLogout = jest.fn(() => Promise.resolve());
jest.mock('@/core/auth/authStore', () => ({
  useAuthStore: { getState: () => ({ logout: mockLogout }) },
}));

const apiMock = new MockAdapter(apiClient);
// `refreshAccessToken` appelle `axios.post` NU (le module par défaut), pas
// `apiClient` — cf. le commentaire dans client.ts sur pourquoi (éviter la
// boucle d'intercepteurs). Il faut donc un second adapter sur `axios` lui-même.
const rawAxiosMock = new MockAdapter(axios);

function fakeJwt(expSecondsFromNow: number): string {
  const base64url = (obj: unknown) =>
    Buffer.from(JSON.stringify(obj))
      .toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');
  const exp = Math.floor(Date.now() / 1000) + expSecondsFromNow;
  return `${base64url({ alg: 'HS256' })}.${base64url({ exp })}.sig`;
}

const VALID_TOKEN = fakeJwt(3600); // expire dans 1h — largement hors marge
const EXPIRING_TOKEN = fakeJwt(5); // expire dans 5s — sous la marge de 10s
const REFRESH_URL = 'http://localhost:8000/api/v1/auth/token/refresh/';

beforeEach(() => {
  jest.clearAllMocks();
  apiMock.reset();
  rawAxiosMock.reset();
  storedAccess = null;
  storedRefresh = 'refresh-token';
});

describe('Bearer token', () => {
  it("attache le token d'accès quand une session existe", async () => {
    storedAccess = VALID_TOKEN;
    apiMock.onGet('ping/').reply(200, {});

    await apiClient.get('ping/');

    expect(apiMock.history.get[0]?.headers?.Authorization).toBe(`Bearer ${VALID_TOKEN}`);
  });

  it("n'attache rien sans session", async () => {
    apiMock.onGet('ping/').reply(200, {});

    await apiClient.get('ping/');

    expect(apiMock.history.get[0]?.headers?.Authorization).toBeUndefined();
  });
});

describe("anticipation d'expiration (5.6)", () => {
  it('un token confortablement valide ne déclenche aucun rafraîchissement', async () => {
    storedAccess = VALID_TOKEN;
    apiMock.onGet('ping/').reply(200, {});

    await apiClient.get('ping/');

    expect(rawAxiosMock.history.post).toHaveLength(0);
    expect(mockSetTokens).not.toHaveBeenCalled();
  });

  it("un token sur le point d'expirer est rafraîchi AVANT le départ de la requête (pas de 401 évitable)", async () => {
    storedAccess = EXPIRING_TOKEN;
    rawAxiosMock.onPost(REFRESH_URL).reply(200, { access: 'fresh-access', refresh: 'fresh-refresh' });
    apiMock.onGet('ping/').reply(200, {});

    await apiClient.get('ping/');

    // Une seule requête sur l'endpoint cible : la nouvelle valeur est déjà là
    // au premier départ, pas de round-trip 401 + retry.
    expect(apiMock.history.get).toHaveLength(1);
    expect(apiMock.history.get[0]?.headers?.Authorization).toBe('Bearer fresh-access');
    expect(mockSetTokens).toHaveBeenCalledWith('fresh-access', 'fresh-refresh');
  });
});

describe('rejeu sur 401 (intercepteur de réponse)', () => {
  it('rafraîchit puis rejoue la requête originale avec le nouveau token', async () => {
    storedAccess = VALID_TOKEN; // hors marge : le 401 vient du serveur, pas de l'anticipation
    rawAxiosMock.onPost(REFRESH_URL).reply(200, { access: 'fresh-access', refresh: 'fresh-refresh' });
    apiMock
      .onGet('secure/')
      .replyOnce(401)
      .onGet('secure/')
      .reply(200, { ok: true });

    const res = await apiClient.get('secure/');

    expect(res.status).toBe(200);
    expect(apiMock.history.get).toHaveLength(2);
    expect(apiMock.history.get[1]?.headers?.Authorization).toBe('Bearer fresh-access');
    expect(mockLogout).not.toHaveBeenCalled();
  });

  it("anti-stampede : deux 401 concurrents ne déclenchent qu'un seul rafraîchissement", async () => {
    storedAccess = VALID_TOKEN;
    rawAxiosMock.onPost(REFRESH_URL).reply(200, { access: 'fresh-access', refresh: 'fresh-refresh' });
    apiMock
      .onGet('a/')
      .replyOnce(401)
      .onGet('a/')
      .reply(200, {});
    apiMock
      .onGet('b/')
      .replyOnce(401)
      .onGet('b/')
      .reply(200, {});

    await Promise.all([apiClient.get('a/'), apiClient.get('b/')]);

    expect(rawAxiosMock.history.post).toHaveLength(1);
  });

  it('panne transitoire (502) sur le rafraîchissement : ne déconnecte PAS', async () => {
    storedAccess = VALID_TOKEN;
    rawAxiosMock.onPost(REFRESH_URL).reply(502);
    apiMock.onGet('secure/').reply(401);

    await expect(apiClient.get('secure/')).rejects.toBeTruthy();

    expect(mockLogout).not.toHaveBeenCalled();
  });

  it('refresh token refusé par le serveur (400) : déconnecte', async () => {
    storedAccess = VALID_TOKEN;
    rawAxiosMock.onPost(REFRESH_URL).reply(400);
    apiMock.onGet('secure/').reply(401);

    await expect(apiClient.get('secure/')).rejects.toBeTruthy();

    expect(mockLogout).toHaveBeenCalledTimes(1);
  });

  it('sans refresh token du tout : déconnecte sans appeler le serveur', async () => {
    storedAccess = VALID_TOKEN;
    storedRefresh = null;
    apiMock.onGet('secure/').reply(401);

    await expect(apiClient.get('secure/')).rejects.toBeTruthy();

    expect(rawAxiosMock.history.post).toHaveLength(0);
    expect(mockLogout).toHaveBeenCalledTimes(1);
  });
});
