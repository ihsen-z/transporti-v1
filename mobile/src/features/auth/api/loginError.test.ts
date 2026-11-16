import { classifyLoginError } from './loginError';

describe('classifyLoginError', () => {
  it('traite un 400 de champ comme un refus d identifiants', () => {
    // Formes réelles de UserLoginSerializer.validate.
    expect(classifyLoginError(400, { email: 'No account found with this email.' })).toBe(
      'invalid_credentials',
    );
    expect(classifyLoginError(400, { password: 'Invalid password.' })).toBe(
      'invalid_credentials',
    );
    // Erreurs de champ DRF sous forme de listes.
    expect(classifyLoginError(400, { email: ['Enter a valid email address.'] })).toBe(
      'invalid_credentials',
    );
  });

  it("n'accuse PAS les identifiants sur un 400 d'infrastructure", () => {
    // DisallowedHost : Django répond 400 avec une page HTML quand l'hôte appelé
    // est absent d'ALLOWED_HOSTS. C'est le cas d'un émulateur sur 10.0.2.2 :
    // les identifiants sont bons, seule la configuration est fautive.
    const html = '<!DOCTYPE html><html><body><h1>Bad Request (400)</h1></body></html>';
    expect(classifyLoginError(400, html)).toBe('unknown');
    expect(classifyLoginError(400, undefined)).toBe('unknown');
    expect(classifyLoginError(400, null)).toBe('unknown');
    // Un corps JSON sans clé de champ n'est pas un refus d'identifiants non plus.
    expect(classifyLoginError(400, { detail: 'Malformed request.' })).toBe('unknown');
  });

  it('signale une absence de réponse comme un problème réseau', () => {
    expect(classifyLoginError(undefined, undefined)).toBe('network');
  });

  it('range les autres statuts en inconnu', () => {
    // 500 = erreur serveur : ne doit pas laisser croire à une faute de frappe.
    expect(classifyLoginError(500, 'Server Error')).toBe('unknown');
    expect(classifyLoginError(401, { detail: 'Unauthorized' })).toBe('unknown');
  });
});

describe('classifyLoginError : message neutre du serveur', () => {
  it('reconnaît un refus d identifiants quelle que soit la clé du message neutre', () => {
    expect(classifyLoginError(400, { error: 'Identifiants incorrects.' })).toBe('invalid_credentials');
    expect(classifyLoginError(400, { non_field_errors: ['Identifiants incorrects.'] })).toBe(
      'invalid_credentials',
    );
    expect(classifyLoginError(400, { code: 'INVALID_CREDENTIALS', detail: 'x' })).toBe(
      'invalid_credentials',
    );
  });

  it('un e-mail inconnu et un mauvais mot de passe donnent la même cause', () => {
    const inconnu = classifyLoginError(400, { error: 'Identifiants incorrects.' });
    const faux = classifyLoginError(400, { error: 'Identifiants incorrects.' });
    expect(inconnu).toBe(faux);
  });

  it('compte verrouillé : 423 et 429 donnent « locked »', () => {
    expect(classifyLoginError(423, { detail: 'Compte verrouillé.' })).toBe('locked');
    expect(classifyLoginError(429, { detail: 'Request was throttled.' })).toBe('locked');
  });
});
