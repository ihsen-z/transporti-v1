import { Platform } from 'react-native';
import { MMKV } from 'react-native-mmkv';

// Stockage clé/valeur SYNCHRONE de l'app, adossé à MMKV (mémoire mappée côté
// natif, nettement plus rapide qu'AsyncStorage). Le caractère synchrone n'est
// pas un confort : c'est lui qui permet de connaître la langue — donc le sens
// RTL — AVANT le premier rendu, sans flash ni désynchronisation.
//
// /!\ MMKV n'est PAS chiffré. On n'y écrit AUCUN secret : les JWT restent dans
// expo-secure-store (Keystore Android / Keychain iOS), cf. core/auth/tokenService.
//
// Web : MMKV s'adosse tout seul à localStorage. Mais l'export web statique
// d'Expo prérend côté Node, où localStorage n'existe pas -> on bascule alors
// sur une Map en mémoire, jetable, le temps du prérendu (même garde que
// l'ancienne implémentation localStorage).
//
// Version épinglée en 2.x : MMKV 3+ exige la New Architecture, et 4.x impose
// AGP 9 via react-native-nitro-modules, incompatible avec le Gradle 8.10.2
// d'Expo SDK 52. La 2.x est le chemin supporté pour l'ancienne architecture.
const STORAGE_ID = 'transporti';

/** Sous-ensemble de l'API MMKV réellement utilisé ici. */
interface SyncStore {
  getString(key: string): string | undefined;
  set(key: string, value: string): void;
  delete(key: string): void;
}

// Sur natif MMKV est toujours disponible ; sur web il faut un vrai localStorage.
const canUseMMKV = Platform.OS !== 'web' || typeof localStorage !== 'undefined';

/** Repli non persistant, utilisé uniquement pendant le prérendu web. */
function createInMemoryStore(): SyncStore {
  const entries = new Map<string, string>();
  return {
    getString: (key) => entries.get(key),
    set: (key, value) => {
      entries.set(key, value);
    },
    delete: (key) => {
      entries.delete(key);
    },
  };
}

let store: SyncStore | null = null;

// Instanciation paresseuse : on ne touche pas au module natif au simple
// chargement du fichier (utile en test et au prérendu).
function getStore(): SyncStore {
  if (store === null) {
    store = canUseMMKV ? new MMKV({ id: STORAGE_ID }) : createInMemoryStore();
  }
  return store;
}

export const appStorage = {
  /** Valeur stockée, ou `null` si la clé n'existe pas. */
  getString(key: string): string | null {
    return getStore().getString(key) ?? null;
  },
  setString(key: string, value: string): void {
    getStore().set(key, value);
  },
  remove(key: string): void {
    getStore().delete(key);
  },
};
