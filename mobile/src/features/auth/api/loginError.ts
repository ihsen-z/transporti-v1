// Normalisation des erreurs de connexion. Isolé de `useLogin` pour rester une
// fonction pure, donc testable sans axios ni store.

// Types d'erreur métier exposés à l'UI (pas de fuite d'axios dans l'écran).
export type LoginErrorKind = 'invalid_credentials' | 'network' | 'unknown';

export class LoginError extends Error {
  constructor(public readonly kind: LoginErrorKind) {
    super(kind);
    this.name = 'LoginError';
  }
}

// Un 400 d'identifiants vient de `serializer.errors` (UserLoginSerializer) :
// c'est un objet JSON portant la clé `email` ou `password`, qu'axios a parsé.
function isCredentialFieldError(data: unknown): boolean {
  if (typeof data !== 'object' || data === null) return false;
  return 'email' in data || 'password' in data;
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
  if (status === 400) {
    return isCredentialFieldError(data) ? 'invalid_credentials' : 'unknown';
  }
  return 'unknown';
}
