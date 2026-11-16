import { needsVerificationNotice } from './verification';

describe('needsVerificationNotice', () => {
  it('rien tant que le statut n est pas chargé', () => {
    expect(needsVerificationNotice(undefined)).toBe(false);
    expect(needsVerificationNotice(undefined, false)).toBe(false);
  });

  it('prévient quand la requête a répondu sans statut (aucun dossier)', () => {
    expect(needsVerificationNotice(undefined, true)).toBe(true);
    expect(needsVerificationNotice(null, true)).toBe(true);
    expect(needsVerificationNotice('NO_PROFILE', true)).toBe(true);
  });

  it('un statut VERIFIED ne prévient jamais, même une fois la requête terminée', () => {
    expect(needsVerificationNotice('VERIFIED', true)).toBe(false);
  });

  it('rien pour un transporteur vérifié', () => {
    expect(needsVerificationNotice('VERIFIED')).toBe(false);
  });

  it.each(['UNVERIFIED', 'PENDING', 'PARTIALLY_REVIEWED', 'REJECTED', 'SUSPENDED'] as const)(
    'prévient pour %s',
    (status) => {
      expect(needsVerificationNotice(status)).toBe(true);
    },
  );
});
