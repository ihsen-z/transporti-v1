import Constants from 'expo-constants';

// Configuration publique centralisée (variables EXPO_PUBLIC_*).
// AUCUN secret ici : ces valeurs sont embarquées dans le bundle client.
const rawBaseUrl =
  process.env.EXPO_PUBLIC_API_BASE_URL ?? 'http://localhost:8000';
const rawTimeout = process.env.EXPO_PUBLIC_API_TIMEOUT ?? '15000';
const parsedTimeout = Number(rawTimeout);

// Métadonnées de build injectées par app.config.js. Elles rendent un binaire
// traçable jusqu'au commit qui l'a produit — sans elles, un rapport de crash ou
// un bug remonté par un testeur ne désigne aucune version précise.
const extra = Constants.expoConfig?.extra ?? {};
const asString = (value: unknown): string =>
  typeof value === 'string' ? value : '';

// `eas.projectId` n'existe qu'après `eas init` (Lot 1 : pas encore fait dans
// cet environnement) — il apparaît alors sous extra.eas.projectId.
const eas = extra.eas as { projectId?: string } | undefined;

export const env = {
  // Le contrat backend est versionné : le mobile consomme EXCLUSIVEMENT /api/v1
  // (décision du plan §4.1). Toute route absente de v1 = à remonter au backend.
  apiBaseUrl: `${rawBaseUrl.replace(/\/+$/, '')}/api/v1`,
  apiTimeout: Number.isFinite(parsedTimeout) ? parsedTimeout : 15000,
  appVersion: Constants.expoConfig?.version ?? '0.0.0',

  // Traçabilité du binaire (vides en développement local, remplies en CI/EAS).
  commitSha: asString(extra.commitSha),
  buildProfile: asString(extra.buildProfile),

  // DSN Sentry. Vide = observabilité désactivée : l'app fonctionne
  // normalement, les erreurs partent simplement dans la console.
  sentryDsn: asString(process.env.EXPO_PUBLIC_SENTRY_DSN),

  // Requis par `getExpoPushTokenAsync` (4.8). Vide = enregistrement du push
  // désactivé : l'app fonctionne normalement, elle ne reçoit simplement rien.
  easProjectId: asString(eas?.projectId),
} as const;
