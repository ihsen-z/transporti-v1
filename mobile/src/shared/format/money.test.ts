import { formatAmount } from './money';

// Espace fine insécable utilisée comme séparateur de milliers.
const NBSP = ' ';

describe('formatAmount', () => {
  it('groupe les milliers à la française', () => {
    expect(formatAmount(1240)).toBe(`1${NBSP}240`);
    expect(formatAmount(880)).toBe('880');
    expect(formatAmount(1234567)).toBe(`1${NBSP}234${NBSP}567`);
  });

  it('laisse les entiers sans décimales', () => {
    expect(formatAmount(0)).toBe('0');
    expect(formatAmount(95)).toBe('95');
  });

  it('rend les millimes et retire les zéros de queue', () => {
    expect(formatAmount(12.5)).toBe('12,5');
    expect(formatAmount(12.25)).toBe('12,25');
    expect(formatAmount(12.125)).toBe('12,125');
  });

  it('arrondit au millime, plus petite unité du dinar', () => {
    expect(formatAmount(12.0001)).toBe('12');
    expect(formatAmount(12.9999)).toBe('13');
  });

  it('conserve le signe négatif', () => {
    expect(formatAmount(-1240.5)).toBe(`-1${NBSP}240,5`);
  });

  it('rend « — » pour une valeur non finie plutôt que « NaN »', () => {
    expect(formatAmount(Number.NaN)).toBe('—');
    expect(formatAmount(Number.POSITIVE_INFINITY)).toBe('—');
  });
});
