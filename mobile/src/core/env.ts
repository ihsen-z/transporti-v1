import Constants from 'expo-constants';

// Configuration publique centralisée (variables EXPO_PUBLIC_*).
// AUCUN secret ici : ces valeurs sont embarquées dans le bundle client.
const rawBaseUrl =
  process.env.EXPO_PUBLIC_API_BASE_URL ?? 'http://localhost:8000';
const rawTimeout = process.env.EXPO_PUBLIC_API_TIMEOUT ?? '15000';
const parsedTimeout = Number(rawTimeout);

export const env = {
  // Le contrat backend est versionné : le mobile consomme EXCLUSIVEMENT /api/v1
  // (décision du plan §4.1). Toute route absente de v1 = à remonter au backend.
  apiBaseUrl: `${rawBaseUrl.replace(/\/+$/, '')}/api/v1`,
  apiTimeout: Number.isFinite(parsedTimeout) ? parsedTimeout : 15000,
  appVersion: Constants.expoConfig?.version ?? '0.0.0',
} as const;
