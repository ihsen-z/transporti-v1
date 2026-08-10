import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';

// Stockage sécurisé des JWT (Keychain iOS / Keystore Android via expo-secure-store).
// Les tokens sont des secrets : jamais de stockage non chiffré (règle sécurité).
// Sur le web, fallback vers localStorage (pas de SecureStore disponible).
//
// Les deux jetons sont écrits dans UNE seule entrée. Auparavant ils étaient
// stockés séparément, en deux écritures successives : si l'OS tuait l'app entre
// les deux (cas courant au retour d'arrière-plan, moment où le refresh se
// déclenche), on gardait un access neuf avec un refresh périmé. Or le backend
// fait tourner les refresh tokens et blackliste l'ancien
// (ROTATE_REFRESH_TOKENS + BLACKLIST_AFTER_ROTATION) : le refresh suivant
// échouait et l'utilisateur était déconnecté sans rien avoir fait.
const BUNDLE_KEY = 'transporti.tokens';

// Anciennes clés, lues une seule fois pour ne pas déconnecter les sessions déjà
// installées lors de la mise à jour. Supprimées dès la première migration.
const LEGACY_ACCESS_KEY = 'transporti.access';
const LEGACY_REFRESH_KEY = 'transporti.refresh';

const isWeb = Platform.OS === 'web';

type TokenBundle = { access: string; refresh: string };

async function readRaw(key: string): Promise<string | null> {
  if (isWeb) return localStorage.getItem(key);
  return SecureStore.getItemAsync(key);
}

async function writeRaw(key: string, value: string): Promise<void> {
  if (isWeb) {
    localStorage.setItem(key, value);
    return;
  }
  await SecureStore.setItemAsync(key, value);
}

async function removeRaw(key: string): Promise<void> {
  if (isWeb) {
    localStorage.removeItem(key);
    return;
  }
  await SecureStore.deleteItemAsync(key);
}

async function readBundle(): Promise<TokenBundle | null> {
  const raw = await readRaw(BUNDLE_KEY);
  if (raw) {
    try {
      const parsed: unknown = JSON.parse(raw);
      if (
        typeof parsed === 'object' &&
        parsed !== null &&
        typeof (parsed as TokenBundle).access === 'string' &&
        typeof (parsed as TokenBundle).refresh === 'string'
      ) {
        return parsed as TokenBundle;
      }
    } catch {
      // Entrée corrompue : on la traite comme absente plutôt que de faire
      // planter chaque requête sortante.
    }
    return null;
  }

  // Migration depuis l'ancien format à deux entrées.
  const [access, refresh] = await Promise.all([
    readRaw(LEGACY_ACCESS_KEY),
    readRaw(LEGACY_REFRESH_KEY),
  ]);
  if (!access || !refresh) return null;

  const migrated: TokenBundle = { access, refresh };
  await writeRaw(BUNDLE_KEY, JSON.stringify(migrated));
  await Promise.all([
    removeRaw(LEGACY_ACCESS_KEY),
    removeRaw(LEGACY_REFRESH_KEY),
  ]);
  return migrated;
}

export const tokenService = {
  async getAccess(): Promise<string | null> {
    return (await readBundle())?.access ?? null;
  },
  async getRefresh(): Promise<string | null> {
    return (await readBundle())?.refresh ?? null;
  },
  async setTokens(access: string, refresh: string): Promise<void> {
    // Une seule écriture : les deux jetons ne peuvent plus diverger.
    await writeRaw(BUNDLE_KEY, JSON.stringify({ access, refresh }));
  },
  async clear(): Promise<void> {
    await Promise.all([
      removeRaw(BUNDLE_KEY),
      // Les anciennes clés sont purgées aussi : une session installée avant la
      // migration ne doit pas laisser de jetons derrière elle à la déconnexion.
      removeRaw(LEGACY_ACCESS_KEY),
      removeRaw(LEGACY_REFRESH_KEY),
    ]);
  },
};
