# Transporti — Application mobile (Expo / React Native)

MVP mobile de Transporti V1 (marketplace des trajets retour à vide, Tunisie).
Refonte **greenfield** (décision 23/07/2026) — voir `../docs/PLAN_MOBILE_MVP.md`.

## État : Sprint S0 (socle)

Fondation posée : configuration Expo, navigation (expo-router), client API
(axios + refresh JWT), auth (tokens en `expo-secure-store` + store Zustand),
i18n FR/AR, boot minimal. **Aucun parcours métier encore branché** (S1+).

## ⚠️ Baseline de dépendances — À FINALISER (porte de sortie S0)

Les versions de `package.json` ciblent **Expo SDK 52** (baseline réelle et
stable). Elles doivent être **réconciliées par les outils Expo** avant tout
build, plutôt que figées à la main :

```bash
cd mobile
npm install
npx expo install --check      # aligne les libs RN sur le SDK
npx expo-doctor               # doit être VERT = porte de sortie S0
npm run typecheck             # tsc --noEmit : zéro erreur
```

> Différés (nécessitent un *development build*, pas Expo Go) et ajoutés à leur
> sprint : `react-native-mmkv` (persistance état, S1), `@sentry/react-native`
> (observabilité, S5), `react-native-maps` + `expo-location` (corridor, S2).

## Lancer en dev

```bash
cp .env.example .env          # ajuster EXPO_PUBLIC_API_BASE_URL
npm run start                 # puis 'a' (Android), 'i' (iOS), 'w' (web)
```

- Émulateur Android → `EXPO_PUBLIC_API_BASE_URL=http://10.0.2.2:8000`
- Simulateur iOS / web → `http://localhost:8000`
- Staging → l'URL Render du backend.

Le client ajoute automatiquement le préfixe **`/api/v1`** (contrat versionné).

## Structure

```
app/                 # routes expo-router (composition uniquement)
  _layout.tsx        # providers globaux + hydratation session
  index.tsx          # écran de boot S0
src/
  core/              # env, api (client/queryClient), auth (tokens/store), i18n
  features/<dom>/    # (S1+) api/ (hooks React Query + dto + mapper), domain/
  shared/            # (S1+) composants transverses
```

Règles projet : logique dans `src/`, écrans minces ; DTO ↔ domaine via
`mapper.ts` ; état serveur = React Query, état client = Zustand ; argent =
calcul **serveur uniquement** ; typage strict (zéro `any` injustifié).
