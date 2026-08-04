# Audit technique — Application mobile Transporti V1

**Date** : 03/08/2026
**Périmètre** : `mobile/` (Expo SDK 52 / React Native 0.76.9 / expo-router 4)
**Méthode** : lecture exhaustive du code source, exécution réelle des outils de
vérification (`tsc`, `jest`, `expo-doctor`), recoupement systématique avec la
surface d'API du backend Django et avec `docs/PLAN_MOBILE_MVP.md`.
**Nature** : audit statique. Aucun test d'exécution sur appareil n'a été rejoué
ici — pour la partie dynamique, voir `AUDIT_UI_MOBILE_TRANSPORTEUR_2026-07-30.md`.

---

## 1. Résumé exécutif

L'application mobile est **un très bon socle d'ingénierie porté par une
industrialisation quasi inexistante**. C'est le portrait classique d'un produit
construit vite et bien par une petite équipe, mais qui n'a pas encore payé le
prix de la mise en production.

| Axe | Note | Constat en une ligne |
|---|:--:|---|
| Qualité du code | **A** | TypeScript strict, zéro `any`, fichiers courts, architecture feature-first cohérente |
| Architecture | **A−** | Séparation nette état serveur / état client, couche API centralisée, routes minces |
| Couverture fonctionnelle transporteur | **B+** | Le parcours métier principal est bouclé de bout en bout |
| Couverture fonctionnelle client | **C** | Recherche + demande seulement ; ni suivi de course, ni confirmation de fin |
| Sécurité | **B** | Tokens en Keystore/Keychain, purge du cache au logout ; angles morts sur le web et le rafraîchissement |
| Tests | **D** | 22 tests, logique pure uniquement. Zéro test de composant, d'intégration ou E2E |
| CI/CD & release | **F** | Aucun pipeline mobile, aucun ESLint, aucun EAS, aucun build reproductible |
| Observabilité | **F** | Aucun crash reporting, aucune analytique, aucun `ErrorBoundary` |
| Performance / batterie | **C−** | Polling permanent non suspendu en arrière-plan, listes non paginées |
| Conformité stores | **F** | Aucun des prérequis de publication n'est réuni |

**Verdict.** Le produit est **démontrable**, il n'est **pas livrable**. L'écart
n'est pas dans le code applicatif — il est dans tout ce qui entoure le code.

**Les trois choses qui bloquent réellement une mise en production :**

