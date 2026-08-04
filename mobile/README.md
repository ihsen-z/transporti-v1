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

### Test live sur l'émulateur Android (un seul script)

```bash
scripts/mobile-emulator.sh                      # AVD par défaut, Metro sur 8082
scripts/mobile-emulator.sh Pixel_5_API_33 8083  # autre AVD / autre port
scripts/mobile-emulator.sh --shot mon-ecran     # capture → mobile/.expo/shots/
```

Boote l'AVD, lance Metro en *watch mode*, puis ouvre l'app dans Expo Go
(déjà installé sur les AVD). Le hot-reload est actif : éditer un fichier de
`app/` ou `src/` rafraîchit l'émulateur.

Trois pièges rencontrés, déjà traités par le script :

- **Port 8081** est pris par la config `mobile-web` (`expo start --web`) →
  l'émulateur utilise **8082**.
- **`exp://127.0.0.1`** échoue en *connection refused* même avec
  `adb reverse` → utiliser **`exp://10.0.2.2:<port>`** (alias de l'hôte).
- **`CI=1`** évite les prompts interactifs mais **désactive le hot-reload**
  (« reloads are disabled ») → ne pas l'utiliser pour du test live.

Piloter l'UI et lire les logs sans quitter le terminal :

```bash
ADB="$LOCALAPPDATA/Android/Sdk/platform-tools/adb.exe"
"$ADB" shell input tap 540 1368          # toucher un élément
"$ADB" shell input text "a@b.tn"         # saisir du texte
tail -f .expo/metro.log                  # logs JS (voir note ci-dessous)
```

> En **mode bridgeless** (New Architecture, activée ici), les `console.log` de
> l'app n'apparaissent **pas** dans `adb logcat -s ReactNativeJS` — uniquement
> dans la sortie Metro. D'où le fichier `.expo/metro.log`.

### Backend en vis-à-vis de l'émulateur

L'AVD voit l'hôte comme `10.0.2.2`, mais ce host n'est pas dans
`ALLOWED_HOSTS` par défaut (`localhost,127.0.0.1`) → Django répondrait **400**.
Il est lu depuis l'environnement, donc aucun code à modifier :

```bash
cd backend && ALLOWED_HOSTS="localhost,127.0.0.1,10.0.2.2" ./venv/Scripts/python.exe manage.py runserver 0.0.0.0:8000
```

Comptes de test : `python manage.py seed_test_data` (idempotent, `--clear` pour
repartir de zéro). Il crée entre autres `leila.benamor@test.transporti.tn`
(CLIENT) et `mehdi.khelifi@test.transporti.tn` (TRANSPORTER), mot de passe
`Test@123!` — voir `backend/users/management/commands/seed_test_data.py`.

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
