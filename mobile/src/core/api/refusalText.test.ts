import { isKycRequired, refusalText } from './refusalText';

// `t` factice : renvoie la clé, pour voir laquelle a été choisie.
const t = (key: string) => `t:${key}`;

describe('refusalText', () => {
  it('code connu : le texte local traduit passe avant celui du serveur (français)', () => {
    expect(refusalText('Plafond de 200 DT atteint.', 'COMMISSION_DEBT_LIMIT', t, 'x.forbidden')).toBe(
      't:refusals.COMMISSION_DEBT_LIMIT',
    );
    expect(refusalText('Vos pièces ne sont pas validées.', 'KYC_REQUIRED', t, 'x.forbidden')).toBe(
      't:refusals.KYC_REQUIRED',
    );
  });

  it('code inconnu ou absent : le message du serveur reste le repli', () => {
    expect(refusalText('Message du serveur.', 'AUTRE', t, 'x.forbidden')).toBe('Message du serveur.');
    expect(refusalText('Message du serveur.', null, t, 'x.forbidden')).toBe('Message du serveur.');
  });

  it('retombe sur le texte local du code quand le serveur n a envoyé que le code', () => {
    expect(refusalText(null, 'KYC_REQUIRED', t, 'x.forbidden')).toBe('t:refusals.KYC_REQUIRED');
    expect(refusalText(undefined, 'PIN_LOCKED', t, 'x.forbidden')).toBe('t:refusals.PIN_LOCKED');
  });

  it('retombe sur le repli de l écran pour un code inconnu ou absent', () => {
    expect(refusalText(null, 'AUTRE', t, 'x.forbidden')).toBe('t:x.forbidden');
    expect(refusalText(null, null, t, 'x.forbidden')).toBe('t:x.forbidden');
  });
});

describe('isKycRequired', () => {
  it('ne reconnaît que KYC_REQUIRED', () => {
    expect(isKycRequired('KYC_REQUIRED')).toBe(true);
    expect(isKycRequired('COMMISSION_DEBT_LIMIT')).toBe(false);
    expect(isKycRequired(undefined)).toBe(false);
  });
});
