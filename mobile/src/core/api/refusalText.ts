// Choix du texte à afficher pour un refus du serveur.
//
// Ordre : pour un code CONNU de l'app, le texte local traduit (le serveur
// répond toujours en français : un utilisateur arabophone lirait du français) ;
// sinon le message du serveur ; sinon le repli générique de l'écran.

export const REFUSAL_CODES = ['KYC_REQUIRED', 'COMMISSION_DEBT_LIMIT', 'PIN_LOCKED'] as const;
export type RefusalCode = (typeof REFUSAL_CODES)[number];

function isRefusalCode(code: string | null | undefined): code is RefusalCode {
  return REFUSAL_CODES.some((c) => c === code);
}

export function isKycRequired(code: string | null | undefined): boolean {
  return code === 'KYC_REQUIRED';
}

export function refusalText(
  serverMessage: string | null | undefined,
  code: string | null | undefined,
  t: (key: string) => string,
  fallbackKey: string,
): string {
  if (isRefusalCode(code)) return t(`refusals.${code}`);
  if (serverMessage) return serverMessage;
  return t(fallbackKey);
}