1. **Aucune chaîne de build reproductible** (pas d'`eas.json`, pas de CI mobile).
   Aujourd'hui, l'app ne se construit que sur le poste du développeur.
2. **Aucune observabilité.** Un crash chez un utilisateur est invisible. En
   production, cela signifie découvrir les pannes par les avis du Play Store.
3. **La boucle économique n'est pas fermée.** Zéro endpoint `payments/*`
   consommé : le transporteur ne voit jamais son portefeuille, le client ne peut
   jamais confirmer la fin de course — donc l'escrow n'est jamais libéré depuis
   le mobile.

---

## 2. État des lieux — ce qui existe

### 2.1 Métriques vérifiées

| Mesure | Valeur | Commande |
|---|---|---|
| Fichiers TS/TSX (`app/` + `src/`) | **151** | `find app src -name "*.ts*"` |
| Lignes de code | **8 992** | `wc -l` |
| Erreurs TypeScript | **0** | `npx tsc --noEmit` |
| Diagnostics Expo | **18/18 verts** | `npx expo-doctor` |
| Suites de test / tests | **6 / 22, tous verts** | `npx jest` |
| Occurrences de `any`, `@ts-ignore` | **0** | `grep` |
| Fichiers > 200 lignes | **2** | `wc -l \| awk` |
| Clés i18n FR / AR | **343 / 351** | comptage JSON récursif |
| Commits sur `mobile/` depuis le 01/07 | **40** | `git log` |

Ces chiffres sont excellents et méritent d'être dits clairement : **le socle
technique tient**. `tsc --noEmit` passe sans une seule erreur avec `strict: true`
**et** `noUncheckedIndexedAccess: true` — cette seconde option est rarement
activée en pratique et élimine toute une classe de `undefined` silencieux.

### 2.2 Architecture

L'organisation est **feature-first**, avec une séparation stricte des couches :

```
app/                        routes expo-router — écrans MINCES (48 à 202 lignes)
  (auth)/                   login, register, forgot-password
  (app)/                    home, search, publish, requests, messages, profile
src/core/                   socle transverse
  api/       client axios (Bearer + refresh), QueryClient, persistance MMKV
  auth/      authStore (Zustand) + tokenService (SecureStore)
  i18n/      init i18next + RTL + persistance de la langue
  storage/   appStorage (MMKV synchrone)
src/features/<domaine>/     11 domaines métier
  api/       DTO + hooks React Query (1 hook = 1 endpoint)
  components/ composants du domaine
  data/      données de référence (gouvernorats, types de documents)
src/shared/                 theme (design-system) + ui (24 composants)
```

**Ce qui est particulièrement bien fait :**

- **Une seule couche réseau.** Tout passe par `apiClient`
  ([src/core/api/client.ts](mobile/src/core/api/client.ts)). Bearer injecté en
  intercepteur, refresh JWT sur 401 avec **anti-stampede** (une seule promesse
  de refresh partagée entre requêtes concurrentes), rejeu unique puis
  déconnexion. C'est la bonne implémentation.
- **Séparation état serveur / état client.** React Query pour le serveur,
  Zustand pour l'auth et les préférences. Aucun mélange, aucune duplication.
- **Erreurs métier typées.** Chaque hook de mutation expose une classe d'erreur
  discriminée (`kind: 'network' | 'invalid_credentials' | …`) que l'UI traduit
  en clé i18n. Cf. [usePasswordReset.ts](mobile/src/features/auth/api/usePasswordReset.ts).
  Bien plus robuste qu'un `error.message` affiché brut.
- **Validation des formulaires.** `react-hook-form` + `zod`, avec les messages
  stockés **comme clés i18n** dans le schéma — le schéma reste statique et les
  erreurs restent traduisibles. Détail d'expert, correctement traité.
- **Persistance du cache.** React Query adossé à MMKV, avec `buster` sur la
  version d'app (un changement de DTO invalide le cache au lieu de faire planter
  les écrans) et une liste explicite de clés volatiles exclues.
  Cf. [queryPersister.ts](mobile/src/core/api/queryPersister.ts).
- **RTL réellement traité.** Le sens de layout est posé **avant le premier
  rendu** grâce au caractère synchrone de MMKV, et le changement de langue en
  cours de session déclenche un remontage de la `Stack` via une clé incrémentée.
  Le contournement est documenté dans le code. C'est le genre de problème que la
  plupart des équipes découvrent en recette.
- **Discipline de commentaires.** Les décisions non évidentes sont justifiées en
  commentaire, y compris les contraintes de version (`MMKV 2.x` épinglé parce
  que la 3+ exige la New Architecture). La conformité au `CLAUDE.md` du projet
  est réelle, pas déclarative.

### 2.3 Couverture fonctionnelle réelle

**Rôle TRANSPORTEUR — parcours principal bouclé :**

inscription → vérification KYC (upload de documents + véhicule) → publication
d'un retour à vide (avec estimation de prix) → réception des demandes →
réponse / contre-offre → confirmation de démarrage → complétion → notation.
Messagerie et notifications branchées.

**Rôle CLIENT — parcours tronqué :**

inscription → recherche de retours (avec carte) → envoi d'une demande →
alerte corridor si aucun résultat → messagerie. **Puis plus rien** : pas de
suivi de course, pas de confirmation de complétion, pas de vue paiement.

**Rôles ADMIN / MODERATOR** : non gérés. `FloatingTabBar` les fait retomber sur
la navigation CLIENT (repli silencieux, cf. §4.3).

---

## 3. Ce qui manque — classement par criticité

### 3.1 P0 — Bloquants de mise en production

#### P0-1. Aucune chaîne de build ni de livraison

| Élément attendu | État |
|---|---|
| `eas.json` (profils dev / preview / production) | **absent** |
| Workflow CI mobile | **absent** — `.github/workflows/` ne contient que backend, frontend, deploy |
| `expo-updates` (correctifs OTA) | **absent** |
| `versionCode` Android / `buildNumber` iOS | **absent** de `app.json` |
| Projet iOS | **absent** — seul `android/` a été généré |

