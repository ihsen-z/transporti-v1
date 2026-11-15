// Normalisation des erreurs de connexion. Isolé de `useLogin` pour rester une
// fonction pure, donc testable sans axios ni store.

// Types d'erreur métier exposés à l'UI (pas de fuite d'axios dans l'écran).
export type LoginErrorKind = 'invalid_credentials' | 'locked' | 'network' | 'unknown';

export class LoginError extends Error {
  constructor(public readonly kind: LoginErrorKind) {
    super(kind);
    this.name = 'LoginError';
  }
}

// Un 400 d'identifiants est un objet JSON, jamais une page HTML. Le serveur
// répondait jadis `{email: "No account found…"}` ou `{password: "Invalid
// password."}` ; il répond désormais UN message neutre, identique pour un
// e-mail inconnu et un mauvais mot de passe (pas d'énumération de comptes).
// La clé qui porte ce message n'est pas figée : on reconnaît les clés
// historiques de champ ET les clés génériques `error` / `non_field_errors` /
// `code`. On ne s'appuie JAMAIS sur le texte lui-même, qui peut changer.
//
// `detail` seul reste « inconnu » : DRF s'en sert pour une requête mal formée.
const CREDENTIAL_KEYS = ['email', 'password', 'error', 'non_field_errors', 'code'];

function isCredentialFieldError(data: unknown): boolean {
  if (typeof data !== 'object' || data === null) return false;
  return CREDENTIAL_KEYS.some((key) => key in data);
}

/**
 * Traduit une réponse d'erreur HTTP en cause métier.
 *
 * `status` vaut `undefined` quand aucune réponse n'est parvenue.
 *
 * Tout 400 n'est PAS un refus d'identifiants. Django répond lui aussi 400,
 * avec une page HTML, quand l'hôte appelé est absent d'ALLOWED_HOSTS
 * (DisallowedHost) — le cas exact d'un émulateur qui appelle 10.0.2.2 sans
 * que le backend l'autorise. Confondre les deux fait afficher « e-mail ou mot
 * de passe incorrect » sur une erreur de configuration serveur : l'utilisateur
 * vérifie sa frappe indéfiniment alors que ses identifiants sont bons.
 */
export function classifyLoginError(status: number | undefined, data: unknown): LoginErrorKind {
  if (status === undefined) return 'network';
  // Compte verrouillé après des échecs répétés (423), ou limiteur de tentatives
  // (429) : dans les deux cas réessayer tout de suite est inutile.
  if (status === 423 || status === 429) return 'locked';
  if (status === 400) {
    return isCredentialFieldError(data) ? 'invalid_credentials' : 'unknown';
  }
  return 'unknown';
}
