import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { appStorage } from '@/core/storage/appStorage';
import { getStoredLang, setStoredLang } from './langStorage';

// appStorage est mocke : on teste la logique de langue, pas MMKV lui-meme
// (dont le module natif n'existe pas sous Jest).
jest.mock('@/core/storage/appStorage', () => ({
  appStorage: { getString: jest.fn(), setString: jest.fn(), remove: jest.fn() },
}));

jest.mock('expo-secure-store', () => ({
  getItem: jest.fn(),
  deleteItemAsync: jest.fn(() => Promise.resolve()),
}));

const LANG_KEY = 'transporti.lang';

const getString = appStorage.getString as jest.MockedFunction<typeof appStorage.getString>;
const setString = appStorage.setString as jest.MockedFunction<typeof appStorage.setString>;
const secureGetItem = SecureStore.getItem as jest.MockedFunction<typeof SecureStore.getItem>;
const secureDelete = SecureStore.deleteItemAsync as jest.MockedFunction<
  typeof SecureStore.deleteItemAsync
>;

function setPlatform(os: 'android' | 'web'): void {
  Object.defineProperty(Platform, 'OS', { value: os, configurable: true });
}

beforeEach(() => {
  jest.clearAllMocks();
  setPlatform('android');
});

describe('getStoredLang sur natif', () => {
  it('rend null quand rien n est stocke nulle part', () => {
    getString.mockReturnValue(null);
    secureGetItem.mockReturnValue(null);

    expect(getStoredLang()).toBeNull();
    expect(setString).not.toHaveBeenCalled();
  });

  it('lit MMKV et ne touche pas a secure-store', () => {
    getString.mockReturnValue('ar');

    expect(getStoredLang()).toBe('ar');
    expect(secureGetItem).not.toHaveBeenCalled();
  });

  it('rejette une valeur stockee non supportee', () => {
    getString.mockReturnValue('en');
    secureGetItem.mockReturnValue(null);

    expect(getStoredLang()).toBeNull();
  });
});

// Sans cette migration, une app deja installee repartirait en FR — donc en
// LTR — a la premiere ouverture suivant la mise a jour.
describe('migration depuis l ancien stockage', () => {
  it('recupere la langue de secure-store, la recopie dans MMKV et purge', () => {
    getString.mockReturnValue(null);
    secureGetItem.mockReturnValue('ar');

    expect(getStoredLang()).toBe('ar');
    expect(setString).toHaveBeenCalledWith(LANG_KEY, 'ar');
    expect(secureDelete).toHaveBeenCalledWith(LANG_KEY);
  });

  it('ne migre pas une valeur heritee invalide', () => {
    getString.mockReturnValue(null);
    secureGetItem.mockReturnValue('de');

    expect(getStoredLang()).toBeNull();
    expect(setString).not.toHaveBeenCalled();
    expect(secureDelete).not.toHaveBeenCalled();
  });

  it('migre depuis localStorage sur le web', () => {
    setPlatform('web');
    getString.mockReturnValue(null);
    const legacyWebStore = {
      getItem: jest.fn(() => 'fr'),
      removeItem: jest.fn(),
    };
    Object.defineProperty(globalThis, 'localStorage', {
      value: legacyWebStore,
      configurable: true,
    });

    expect(getStoredLang()).toBe('fr');
    expect(setString).toHaveBeenCalledWith(LANG_KEY, 'fr');
    expect(legacyWebStore.removeItem).toHaveBeenCalledWith(LANG_KEY);
    // Le chemin web ne doit jamais appeler secure-store.
    expect(secureGetItem).not.toHaveBeenCalled();
  });
});

describe('setStoredLang', () => {
  it('ecrit dans MMKV', () => {
    setStoredLang('ar');
    expect(setString).toHaveBeenCalledWith(LANG_KEY, 'ar');
  });
});
