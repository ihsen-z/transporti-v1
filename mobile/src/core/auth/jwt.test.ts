import { jwtExpiryMs } from './jwt';

// Fabrique un JWT syntaxiquement valide (l'entête et la signature ne sont
// jamais lus par jwtExpiryMs, seul le payload compte). Buffer est disponible
// dans l'environnement Node de Jest — jwt.ts, lui, ne s'appuie dessus nulle
// part (voir son commentaire sur `atob`).
function fakeJwt(payload: Record<string, unknown>): string {
  const base64url = (obj: unknown) =>
    Buffer.from(JSON.stringify(obj))
      .toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');
  return `${base64url({ alg: 'HS256' })}.${base64url(payload)}.signature`;
}

describe('jwtExpiryMs', () => {
  it("lit l'expiration (secondes epoch -> ms epoch)", () => {
    expect(jwtExpiryMs(fakeJwt({ exp: 1_800_000_000 }))).toBe(1_800_000_000_000);
  });

  it('rend null pour un token à la structure invalide (pas 3 segments)', () => {
    expect(jwtExpiryMs('pas.un.jwt.valide')).toBeNull();
    expect(jwtExpiryMs('unseul segment')).toBeNull();
  });

  it('rend null pour un payload JSON illisible', () => {
    expect(jwtExpiryMs('aaa.@@@invalide@@@.bbb')).toBeNull();
  });

  it("rend null quand la revendication exp est absente", () => {
    expect(jwtExpiryMs(fakeJwt({ user_id: 42 }))).toBeNull();
  });

  it('rend null quand exp n\'est pas un nombre', () => {
    expect(jwtExpiryMs(fakeJwt({ exp: '1800000000' }))).toBeNull();
  });
});
