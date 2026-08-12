# Transporti — Application mobile (Expo / React Native)

MVP mobile de Transporti V1 (marketplace des trajets retour à vide, Tunisie).
Refonte **greenfield** (décision 23/07/2026) — voir `../docs/PLAN_MOBILE_MVP.md`.

## État (07/08/2026)

Sprints S1 à S4 livrés : authentification, i18n FR/AR avec RTL, parcours
transporteur complet (publication d'un retour → demandes → contre-offre →
départ → complétion → notation), recherche client avec carte, messagerie,
notifications, KYC. Le parcours **client** reste tronqué après l'acceptation —
voir `../docs/PLAN_ACHEVEMENT_MOBILE_2026-08-07.md`, qui fait foi sur le reste
à faire.

Chaîne de qualité en place et **bloquante en CI** (`.github/workflows/mobile-ci.yml`) :

```bash
npm run typecheck   # tsc --noEmit, strict + noUncheckedIndexedAccess : 0 erreur
npm run lint        # ESLint, --max-warnings=0
npm run test:ci     # jest + couverture
npm run doctor      # expo-doctor 18/18
```

## ⚠️ Development build, pas Expo Go

L'application embarque des modules natifs indisponibles dans Expo Go —
`react-native-mmkv` (persistance) et `react-native-maps` (corridor). **Expo Go
ne peut donc pas lancer cette application** ; il faut un *development build*
(`eas build --profile development`).

Le projet est en **Continuous Native Generation** : `ios/` et `android/` sont
générés par `expo prebuild` au moment du build et **ne sont pas commités**
(`.gitignore`). Conséquence directe : tout réglage natif doit être exprimé en
configuration (`app.json`, `app.config.js`, plugins Expo) — un fichier natif
édité à la main serait écrasé au prochain build.

L'ancienne architecture React Native est conservée volontairement
(`newArchEnabled: false`) : `react-native-mmkv` est épinglé en 2.x, la 3.x
exigeant la New Architecture.

## Builds (EAS)

Trois profils dans `eas.json` :

| Profil | Distribution | Backend visé |
|---|---|---|
| `development` | interne, client de dev | émulateur (`10.0.2.2:8000`) |
| `preview` | interne (APK / TestFlight) | staging Render |
| `production` | stores | production Render |

Le versionnement est **distant** (`appVersionSource: "remote"`) : EAS incrémente
`versionCode`/`buildNumber`, il n'y a rien à gérer dans `app.json` et donc aucun
conflit de merge sur ces champs.

Le commit et le profil de build sont injectés dans `extra` par `app.config.js`
et affichés dans l'écran « À propos » — un binaire est ainsi rattachable au code
qui l'a produit.

> Secrets à provisionner hors dépôt (compte Expo, DSN Sentry, clé Maps de
> production) : voir `.env.example`.

## Lancer en dev

```bash
cp .env.example .env          # ajuster EXPO_PUBLIC_API_BASE_URL
npm run start                 # puis 'a' (Android), 'i' (iOS)
```

- Émulateur Android → `EXPO_PUBLIC_API_BASE_URL=http://10.0.2.2:8000`
- Simulateur iOS → `http://localhost:8000`
- Staging → l'URL Render du backend.

> **Web hors périmètre (décision 5.10).** `npm run web` existe encore comme
> commande mais n'est plus un cible supportée : `react-native-maps` (module
> natif) casse le bundle Metro dès la résolution des routes — le serveur
> renvoie une 500 avant même l'écran de connexion. Même s'il bundlait, les JWT
> n'auraient d'autre repli que `localStorage` en clair, exposé à toute XSS —
> les chiffrer côté JS n'aurait rien résolu (la clé vivrait dans le même
> contexte que l'attaque). `tokenService.ts` lève désormais une erreur
> explicite sur web plutôt que d'y stocker des tokens en silence.

Le client ajoute automatiquement le préfixe **`/api/v1`** (contrat versionné).

### Test live sur l'émulateur Android (un seul script)

```bash
scripts/mobile-emulator.sh                      # AVD par défaut, Metro sur 8082
scripts/mobile-emulator.sh Pixel_5_API_33 8083  # autre AVD / autre port
scripts/mobile-emulator.sh --shot mon-ecran     # capture → mobile/.expo/shots/
```

Boote l'AVD, lance Metro en *watch mode*, puis ouvre l'app dans le
*development build* installé sur l'AVD (Expo Go ne convient pas, voir
ci-dessus). Le hot-reload est actif : éditer un fichier de `app/` ou `src/`
rafraîchit l'émulateur.

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

> Les `console.log` de l'app remontent dans la sortie Metro plutôt que de
> façon fiable dans `adb logcat -s ReactNativeJS`. D'où le fichier
> `.expo/metro.log`.

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
  _layout.tsx        # ErrorBoundary + providers globaux + hydratation session
  (auth)/            # login, register, forgot-password
  (app)/             # home, search, publish, requests, messages, gains, profile
src/
  core/              # env, api (client/queryClient), auth, i18n, observability
  features/<dom>/    # api/ (hooks React Query + dto), components/, data/
  shared/            # theme (design-system) + ui (composants transverses)
assets/              # icônes et splash (PNG générés depuis assets/source/*.svg)
```

Règles projet : logique dans `src/`, écrans minces ; DTO ↔ domaine via
`mapper.ts` ; état serveur = React Query, état client = Zustand ; argent =
calcul **serveur uniquement** ; typage strict (zéro `any` injustifié).