Conséquence directe : `git clone` + `npm install` ne produit **pas** une app
installable sans qu'un humain rejoue un `expo prebuild` local. Aucun binaire
n'est traçable à un commit. Aucune régression n'est détectée avant la revue.

Le `PLAN_MOBILE_MVP.md` §11 place explicitement ce point en **porte de sortie du
sprint S0**. Il n'a jamais été franchi.

#### P0-2. Aucune observabilité

- Pas de `@sentry/react-native` ni équivalent → **un crash utilisateur est
  invisible**.
- Pas d'`ErrorBoundary` (0 occurrence) → une exception de rendu affiche un écran
  rouge en dev et un **écran blanc muet** en production, sans porte de sortie.
- Pas d'analytique → aucune mesure de funnel, donc aucune capacité à savoir où
  les utilisateurs décrochent.

Le plan prévoyait Sentry en S5. Le sprint S5 n'a pas eu lieu.

#### P0-3. La boucle économique n'est pas fermée

**Zéro** endpoint `payments/*` n'est consommé par le mobile, alors que le
backend en expose sept :

| Endpoint backend | Impact de l'absence côté mobile |
|---|---|
| `wallet/` | Le transporteur **ne voit jamais ses gains**. C'est sa principale raison d'ouvrir l'app. |
| `wallet/withdrawals/` | Aucun retrait possible depuis le mobile. |
| `payments/confirm-completion/` | Le client ne peut pas confirmer la fin de course → **l'escrow n'est jamais libéré**. |
| `jobs/<id>/escrow/`, `jobs/<id>/booking/` | Aucune visibilité sur les fonds séquestrés. |
| `payments/initiate/`, `verify/`, `<ref>/status/` | Aucun paiement digital. |

Même en scénario COD (paiement à la livraison), retenu comme chemin nominal par
le plan §9.1, `confirm-completion` reste le déclencheur de libération de
l'escrow. En l'état, le cycle financier s'arrête au `jobs/<id>/complete/`
déclenché par le transporteur, sans contrepartie côté client.

#### P0-4. Aucune notification push

`expo-notifications` est **absent** du `package.json`, alors que le backend
expose déjà `notifications/devices/register/`, `notifications/devices/` et
`notifications/devices/<token>/`.

Conséquence : une nouvelle demande de transport n'est vue que si l'utilisateur
**ouvre l'application**. Sur une marketplace où la valeur dépend de la vitesse de
réponse, c'est un défaut produit, pas seulement technique. Le palliatif actuel
(polling) est traité en §4.1 — il coûte cher et ne résout pas le cas
application fermée.

#### P0-5. Prérequis stores non réunis

Aucun des éléments suivants n'existe : politique de confidentialité, mécanisme
de **suppression de compte dans l'app** (exigence Google Play depuis 2024 et
Apple depuis 2022), écran de consentement, mentions légales exploitables,
`privacy manifest` iOS, jeux d'icônes et de captures.

Le panneau « À propos » (`AboutPanel`) existe mais ne couvre pas ces obligations.

### 3.2 P1 — Majeurs

#### P1-1. Pagination jamais exploitée

Les DTO déclarent proprement `{ count, next, previous, results }` — mais
**aucun `useInfiniteQuery` n'existe dans la base de code** et `next` n'est jamais
lu. Le backend est en `PageNumberPagination` avec `PAGE_SIZE = 20`
(`backend/transporti_core/settings.py:276`).

Conséquence mesurable : un transporteur actif ayant plus de 20 missions,
notifications, demandes, avis ou conversations **ne verra jamais au-delà des 20
premiers éléments**, sans aucun indice visuel que la liste est tronquée. Le
défaut est invisible en jeu de test et certain en production.

Écrans concernés : missions, missions terminées, demandes reçues, mes demandes,
conversations, messages d'un job, notifications, avis, litiges.

#### P1-2. Polling permanent, non suspendu en arrière-plan

