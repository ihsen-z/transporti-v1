import { tokenService } from './tokenService';
import { queryClient } from '@/core/api/queryClient';
import { clearPersistedQueries } from '@/core/api/queryPersister';
import { revokeRefreshToken } from './serverLogout';
import { useAuthStore } from './authStore';

// Tout est mocke : on teste le contrat de deconnexion, pas le stockage natif
// (ni MMKV ni le Keystore n'existent sous Jest).
jest.mock('./tokenService', () => ({
  tokenService: {
    clear: jest.fn(() => Promise.resolve()),
    getRefresh: jest.fn(() => Promise.resolve('refresh-1')),
    getAccess: jest.fn(() => Promise.resolve('access-1')),
  },
}));

jest.mock('./serverLogout', () => ({
  revokeRefreshToken: jest.fn(() => Promise.resolve()),
}));

jest.mock('@/core/api/queryClient', () => ({
  queryClient: { clear: jest.fn() },
}));

jest.mock('@/core/api/queryPersister', () => ({
  clearPersistedQueries: jest.fn(),
}));

const clearTokens = tokenService.clear as jest.MockedFunction<typeof tokenService.clear>;
const clearQueryClient = queryClient.clear as jest.MockedFunction<typeof queryClient.clear>;
const clearCache = clearPersistedQueries as jest.MockedFunction<typeof clearPersistedQueries>;

beforeEach(() => {
  jest.clearAllMocks();
});

// Le cache React Query est persiste EN CLAIR dans MMKV et contient des donnees
// personnelles (messages, telephones, trajets). Sans purge, elles seraient
// rehydratees au prochain demarrage — pour le compte suivant.
describe('logout', () => {
  it('efface les tokens, le cache memoire ET le cache persiste', async () => {
    await useAuthStore.getState().logout();

    expect(clearTokens).toHaveBeenCalledTimes(1);
    expect(clearQueryClient).toHaveBeenCalledTimes(1);
    expect(clearCache).toHaveBeenCalledTimes(1);
  });

  it('remet la session a zero', async () => {
    await useAuthStore.getState().logout();

    expect(useAuthStore.getState().user).toBeNull();
    expect(useAuthStore.getState().status).toBe('unauthenticated');
  });
});

describe('logout : révocation serveur', () => {
  it('appelle la révocation avec le jeton lu avant l effacement', async () => {
    await useAuthStore.getState().logout();
    expect(revokeRefreshToken).toHaveBeenCalledWith('refresh-1', 'access-1');
  });

  it('se déconnecte quand même si la révocation ne répond jamais', async () => {
    (revokeRefreshToken as jest.Mock).mockReturnValueOnce(new Promise(() => undefined));
    await useAuthStore.getState().logout();
    expect(useAuthStore.getState().status).toBe('unauthenticated');
    expect(clearTokens).toHaveBeenCalledTimes(1);
  });
});
