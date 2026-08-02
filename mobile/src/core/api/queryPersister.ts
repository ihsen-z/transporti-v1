import Constants from 'expo-constants';
import { createSyncStoragePersister } from '@tanstack/query-sync-storage-persister';
import type { PersistQueryClientOptions } from '@tanstack/react-query-persist-client';
import { appStorage } from '@/core/storage/appStorage';

// Persistance du cache React Query dans MMKV. C'est ici que le stockage
// SYNCHRONE paie vraiment : le cache est réhydraté sans aller-retour
// asynchrone, donc les listes (trajets, demandes, messages) s'affichent dès le
// démarrage à froid, avant la première réponse réseau — ce qui compte sur une
// connexion instable.
//
// /!\ MMKV n'est pas chiffré et ce cache contient des données personnelles
// (messages, téléphones, trajets). Il est donc purgé à la déconnexion, cf.
// authStore.logout. Aucun token n'y transite : ils restent dans le Keystore
// via tokenService.
const CACHE_KEY = 'transporti.query-cache';

/**
 * Au-delà de cette durée, un cache persisté est jeté au lieu d'être réhydraté.
 * Sert aussi de `gcTime` au QueryClient : sans cela React Query supprimerait
 * les requêtes inactives au bout de 5 minutes et il ne resterait rien à
 * persister.
 */
export const CACHE_MAX_AGE = 1000 * 60 * 60 * 24; // 24 h

// Un changement de version d'app invalide tout le cache : la forme des DTO
// peut avoir changé entre deux releases, et réhydrater l'ancienne planterait
// les écrans plutôt que de les accélérer.
const APP_VERSION = Constants.expoConfig?.version ?? 'dev';

const persister = createSyncStoragePersister({
  key: CACHE_KEY,
  storage: {
    getItem: (key) => appStorage.getString(key),
    setItem: (key, value) => appStorage.setString(key, value),
    removeItem: (key) => appStorage.remove(key),
  },
});

// Requêtes tenues hors du cache persisté. Elles sont sondées en continu
// (5 à 15 s) : les persister ferait resérialiser tout le cache à chaque tour.
// Et une valeur périmée y serait trompeuse (un compteur de non-lus faux à
// l'ouverture) ou inutile (le fil de discussion est rechargé à l'écran).
const VOLATILE_QUERY_KEYS = new Set(['notificationsUnreadCount', 'jobMessages']);

/**
 * Une clé de requête est-elle éligible au cache persisté ? La racine de la clé
 * (`queryKey[0]`) suffit à décider : `['jobMessages', 42]` est exclue comme
 * `['jobMessages']`.
 */
export function isPersistableQueryKey(queryKey: readonly unknown[]): boolean {
  const root = queryKey[0];
  return typeof root !== 'string' || !VOLATILE_QUERY_KEYS.has(root);
}

export const persistOptions: Omit<PersistQueryClientOptions, 'queryClient'> = {
  persister,
  maxAge: CACHE_MAX_AGE,
  buster: APP_VERSION,
  dehydrateOptions: {
    shouldDehydrateQuery: (query) =>
      // Ne persister que les requêtes abouties : réhydrater une erreur ou un
      // chargement en cours fausserait l'état initial de l'écran.
      query.state.status === 'success' && isPersistableQueryKey(query.queryKey),
  },
};

/** Supprime le cache persisté. Appelé à la déconnexion. */
export function clearPersistedQueries(): void {
  appStorage.remove(CACHE_KEY);
}
