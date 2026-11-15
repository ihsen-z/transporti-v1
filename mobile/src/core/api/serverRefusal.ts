import { extractServerMessage } from './serverMessage';

// Refus métier du serveur : un message lisible ET, quand il existe, un `code`
// stable (`KYC_REQUIRED`, `COMMISSION_DEBT_LIMIT`, `PIN_LOCKED`…).
//
// La forme exacte du corps n'est pas figée côté serveur : le message peut se
// trouver dans `error`, `detail` ou `message`, et le code dans `code`. Ce
// module lit tout cela de façon tolérante, pour que le mobile n'ait pas à
// suivre chaque ajustement. Le texte du serveur est affiché tel quel (il porte
// les chiffres : plafond, délai) ; le code sert à choisir une action ou un
// repli localisé.

export interface ServerRefusal {
  /** Texte rédigé par le serveur, ou `null` s'il n'en a pas fourni. */
  message: string | null;
  /** Code machine stable, ou `null`. */
  code: string | null;
}

export function parseServerRefusal(data: unknown): ServerRefusal {
  if (typeof data !== 'object' || data === null || Array.isArray(data)) {
    return { message: null, code: null };
  }
  const { code: brut, ...reste } = data as Record<string, unknown>;
  const code = typeof brut === 'string' && brut.trim() !== '' ? brut.trim() : null;

  // `message` passe après `error`/`detail`, avant les erreurs de champ. Le
  // `code` est retiré : sinon `extractServerMessage` le prendrait pour un texte
  // quand le corps n'a rien d'autre.
  const message = extractServerMessage({
    ...reste,
    error: reste.error ?? reste.message,
  });
  return { message, code };
}
