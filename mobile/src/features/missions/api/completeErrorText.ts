import type { CompleteError } from './useCompleteJob';

// Fonction de traduction minimale (compatible avec celle de react-i18next).
type Translate = (key: string, options?: Record<string, string | number>) => string;

// Secondes de verrouillage -> minutes affichables, jamais moins de 1.
export function lockMinutes(seconds: number): number {
  return Math.max(1, Math.ceil(seconds / 60));
}

// Texte d'un échec de clôture, avec le délai réel de verrouillage et le nombre
// d'essais restants quand le serveur les donne. 'unknown' retombe sur 'state'.
export function completeErrorText(error: CompleteError, t: Translate): string {
  const { retryAfterSeconds, remainingAttempts } = error.details;

  if (error.kind === 'pin_locked') {
    // Sans délai : verrouillé jusqu'à intervention du support.
    return retryAfterSeconds
      ? t('missions.errors.pin_locked_minutes', { minutes: lockMinutes(retryAfterSeconds) })
      : t('missions.errors.pin_locked');
  }
  if (error.kind === 'pin_invalid' && remainingAttempts !== null) {
    return t('missions.errors.pin_invalid_remaining', { n: remainingAttempts });
  }
  return t(`missions.errors.${error.kind === 'unknown' ? 'state' : error.kind}`);
}
