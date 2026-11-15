import axios from 'axios';
import { revokeRefreshToken } from './serverLogout';

jest.mock('axios', () => ({ post: jest.fn() }));
jest.mock('@/core/env', () => ({ env: { apiBaseUrl: 'http://api.test/api/v1' } }));

const post = axios.post as jest.MockedFunction<typeof axios.post>;

beforeEach(() => jest.clearAllMocks());

describe('revokeRefreshToken', () => {
  it('envoie le jeton de rafraîchissement à auth/logout/', async () => {
    post.mockResolvedValueOnce({ data: {} });
    await revokeRefreshToken('refresh-1', 'access-1');
    expect(post).toHaveBeenCalledWith(
      'http://api.test/api/v1/auth/logout/',
      { refresh: 'refresh-1' },
      expect.objectContaining({ headers: { Authorization: 'Bearer access-1' } }),
    );
  });

  it('n échoue jamais : réseau coupé ou route absente', async () => {
    post.mockRejectedValueOnce(new Error('Network Error'));
    await expect(revokeRefreshToken('refresh-1', null)).resolves.toBeUndefined();
  });

  it('ne fait aucun appel sans jeton', async () => {
    await revokeRefreshToken(null, null);
    expect(post).not.toHaveBeenCalled();
  });
});
