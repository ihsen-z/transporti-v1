// Normalisation des erreurs d'envoi de demande. Isolé de `useSendTripRequest`
// pour rester une fonction pure, donc testable sans axios ni serveur — même
// découpage que `features/auth/api/loginError.ts`.
//
// Le serveur refuse de DEUX façons, et les confondre a un coût mesuré :
//
//   1. Règle métier de la vue (`logistics/views/trip_requests.py`) :
//      `{"error": "Ce trajet n'est plus disponible."}`
//      Le texte est déjà rédigé en français — on l'affiche tel quel, sinon on
//      perd l'information (quel trajet, quelle demande déjà en cours).
//
//   2. Validation du sérialiseur (`logistics/serializers.py`, DRF) :
//      `{"description": ["This field may not be blank."]}`
//      Ici c'est le NOM DU CHAMP qui porte l'information ; le texte, lui, peut
//      être un défaut DRF en anglais qu'on ne montre pas à un utilisateur
//      tunisien.
//
// L'ancienne version repliait tout 400 sur un unique message codé en dur
// parlant du plafond COD. Conséquence relevée en recette du 03/09 : une
// demande sans description affichait « Vérifiez le montant (COD ≤ 300 TND) »
// alors que le paiement choisi était digital — le client corrigeait son prix
// indéfiniment sans jamais toucher la vraie cause.

/** Nature du refus, telle que l'écran doit la traiter. */
export type SendRequestErrorKind = 'network' | 'field' | 'server' | 'unknown';

/** Champs que le formulaire sait désigner nommément. */
export type SendRequestField = 'description' | 'proposed_price' | 'payment_method';

const CHAMPS_CONNUS: readonly SendRequestField[] = [
  'description',
  'proposed_price',
  'payment_method',
];

export interface SendRequestFailure {
  kind: SendRequestErrorKind;
  /** Champ en cause, quand le serveur en désigne un que l'écran sait montrer. */
  field: SendRequestField | null;
  /** Message du serveur, quand il en fournit un exploitable tel quel. */
  serverMessage: string | null;
}

export class SendRequestError extends Error {
  constructor(public readonly failure: SendRequestFailure) {
    super(failure.kind);
    this.name = 'SendRequestError';
  }
}

function estObjet(data: unknown): data is Record<string, unknown> {
  return typeof data === 'object' && data !== null && !Array.isArray(data);
}

// DRF sérialise les erreurs de champ en tableau de chaînes ; certaines vues
// renvoient directement une chaîne. On accepte les deux.
function premierMessage(valeur: unknown): string | null {
  if (typeof valeur === 'string') return valeur.trim() || null;
  if (Array.isArray(valeur)) {
    const premier = valeur.find((v) => typeof v === 'string' && v.trim());
    return typeof premier === 'string' ? premier.trim() : null;
  }
  return null;
}

/**
 * Traduit une réponse d'erreur HTTP en cause exploitable par l'écran.
 *
 * `status` vaut `undefined` quand aucune réponse n'est parvenue.
 */
export function classifySendRequestError(
  status: number | undefined,
  data: unknown,
): SendRequestFailure {
  if (status === undefined) {
    return { kind: 'network', field: null, serverMessage: null };
  }

  if (estObjet(data)) {
    // Forme 1 — message métier de la vue. `detail` couvre les refus DRF
    // génériques (permission, méthode) qui prennent la même forme.
    const messageVue = premierMessage(data.error) ?? premierMessage(data.detail);
    if (messageVue) {
      return { kind: 'server', field: null, serverMessage: messageVue };
    }

    // Forme 2 — erreurs de champ. On prend le premier champ connu, en
    // conservant l'ordre de déclaration du formulaire : c'est celui-là que
    // l'utilisateur doit corriger en premier.
    for (const champ of CHAMPS_CONNUS) {
      if (champ in data) {
        return {
          kind: 'field',
          field: champ,
          serverMessage: premierMessage(data[champ]),
        };
      }
    }

    // Champ inconnu de l'écran (ex. `photos`) ou `non_field_errors` : on n'a
    // rien à pointer, mais le texte du serveur reste préférable au silence.
    const messageChamp = premierMessage(data.non_field_errors);
    if (messageChamp) {
      return { kind: 'server', field: null, serverMessage: messageChamp };
    }
    for (const valeur of Object.values(data)) {
      const message = premierMessage(valeur);
      if (message) {
        return { kind: 'field', field: null, serverMessage: message };
      }
    }
  }

  return { kind: 'unknown', field: null, serverMessage: null };
}

/**
 * Politique d'affichage par champ.
 *
 * Les validateurs personnalisés du serveur sont rédigés en français et portent
 * le seuil exact (« Paiement à la livraison limité à 300 TND »)  : leur texte
 * vaut mieux que le nôtre. `description`, à l'inverse, est refusé par le
 * message par défaut de DRF, en anglais — on met alors le nôtre.
 */
export const PREFERER_MESSAGE_SERVEUR: Record<SendRequestField, boolean> = {
  description: false,
  proposed_price: true,
  payment_method: true,
};