| Requête | Intervalle | Où elle est montée |
|---|---|---|
| `conversations/` | **10 s** | `FloatingTabBar` → **tout écran authentifié** |
| `notifications/unread-count/` | **15 s** | `NotificationBell` → écran d'accueil |
| `jobs/<id>/messages/` | **5 s** | fil de discussion ouvert |

Aucun `AppState`, aucun `focusManager` de React Query n'est câblé (0 occurrence).
Le polling **continue donc quand l'application passe en arrière-plan**, tant que
le processus vit. Sur un forfait data tunisien et une batterie de milieu de
gamme, c'est un coût réel et un motif classique de désinstallation.

Correctif peu coûteux : brancher `focusManager` sur `AppState` — une dizaine de
lignes dans `app/_layout.tsx`. Le plan le prévoyait en S5.

#### P1-3. Aucune détection du mode hors ligne

`@react-native-community/netinfo` est absent et `onlineManager` de React Query
n'est pas câblé. Or l'app **persiste déjà son cache dans MMKV** : elle affiche
donc des données au démarrage à froid sans connexion, mais **sans jamais indiquer
qu'elles sont périmées ni que le réseau est coupé**. Une mutation lancée hors
ligne échoue en erreur générique au lieu d'être différée ou signalée.

L'infrastructure la plus difficile (persistance) est déjà là ; il manque la
partie visible.

#### P1-4. Tests — 22 tests, aucun ne couvre l'interface ni le réseau

| Type de test | Nombre | Couverture |
|---|:--:|---|
| Logique pure (mappers, données de référence, helpers) | 22 | correcte |
| Composants (`@testing-library/react-native`) | **0** | — |
| Hooks React Query / couche API | **0** | — |
| Intégration / E2E (Maestro, Detox) | **0** | — |
| Seuil de couverture configuré | **aucun** | — |

Les 6 suites existantes sont bien écrites, mais elles couvrent la partie du code
qui casse le moins. **Rien ne teste `apiClient`** — c'est-à-dire ni la logique de
refresh JWT, ni l'anti-stampede, ni la déconnexion sur échec de refresh. C'est
le point le plus critique du socle et le seul qui, en cassant, déconnecte
silencieusement tous les utilisateurs.

Sont également non testés : les gardes de navigation (`(app)/_layout`,
`(auth)/_layout`), la logique de rôle de `FloatingTabBar`, la purge du cache au
logout.

#### P1-5. Aucun lint

Ni ESLint, ni Prettier, ni configuration commitée. Le script `npm run lint`
appelle `expo lint`, qui **tenterait d'installer et de générer une configuration
au premier lancement** — comportement interactif, non reproductible en CI, et
règles non figées.

Aucune règle n'interdit aujourd'hui un `console.log` en production, une
dépendance de hook manquante, ou un import inutilisé.

#### P1-6. Réinitialisation de mot de passe incomplète

