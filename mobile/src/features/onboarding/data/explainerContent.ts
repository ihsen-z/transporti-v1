import type { IconName } from '@/shared/ui/icons';

export type Parcours = 'CLIENT' | 'TRANSPORTER';

export interface Etape {
  cle: string;
  icone: IconName;
  /** Clé de texte à utiliser à la place de `cle` quand le paiement en ligne est coupé. */
  cleEspeces?: string;
  /** Étape qui n'existe qu'avec un paiement en ligne (séquestre à libérer). */
  enLigneSeulement?: boolean;
}

export interface Garantie {
  cle: string;
  icone: IconName;
  enLigneSeulement?: boolean;
}

/** Étapes d'un parcours, dans l'ordre où l'utilisateur les rencontre. */
export const ETAPES: Record<Parcours, readonly Etape[]> = {
  CLIENT: [
    { cle: 'search', icone: 'search' },
    { cle: 'compare', icone: 'shield-check' },
    { cle: 'request', icone: 'send' },
    // « Paiement en ligne : la somme est retenue… » est faux en espèces seules.
    { cle: 'pay', icone: 'banknote', cleEspeces: 'pay_cash' },
    { cle: 'track', icone: 'route' },
    // Confirmer la réception libère un séquestre : sans paiement en ligne, il n'y en a pas.
    { cle: 'confirm', icone: 'circle-check', enLigneSeulement: true },
  ],
  TRANSPORTER: [
    { cle: 'publish', icone: 'circle-plus' },
    { cle: 'decide', icone: 'inbox' },
    { cle: 'start', icone: 'truck' },
    { cle: 'deliver', icone: 'circle-check' },
    // « Solde retirable » est faux en espèces seules : variante sans retrait.
    { cle: 'earn', icone: 'trending-up', cleEspeces: 'earn_cash' },
    // Demander un virement n'existe pas quand le client paie en espèces.
    { cle: 'withdraw', icone: 'wallet', enLigneSeulement: true },
  ],
};

/** Garanties transverses. Le vocabulaire reste celui de l'utilisateur. */
export const GARANTIES: readonly Garantie[] = [
  // Le séquestre n'existe que sur un paiement en ligne.
  { cle: 'escrow', icone: 'lock', enLigneSeulement: true },
  { cle: 'verified', icone: 'shield-check' },
  { cle: 'dispute', icone: 'circle-alert' },
  { cle: 'data', icone: 'file-text' },
];

/**
 * Ce que la page « comment ça marche » annonce doit être vrai : quand le
 * serveur coupe le paiement en ligne (lancement en espèces seules), on ne
 * décrit ni séquestre ni confirmation qui libère un paiement.
 */
export function etapesVisibles(parcours: Parcours, enLigne: boolean): Etape[] {
  return ETAPES[parcours]
    .filter((etape) => enLigne || !etape.enLigneSeulement)
    .map((etape) => (enLigne || !etape.cleEspeces ? etape : { ...etape, cle: etape.cleEspeces }));
}

export function garantiesVisibles(enLigne: boolean): Garantie[] {
  return GARANTIES.filter((g) => enLigne || !g.enLigneSeulement);
}
