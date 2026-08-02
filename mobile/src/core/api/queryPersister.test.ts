import { isPersistableQueryKey } from './queryPersister';

// Le choix de ce qui entre dans le cache persiste n'est pas cosmetique : une
// requete sondee toutes les 5 s ferait reserialiser tout le cache a chaque
// tour, et un compteur de non-lus perime s'afficherait faux a l'ouverture.
describe('isPersistableQueryKey', () => {
  it('persiste les donnees de liste et le profil', () => {
    expect(isPersistableQueryKey(['auth', 'profile'])).toBe(true);
    expect(isPersistableQueryKey(['myRequests'])).toBe(true);
    expect(isPersistableQueryKey(['myReturnTrips'])).toBe(true);
    expect(isPersistableQueryKey(['conversations'])).toBe(true);
  });

  it('exclut les requetes sondees en continu', () => {
    expect(isPersistableQueryKey(['notificationsUnreadCount'])).toBe(false);
    expect(isPersistableQueryKey(['jobMessages'])).toBe(false);
  });

  it('exclut jobMessages quel que soit son parametre', () => {
    // La cle reelle est ['jobMessages', jobId] : c'est la racine qui decide,
    // sinon chaque conversation ouverte echapperait a l'exclusion.
    expect(isPersistableQueryKey(['jobMessages', 42])).toBe(false);
    expect(isPersistableQueryKey(['jobMessages', null])).toBe(false);
  });

  it('laisse passer une cle dont la racine n est pas une chaine', () => {
    expect(isPersistableQueryKey([42])).toBe(true);
    expect(isPersistableQueryKey([])).toBe(true);
  });
});
