import { completeErrorText, lockMinutes } from './completeErrorText';
import { CompleteError } from './useCompleteJob';

// `t` factice : renvoie la clé et les variables, pour voir ce qui est choisi.
const t = (key: string, options?: Record<string, string | number>) =>
  options ? `${key}|${JSON.stringify(options)}` : key;

const details = (retryAfterSeconds: number | null, remainingAttempts: number | null) => ({
  retryAfterSeconds,
  remainingAttempts,
});

describe('lockMinutes', () => {
  it('arrondit à la minute supérieure, jamais moins de 1', () => {
    expect(lockMinutes(900)).toBe(15);
    expect(lockMinutes(541)).toBe(10);
    expect(lockMinutes(5)).toBe(1);
  });
});

describe('completeErrorText', () => {
  it('verrouillage avec délai : affiche les minutes réelles', () => {
    const err = new CompleteError('pin_locked', details(600, null));
    expect(completeErrorText(err, t)).toBe('missions.errors.pin_locked_minutes|{"minutes":10}');
  });

  it('verrouillage sans délai : jusqu à intervention du support', () => {
    const err = new CompleteError('pin_locked', details(null, null));
    expect(completeErrorText(err, t)).toBe('missions.errors.pin_locked');
  });

  it('code faux avec essais restants : affiche le nombre', () => {
    const err = new CompleteError('pin_invalid', details(null, 3));
    expect(completeErrorText(err, t)).toBe('missions.errors.pin_invalid_remaining|{"n":3}');
  });

  it('code faux sans compteur : texte simple', () => {
    expect(completeErrorText(new CompleteError('pin_invalid'), t)).toBe('missions.errors.pin_invalid');
  });

  it('unknown retombe sur state', () => {
    expect(completeErrorText(new CompleteError('unknown'), t)).toBe('missions.errors.state');
  });
});