`auth/password-reset/` est appelé (l'e-mail part), mais
**`auth/password-reset/confirm/` n'est jamais consommé** et **aucun handler de
deep link n'existe** (0 occurrence de `Linking` / `useURL`), bien que le schéma
`transporti://` soit déclaré dans `app.json`.

Le commentaire du code assume le différé — c'est honnête, mais le résultat est
qu'un utilisateur qui a oublié son mot de passe **reçoit un e-mail et ne peut
pas terminer l'opération dans l'app**. Le parcours est cassé de bout en bout,
pas seulement incomplet.

### 3.3 P2 — Modérés

#### P2-1. Retour matériel Android non géré sur les vues détail

`messages.tsx` et `requests.tsx` implémentent un master-détail via **état local**
(`useState`), sans route dédiée. Aucun `BackHandler` ni `useFocusEffect` n'est
câblé (0 occurrence).

Conséquence : depuis un fil de discussion ouvert ou depuis les demandes d'un
trajet, **le bouton retour physique d'Android ne revient pas à la liste** — il
sort de l'onglet, voire de l'app. C'est un réflexe universel chez les
utilisateurs Android ; l'ignorer se paie immédiatement en avis.

Effet de bord de la même décision : aucune conversation ni demande n'est
adressable par une URL, donc **aucune notification ne pourra jamais ouvrir
directement le bon écran** (ce qui rejoint P0-4).

#### P2-2. Thème clair uniquement, mais mode automatique déclaré

`app.json` déclare `"userInterfaceStyle": "automatic"` et `_layout.tsx` utilise
`<StatusBar style="auto" />`, alors que `colors.ts` **ne contient aucune palette
sombre** et qu'aucun `useColorScheme` n'existe.

Sur un appareil en mode sombre, la barre de statut bascule en contenu clair
tandis que les écrans restent blancs → **texte blanc sur fond blanc** dans la
barre de statut. Correctif immédiat : forcer `"light"`, ou implémenter réellement
le thème sombre.

#### P2-3. Accessibilité au minimum syndical

| Attribut | Occurrences |
|---|:--:|
| `accessibilityRole` | 32 |
| `accessibilityLabel` | **2** |
| `accessibilityHint` | **0** |
| `testID` | **0** |

Les rôles sont bien posés, mais **presque aucun élément n'est nommé**. Un lecteur
d'écran annonce « bouton » sans dire lequel. Aucune vérification de contraste ni
de taille de police dynamique n'a été faite.

L'absence totale de `testID` a un second effet : elle rendra tout futur test E2E
(Maestro / Detox) fragile, car il devra s'appuyer sur des textes traduits.

#### P2-4. Listes non optimisées

Aucun `getItemLayout`, `windowSize`, `initialNumToRender` ni `FlashList`.
Sans impact tant que la pagination plafonne à 20 éléments (P1-1) — mais ces deux
points devront être traités **ensemble**, sous peine de transformer un bug de
troncature en problème de fluidité.

#### P2-5. Repli de rôle silencieux

```ts
// FloatingTabBar.tsx:33
const nav = role === 'TRANSPORTER' ? ROLE_NAV.TRANSPORTER : ROLE_NAV.CLIENT;
```

Un `ADMIN`, un `MODERATOR` — ou un utilisateur dont le profil n'a pas encore été
chargé (`role === undefined`) — obtient **la navigation client**, sans message.
Le commentaire assume le choix pour les rôles admin, mais le cas `undefined` est
absorbé par la même branche. Un état de chargement explicite serait plus sûr.

#### P2-6. Documentation en dérive

`mobile/README.md` annonce toujours :

> « **État : Sprint S0 (socle)** […] **Aucun parcours métier encore branché** (S1+) »

alors que les sprints S1 à S4 sont livrés. Il décrit également un fonctionnement
sous **Expo Go**, alors que le projet utilise désormais MMKV et `react-native-maps`
— deux modules natifs indisponibles dans Expo Go — et qu'un dossier `android/`
généré est présent. Le projet est de fait passé en **development build**.

De même, `AUDIT_UI_MOBILE_TRANSPORTEUR_2026-07-30.md` §1 affirme « pas de dossier
`android/` » : ce n'est plus vrai depuis le commit `a98f740`.

Une documentation fausse coûte plus cher qu'une documentation absente : elle fait
perdre une demi-journée à chaque nouvel arrivant.

#### P2-7. Points de sécurité résiduels

- **Web** : `tokenService` retombe sur `localStorage`, lisible par toute XSS.
  Impact faible tant que le web n'est pas une cible produit — mais
  `web.output: "static"` est configuré et `npm run web` existe.
- **Refresh sans timeout** : l'appel de refresh dans `client.ts:36` utilise
  `axios.post` brut, **sans `timeout`**, contrairement à `apiClient`. Sur un
  réseau qui pend, la promesse partagée ne se résout jamais et **toutes les
  requêtes en 401 restent bloquées indéfiniment**.
- **Pas de vérification d'expiration avant envoi** : chaque démarrage à froid
  avec un access token expiré consomme un aller-retour 401 inutile.
- **Clé Google Maps** : le traitement dans `app.config.js` est correct et le
  commentaire identifie justement que la protection réelle se fait par
  restriction côté Google Cloud (package + SHA-1). **À vérifier que cette
  restriction est effectivement en place** — c'est hors du code.

---

## 4. Couverture de l'API backend

**32 des 84 endpoints `/api/v1/` non-administratifs sont consommés — soit 38 %.**

Le chiffre brut est trompeur (beaucoup d'endpoints `logistics` relèvent de
l'ancien modèle « offres », abandonné au profit du pivot « trajets retour »).
Le tableau ci-dessous ne retient que les manques **à impact produit**.

| Module | Endpoint non consommé | Conséquence |
|---|---|---|
| payments | `wallet/` | Le transporteur ne voit pas ses gains |
| payments | `wallet/withdrawals/` | Aucun retrait |
| payments | `confirm-completion/` | **Escrow jamais libéré depuis le mobile** |
| logistics | `jobs/<id>/escrow/`, `jobs/<id>/booking/` | Aucune visibilité sur les fonds |
| notifications | `devices/register/` | **Aucun push possible** |
| logistics | `jobs/<id>/events/` | Aucune chronologie de course |
| logistics | `jobs/<id>/cancel/`, `transporter-cancel/` | **Impossible d'annuler une course** |
| logistics | `trip-requests/<id>/cancel/` | Impossible d'annuler une demande envoyée |
| logistics | `corridor-alerts/<id>/` (DELETE) | Alerte créable, jamais supprimable |
| logistics | `transporter/stats/`, `metrics/dashboard/` | Aucun tableau de bord |
| logistics | `transporter/profile/<id>/`, `client/profile/<id>/` | Impossible de consulter le profil d'un tiers avant d'accepter |
| reviews | `reviews/user/<id>/` | On ne voit pas les avis reçus par un autre utilisateur |
| logistics | `favorites/`, `favorites/toggle/` | Pas de transporteurs favoris |
| users | `auth/password-reset/confirm/` | Parcours mot de passe oublié cassé (P1-6) |
| users | `auth/social/google/`, `facebook/` | Pas de connexion sociale |
| logistics | `jobs/<id>/`, `jobs/my/`, `jobs/public/` | Pas de détail de job adressable |

Trois manques ressortent comme **fonctionnellement inacceptables en production** :
l'annulation d'une course, la consultation du profil d'un tiers avant engagement,
et le portefeuille.

---

## 5. Écart par rapport au plan MVP

Référence : `docs/PLAN_MOBILE_MVP.md` §11.

| Sprint | Contenu prévu | Réalisé |
|---|---|:--:|
| **S0 — Socle** | Stack regelée, `expo-doctor` vert, **CI typecheck/lint**, **build EAS preview** | **Partiel** — doctor vert ✅, CI ❌, EAS ❌, lint ❌ |
| **S1 — Identité** | Auth JWT + refresh, secure-store, i18n fr/ar + RTL, thème, client/intercepteurs | **Fait** ✅ |
| **S2 — Trajets & offres** | Création demande + trajet retour, listes/détail, corridor + maps | **Fait** ✅ |
| **S3 — Cycle de course** | confirm-start, **events**, complete, **confirmation de complétion**, **escrow en lecture**, notation | **Partiel** — events ❌, confirm-completion ❌, escrow ❌ |
| **S4 — Messagerie, notifs, KYC** | Chat polling, badge non-lus, **enregistrement device token**, upload KYC | **Partiel** — device token ❌ |
| **S5 — Durcissement** | **Sentry, tests hooks, smoke E2E, perf/batterie du polling, préparation stores** | **Non commencé** ❌ |

**Lecture.** L'équipe a exécuté les sprints à forte visibilité (S1, S2) et
survolé ceux qui ne se voient pas à la démonstration (S0, S5). C'est le schéma
de dette le plus fréquent et le plus coûteux : **le travail sauté en S0 devra
être refait sous contrainte de release**, quand il coûte trois à cinq fois plus
cher.

---

## 6. Feuille de route recommandée

### Lot 1 — Rendre l'app livrable (≈ 1 sprint)

Objectif : qu'un binaire traçable sorte d'une machine qui n'est pas celle du
développeur, et qu'un crash soit visible.

1. `eas.json` avec trois profils (`development`, `preview`, `production`).
2. Workflow `.github/workflows/mobile-ci.yml` : `npm ci` → `typecheck` → `test`
   → `expo-doctor`, déclenché sur `paths: mobile/**` (aligné sur les workflows
   backend et frontend déjà en place).
3. ESLint + Prettier commités et épinglés, ajoutés au workflow.
4. Sentry + `ErrorBoundary` racine avec écran de repli traduit.
5. `versionCode` / `buildNumber` et politique de versionnement.
6. Corriger `userInterfaceStyle` (P2-2) et le timeout de refresh (P2-7) — deux
   correctifs de quelques lignes, à ne pas reporter.

### Lot 2 — Fermer la boucle économique (≈ 1,5 sprint)

7. Écran **Portefeuille** transporteur (`wallet/`, `wallet/withdrawals/`).
8. **Confirmation de complétion** côté client (`payments/confirm-completion/`)
   + escrow en lecture.
9. **Annulation** de course et de demande (`jobs/<id>/cancel/`,
   `transporter-cancel/`, `trip-requests/<id>/cancel/`).
10. **Chronologie** de course (`jobs/<id>/events/`).

### Lot 3 — Rendre l'app tenable dans le temps (≈ 1,5 sprint)

11. **Pagination** via `useInfiniteQuery` sur les neuf listes concernées (P1-1).
12. `expo-notifications` + `devices/register/` + routes adressables pour que la
    notification ouvre le bon écran (P0-4 et P2-1 se traitent ensemble).
13. `focusManager` sur `AppState` + `onlineManager` sur NetInfo, avec bandeau
    hors ligne (P1-2, P1-3).
14. `BackHandler` sur les vues détail (P2-1).
15. Tests : `apiClient` (refresh, anti-stampede, logout), gardes de navigation,
    `FloatingTabBar` par rôle. Seuil de couverture en CI.

### Lot 4 — Publier (≈ 1 sprint)

16. Suppression de compte in-app, politique de confidentialité, mentions légales.
17. `testID` systématiques + parcours E2E Maestro (login → publication → demande
    → acceptation → complétion).
18. Passe d'accessibilité : `accessibilityLabel` sur tous les contrôles,
    contraste, taille de police dynamique.
19. Projet iOS + passage sur appareil réel.
20. Mise à jour du `README.md` et de la documentation en dérive (P2-6).

---

## 7. Ce que je retiendrais si je ne devais retenir qu'une chose

La qualité du code applicatif de ce projet est **au-dessus de la moyenne du
marché** : typage strict sans échappatoire, architecture lisible, décisions
techniques documentées et justifiées, problèmes durs (RTL, persistance, refresh
concurrent) traités correctement du premier coup.

Cette qualité rend l'absence d'industrialisation d'autant plus coûteuse. Il
n'existe aujourd'hui **aucun filet** : pas de CI pour attraper une régression,
pas de lint pour tenir la barre, pas de tests sur le composant le plus critique,
pas de crash reporting pour savoir ce qui casse chez l'utilisateur, pas de build
reproductible pour livrer.

Le Lot 1 ne produit **aucune fonctionnalité visible** et c'est précisément
pourquoi il a été repoussé deux fois. C'est pourtant le seul dont dépendent tous
les autres.

---

## Annexe A — Commandes de vérification

```bash
cd mobile
npm ci
npx tsc --noEmit        # attendu : 0 erreur           (vérifié ✅)
npx jest                # attendu : 6 suites, 22 tests (vérifié ✅)
npx expo-doctor         # attendu : 18/18              (vérifié ✅)
npm run lint            # ⚠️ tente d'installer ESLint — aucune config commitée
```

## Annexe B — Réserves de l'audit

1. **Audit statique.** Aucun parcours n'a été rejoué sur appareil dans le cadre
   de ce document. Les constats fonctionnels reposent sur la lecture du code et
   sur la comparaison avec les routes backend, pas sur une exécution.
2. **Backend supposé conforme à ses URLs.** La disponibilité réelle et le
   comportement des endpoints listés en §4 n'ont pas été testés ; seule leur
   déclaration dans `urls.py` a été vérifiée.
3. **Restriction de la clé Google Maps** (§3.3, P2-7) : à confirmer dans la
   console Google Cloud — non vérifiable depuis le dépôt.
4. **Le taux de 38 % de couverture d'API** est un indicateur, pas un objectif.
   Une partie des endpoints non consommés relève du modèle « offres » abandonné
   lors du pivot « trajets retour » et n'a pas vocation à être branchée.
