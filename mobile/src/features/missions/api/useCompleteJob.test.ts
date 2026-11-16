import { classifyCompleteFailure, parseCompleteDetails } from './useCompleteJob';

describe('classifyCompleteFailure', () => {
  it('PIN_LOCKED en 423', () => {
    expect(classifyCompleteFailure(423, 'PIN_LOCKED')).toBe('pin_locked');
  });

  it('PIN_LOCKED en 429', () => {
    expect(classifyCompleteFailure(429, 'PIN_LOCKED')).toBe('pin_locked');
  });

  it('423 sans code reste un verrouillage', () => {
    expect(classifyCompleteFailure(423, undefined)).toBe('pin_locked');
  });

  it('un 429 sans code n est pas un verrouillage (limiteur général)', () => {
    expect(classifyCompleteFailure(429, undefined)).toBe('unknown');
  });

  it('garde PIN_REQUIRED et PIN_INVALID', () => {
    expect(classifyCompleteFailure(400, 'PIN_REQUIRED')).toBe('pin_required');
    expect(classifyCompleteFailure(400, 'PIN_INVALID')).toBe('pin_invalid');
    expect(classifyCompleteFailure(400, undefined)).toBe('state');
  });

  it('403 et réseau', () => {
    expect(classifyCompleteFailure(403, undefined)).toBe('forbidden');
    expect(classifyCompleteFailure(undefined, undefined)).toBe('network');
  });
});

describe('parseCompleteDetails', () => {
  it('lit le délai de verrouillage et les essais restants', () => {
    expect(parseCompleteDetails({ retry_after_seconds: 540 })).toEqual({
      retryAfterSeconds: 540,
      remainingAttempts: null,
    });
    expect(parseCompleteDetails({ remaining_attempts: 2 })).toEqual({
      retryAfterSeconds: null,
      remainingAttempts: 2,
    });
  });

  it('un délai absent ou nul vaut « verrouillé jusqu au support »', () => {
    expect(parseCompleteDetails({ retry_after_seconds: null }).retryAfterSeconds).toBeNull();
    expect(parseCompleteDetails({ retry_after_seconds: 0 }).retryAfterSeconds).toBeNull();
    expect(parseCompleteDetails(undefined).retryAfterSeconds).toBeNull();
  });

  it('zéro essai restant est une valeur valide', () => {
    expect(parseCompleteDetails({ remaining_attempts: 0 }).remainingAttempts).toBe(0);
  });
});
