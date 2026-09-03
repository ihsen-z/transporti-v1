import {
  PREFERER_MESSAGE_SERVEUR,
  classifySendRequestError,
} from './requestError';

describe('classifySendRequestError', () => {
  it("désigne le champ quand le sérialiseur refuse une valeur", () => {
    // Forme réelle relevée en recette du 03/09 : une demande sans description
    // est refusée par le message par défaut de DRF, en anglais. C'est le NOM
    // du champ qui porte l'information, pas le texte.
    expect(
      classifySendRequestError(400, { description: ['This field may not be blank.'] }),
    ).toEqual({
      kind: 'field',
      field: 'description',
      serverMessage: 'This field may not be blank.',
    });

    // Validateur personnalisé : le texte est en français et porte le seuil.
    expect(
      classifySendRequestError(400, {
        payment_method: ['Paiement à la livraison limité à 300 TND. Choisissez le paiement digital.'],
      }),
    ).toEqual({
      kind: 'field',
      field: 'payment_method',
      serverMessage:
        'Paiement à la livraison limité à 300 TND. Choisissez le paiement digital.',
    });

    // Certaines vues renvoient une chaîne nue plutôt qu'une liste.
    expect(
      classifySendRequestError(400, { proposed_price: 'Le prix proposé doit être supérieur à 0.' }),
    ).toEqual({
      kind: 'field',
      field: 'proposed_price',
      serverMessage: 'Le prix proposé doit être supérieur à 0.',
    });
  });

  it('conserve le message métier de la vue tel quel', () => {
    // `logistics/views/trip_requests.py` : ces textes sont déjà rédigés en
    // français et portent une information que nous ne pourrions pas
    // reconstituer (quelle demande est déjà en cours, quel trajet est expiré).
    for (const message of [
      "Ce trajet n'est plus disponible.",
      'Ce trajet retour est expiré.',
      'Vous avez déjà une demande en cours sur ce trajet.',
    ]) {
      expect(classifySendRequestError(400, { error: message })).toEqual({
        kind: 'server',
        field: null,
        serverMessage: message,
      });
    }

    // 403 de rôle, même forme.
    expect(
      classifySendRequestError(403, {
        error: 'Seuls les clients peuvent envoyer une demande sur un trajet retour.',
      }),
    ).toEqual({
      kind: 'server',
      field: null,
      serverMessage:
        'Seuls les clients peuvent envoyer une demande sur un trajet retour.',
    });

    // `detail` couvre les refus DRF génériques (permission, méthode).
    expect(
      classifySendRequestError(405, { detail: 'Method "POST" not allowed.' }),
    ).toEqual({
      kind: 'server',
      field: null,
      serverMessage: 'Method "POST" not allowed.',
    });
  });

  it("privilégie le message de la vue quand les deux formes coexistent", () => {
    // Défense de l'ordre de lecture : `error` est une décision métier, une
    // erreur de champ n'est qu'une valeur à corriger.
    expect(
      classifySendRequestError(400, {
        error: "Ce trajet n'est plus disponible.",
        description: ['This field may not be blank.'],
      }).kind,
    ).toBe('server');
  });

  it("garde le premier champ dans l'ordre du formulaire", () => {
    // Deux champs refusés ensemble : on pointe celui que l'utilisateur
    // rencontre en premier à l'écran, pas celui que le serveur a sérialisé en
    // premier.
    const failure = classifySendRequestError(400, {
      payment_method: ['Trop élevé pour un paiement à la livraison.'],
      description: ['This field may not be blank.'],
    });
    expect(failure.field).toBe('description');
  });

  it('remonte un texte utile pour un champ que l’écran ne sait pas montrer', () => {
    // `photos` n'a pas d'emplacement dans la feuille : on ne peut rien
    // pointer, mais le texte du serveur reste préférable au silence.
    expect(classifySendRequestError(400, { photos: ['Trop de photos.'] })).toEqual({
      kind: 'field',
      field: null,
      serverMessage: 'Trop de photos.',
    });

    expect(
      classifySendRequestError(400, { non_field_errors: ['Demande incohérente.'] }),
    ).toEqual({ kind: 'server', field: null, serverMessage: 'Demande incohérente.' });
  });

  it('signale une absence de réponse comme un problème réseau', () => {
    expect(classifySendRequestError(undefined, undefined)).toEqual({
      kind: 'network',
      field: null,
      serverMessage: null,
    });
  });

  it("range en inconnu ce dont on ne peut rien dire", () => {
    // DisallowedHost renvoie une page HTML : aucun champ, aucun message
    // exploitable. Ne rien inventer plutôt que d'accuser une valeur saisie.
    const html = '<!DOCTYPE html><html><body><h1>Bad Request (400)</h1></body></html>';
    expect(classifySendRequestError(400, html).kind).toBe('unknown');
    expect(classifySendRequestError(500, null).kind).toBe('unknown');
    expect(classifySendRequestError(400, {}).kind).toBe('unknown');
    // Un tableau nu, ou des valeurs vides, ne portent rien non plus.
    expect(classifySendRequestError(400, ['oops']).kind).toBe('unknown');
    expect(classifySendRequestError(400, { description: [] }).kind).toBe('field');
    expect(classifySendRequestError(400, { description: ['   '] }).serverMessage).toBeNull();
  });
});

describe('PREFERER_MESSAGE_SERVEUR', () => {
  it("n'affiche pas le message anglais de DRF sur la description", () => {
    // Seul champ refusé par un défaut DRF non traduit : c'est notre texte qui
    // doit s'afficher, pas « This field may not be blank. ».
    expect(PREFERER_MESSAGE_SERVEUR.description).toBe(false);
  });

  it('laisse parler les validateurs français du serveur', () => {
    // Ceux-là portent le seuil exact ; le reformuler côté mobile ferait deux
    // sources pour un même chiffre.
    expect(PREFERER_MESSAGE_SERVEUR.proposed_price).toBe(true);
    expect(PREFERER_MESSAGE_SERVEUR.payment_method).toBe(true);
  });
});
