import { normalizeRoute, resolveDeepLinkAction } from './resolve';

describe('normalizeRoute', () => {
  it('recompose la route quel que soit le découpage de la plateforme', () => {
    // Les trois formes observées pour le MÊME lien selon la plateforme.
    expect(normalizeRoute('payment', 'callback')).toBe('payment/callback');
    expect(normalizeRoute(null, 'payment/callback')).toBe('payment/callback');
    expect(normalizeRoute('payment', '/callback/')).toBe('payment/callback');
  });

  it('tolère les segments vides et la casse', () => {
    expect(normalizeRoute('', '//Payment//Callback//')).toBe('payment/callback');
    expect(normalizeRoute(undefined, undefined)).toBe('');
  });
});

describe('resolveDeepLinkAction — retour de paiement', () => {
  it('reconnaît un succès et en extrait la référence passerelle', () => {
    const action = resolveDeepLinkAction({
      hostname: 'payment',
      path: 'callback',
      queryParams: { status: 'success', job_id: '42', ref: 'SANDBOX-ABC123' },
    });
    expect(action).toEqual({
      type: 'payment-callback',
      jobId: 42,
      success: true,
      gatewayRef: 'SANDBOX-ABC123',
    });
  });

  it("ne marque PAS comme réussi un retour d'échec", () => {
    // Un faux positif ici vérifierait un paiement qui n'a pas eu lieu.
    const action = resolveDeepLinkAction({
      hostname: 'payment',
      path: 'callback',
      queryParams: { status: 'failed', job_id: '42' },
    });
    expect(action).toMatchObject({ type: 'payment-callback', success: false });
  });

  it('rejette un job_id non numérique plutôt que de router vers NaN', () => {
    const action = resolveDeepLinkAction({
      path: 'payment/callback',
      queryParams: { status: 'success', job_id: 'abc' },
    });
    expect(action).toMatchObject({ jobId: null });
  });

  it('prend la première valeur quand un paramètre est répété', () => {
    const action = resolveDeepLinkAction({
      path: 'payment/callback',
      queryParams: { status: 'success', job_id: ['7', '9'], ref: ['R1', 'R2'] },
    });
    expect(action).toMatchObject({ jobId: 7, gatewayRef: 'R1' });
  });
});

describe('resolveDeepLinkAction — réinitialisation de mot de passe', () => {
  it('extrait uid et token', () => {
    expect(
      resolveDeepLinkAction({
        hostname: 'reset-password',
        queryParams: { uid: 'Mg', token: 'abc-def' },
      }),
    ).toEqual({ type: 'reset-password', uid: 'Mg', token: 'abc-def' });
  });

  it('ignore un lien incomplet', () => {
    expect(
      resolveDeepLinkAction({ hostname: 'reset-password', queryParams: { uid: 'Mg' } }),
    ).toEqual({ type: 'unknown' });
  });
});

describe('resolveDeepLinkAction — liens inconnus', () => {
  it("n'invente pas d'action", () => {
    expect(resolveDeepLinkAction({ hostname: 'autre', path: 'chose' })).toEqual({
      type: 'unknown',
    });
    expect(resolveDeepLinkAction({})).toEqual({ type: 'unknown' });
  });
});
