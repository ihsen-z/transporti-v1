import { extractTokenPair } from './tokenPair';

describe('extractTokenPair', () => {
  it('lit la paire de jetons renvoyée par le serveur', () => {
    expect(extractTokenPair({ message: 'ok', tokens: { access: 'a', refresh: 'r' } })).toEqual({
      access: 'a',
      refresh: 'r',
    });
  });

  it('renvoie null quand le serveur n en joint pas (ancienne version)', () => {
    expect(extractTokenPair({ message: 'ok' })).toBeNull();
    expect(extractTokenPair(undefined)).toBeNull();
    expect(extractTokenPair('ok')).toBeNull();
  });

  it('renvoie null pour une forme incomplète ou invalide', () => {
    expect(extractTokenPair({ tokens: { access: 'a' } })).toBeNull();
    expect(extractTokenPair({ tokens: { access: '', refresh: 'r' } })).toBeNull();
    expect(extractTokenPair({ tokens: { access: 1, refresh: 2 } })).toBeNull();
    expect(extractTokenPair({ tokens: null })).toBeNull();
  });
});
