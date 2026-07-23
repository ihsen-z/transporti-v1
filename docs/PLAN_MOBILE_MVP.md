# PLAN TECHNIQUE — MVP APPLICATION MOBILE
## Transporti V1 (Expo / React Native)

**Date :** 23 juillet 2026 · **Statut :** proposition (v1, à valider)
**Références :** VISION_PRODUIT_FONDATRICE · PIVOT_STRATEGIQUE_TRAJETS_RETOUR_2026-07-14 · DOSSIER_DECISIONS_SPRINT0 (D1–D15) · DICTIONNAIRE_KPI · le squelette Expo existant sous mobile/ (présent dans git).

> Ce plan est ancré dans le code réel du dépôt (endpoints backend, décisions figées, contrat API).

> **Addendum décision (23/07/2026) — GREENFIELD.** L'équipe a tranché : **on ne restaure PAS le squelette `mobile/` existant ; l'application mobile est refaite depuis zéro.** Conséquences sur ce document :
> - L'hypothèse « reprise contrôlée du squelette » (§1, Réserve #2) est **caduque** — on repart d'un projet Expo neuf (`create-expo-app` + `expo install`), on ne récupère PAS le code existant.
> - La §6.4 « dette qualité à purger avant reprise » devient **sans objet** (pas de reprise).
> - Ce qui reste **pleinement valable** : le périmètre MoSCoW (§2), le contrat API/endpoints (§4), les parcours (§5), les décisions de stack (§6.1/6.2), sécurité (§7), temps réel/paiement (§8/§9), tests/CI (§10), le phasage S0–S5 (§11) et les risques (§12). Le §6.2 (choix de libs) et l'arbo cible (§3) servent de **cible de scaffolding**, non de réutilisation.

---

## Plan technique — MVP Mobile Transporti V1

**Statut : proposition v1 — à valider par la direction technique (non encore revue par un humain).**
Projet: Transporti V1, marketplace des trajets retour à vide (Tunisie), pivot « Return Trips First ».
Contexte: backend Django REST + frontend web Next.js déjà livrés. Objet de ce document: cadrer et livrer un **MVP mobile** (iOS + Android).

---

## 1. Contexte & objectif du MVP mobile

Le backend expose déjà l'intégralité du domaine métier via une API REST versionnée (`/api/v1/`) : gestion des trajets/jobs, moteur de trajets retour, offres, escrow, KYC, notifications, messagerie. Un frontend web Next.js consomme cette API.

Un code mobile Expo existe déjà dans `mobile/` (95 fichiers) mais il est **actuellement mis en scène pour suppression** dans l'index git et repose sur une baseline de dépendances non fiable (voir §6). Le MVP ne repart donc pas de zéro conceptuellement, mais **assume une reprise contrôlée** : on récupère l'architecture et les mappers/DTO qui reflètent le contrat backend réel, et on **regèle la stack** avant toute reprise de build.

**Objectif métier du MVP** : permettre à un transporteur en trajet retour et à un client d'un corridor de se rencontrer et de conclure une course, bout en bout, depuis un téléphone, avec un chemin de paiement **fiable dès J1**.

**Objectif technique** : livrer une application Expo buildable via EAS, connectée à l'API réelle en environnement staging Render, couvrant le funnel critique, sans dépendre des briques d'infrastructure non câblées (WebSocket, worker asynchrone, gateway digitale, S3).

**Critère de succès (Definition of Done du MVP)** : un client crée une demande, un transporteur voit l'annonce sur son corridor et fait une offre, le client accepte, la course se déroule et se clôture, le paiement est réglé (COD nominal), les deux parties peuvent échanger des messages et recevoir des notifications. Le tout démontrable sur device physique iOS et Android depuis un build de staging.

---

## 2. Périmètre fonctionnel

### 2.1 Dans le périmètre (MVP)

| Domaine | Fonctionnalités | Endpoints réels associés |
|---|---|---|
| Identité | Inscription, connexion, refresh token, profil, choix de rôle | `auth/register`, `auth/login`, `auth/token/refresh`, `auth/profile` |
| Trajets retour (pivot) | Créer un trajet retour, matching corridor, réserver un retour | `jobs/return-trip/`, `return-trips/match/`, `jobs/<id>/book-return/`, `corridor-alerts/` |
| Demandes & annonces | Créer/publier une demande, liste publique, détail, mes demandes | `jobs/`, `jobs/public/`, `jobs/<id>/`, `jobs/my/`, `jobs/<id>/publish/` |
| Offres | Émettre, lister, accepter, retirer une offre | `offers/`, `offers/my/`, `offers/<id>/accept/`, `offers/<id>/withdraw/` |
| Cycle de course | Confirmer départ, événements, compléter, annuler | `jobs/<id>/confirm-start/`, `jobs/<id>/events/`, `jobs/<id>/complete/`, `jobs/<id>/cancel/` |
| Paiement | **COD nominal**, escrow en lecture, confirmation de complétion | `payments/confirm-completion/`, `jobs/<id>/escrow/`, `payments/<ref>/status/` |
| Messagerie | Conversations par job, messages (polling) | `conversations/`, `jobs/<id>/messages/` |
| Notifications | Liste, non-lus, marquer lu, enregistrement device (push) | `notifications/my/`, `notifications/unread-count/`, `notifications/devices/register/` |
| KYC / Trust | Upload document, statut de vérification | `trust/documents/`, `trust/status/` |

### 2.2 Hors périmètre (post-MVP, tracé mais désactivé par flag)

- **Chat temps réel WebSocket** : le backend n'expose aucun canal WS fonctionnel (voir §8) → messagerie en **polling** uniquement au MVP.
- **Paiement digital de bout en bout** : la gateway (`D17Gateway`) est un squelette (voir §9) → l'écran WebView paiement (`app/payment/webview.tsx`) reste feature-flaggé off.
- **File offline riche** (`offlineQueueStore.ts`) : rejoué en post-MVP (voir §8.3).
- **Espace admin/modération mobile** (`app/admin/dashboard.tsx`) : reste sur le web.
- **Disputes/litiges** : lecture seule au MVP ; création reportée.
- **Portefeuille transporteur / retraits** : lecture seule ; retraits post-MVP.

---

## 3. Architecture technique cible

Architecture **feature-first** conservée depuis l'existant, qui est saine :

```
mobile/
  app/                      # routes expo-router (composition only)
    (auth)/                 # login, register
    (tabs)/                 # home, jobs, create, messages, profile
    job/[id].tsx            # détail + offres
    chat/[jobId].tsx        # messagerie (polling)
    trust/, profile/
  src/
    core/                   # api client, auth, storage, i18n, theme, notifications
    features/<domaine>/
      api/    (…Api.ts hooks React Query, dto.ts, mapper.ts)
      domain/ (model.ts)
    location/               # géoloc corridor
    shared/                 # composants maps, hooks réseau
```

Principes (alignés CLAUDE.md §4) :
- Les fichiers de route **composent** ; la logique vit dans `src/features/*/api` (hooks React Query) et `src/features/*/domain`.
- Séparation stricte **DTO ↔ domain** via `mapper.ts` — déjà en place (`jobDto.ts`/`jobMapper.ts`/`jobModel.ts`) : c'est ce qui isole le mobile des variations de payload backend.
- État serveur = **TanStack Query** ; état client (auth, préférences) = **Zustand + MMKV**.
- Typage strict, zéro `any` non justifié (CLAUDE.md §3) — nettoyage requis (voir §6.4).

---

## 4. Contrat API & intégration backend

### 4.1 Base URL & versionnement

Le client (`mobile/src/core/api/client.ts`) résout `EXPO_PUBLIC_API_BASE_URL` et gère la bascule `localhost ↔ 10.0.2.2` (émulateur Android). **Point à trancher (P1)** : le backend expose deux préfixes concurrents, `/api/` (non versionné) et `/api/v1/`. **Décision : le mobile consomme exclusivement `/api/v1/`** ; toute route absente de `v1` est signalée à l'équipe backend pour rétro-portage, pas contournée via `/api/`.

### 4.2 Format d'erreur normalisé

Le contrat interne (`core/api/types.ts`) est un `ApiResult<T>` discriminé (`success` + `ApiError{code,message,details,status}`). Les intercepteurs (`interceptors.ts`) doivent mapper les erreurs DRF (`{detail}`, erreurs de champ) vers ce format, et gérer le **refresh token** sur 401 avant rejet.

### 4.3 Pagination

Les listes backend renvoient parfois `{results: [...]}` (DRF paginé) et parfois un tableau brut — l'existant gère déjà les deux cas (`'results' in data ? … : Array.isArray …`). À **factoriser** dans un helper unique plutôt que dupliqué par hook.

### 4.4 Contrats confirmés (échantillon vérifié dans le code)

- `offers/<id>/accept/` attend `{ payment_method: 'DIGITAL' | 'COD' }`.
- `offers/` (création) attend `{ job, total_price, message, valid_until }`.
- Auth renvoie `access` + `refresh` ; l'utilisateur porte `role ∈ {CLIENT, TRANSPORTER, ADMIN, MODERATOR}` et `is_verified`.

---

## 5. Parcours utilisateurs (flows)

**Flow A — Client (demande → course réglée)**
1. Inscription/connexion (rôle CLIENT).
2. Créer une demande (`jobs/`) ou une demande de trajet retour ; estimation prix (`jobs/estimate-price/`).
3. Publier (`jobs/<id>/publish/`) → réception d'offres.
4. Consulter les offres (`jobs/<id>/offers/`), accepter (`offers/<id>/accept/` avec `COD`).
5. Suivre la course (`jobs/<id>/events/`), messagerie (polling).
6. Confirmer complétion (`payments/confirm-completion/`), noter le transporteur.

**Flow B — Transporteur (corridor → offre → course)**
1. Connexion (rôle TRANSPORTER) + KYC (`trust/submit/`) si `is_verified=false`.
2. Déclarer un trajet retour (`jobs/return-trip/`) et/ou créer une alerte corridor (`corridor-alerts/`).
3. Voir les demandes compatibles (`jobs/transporter/`, `return-trips/match/`).
4. Émettre une offre (`offers/`), suivre (`offers/my/`).
5. Sur acceptation : `confirm-start` → exécution → `complete`.

**Flow C — Trajet retour direct (cœur du pivot)**
Un transporteur publie un retour à vide ; un client le réserve directement (`jobs/<id>/book-return/`) ou négocie via `trip-requests/<id>/respond|accept-counter`.

Chaque écran de route reste mince ; la logique passe par les hooks `features/*/api`.

---

## 6. Stack, dépendances & décisions techniques

### 6.1 P0 — Regeler la baseline de dépendances (bloquant build)

Le `mobile/package.json` existant déclare des versions **non fiables / en avance sur le réel** : `expo ~56`, `react-native 0.85.3`, `react 19.2.3`, `typescript ~6.0.3`, `i18next ^26`, `zod ^4`. Ces combinaisons ne correspondent pas à une baseline Expo réellement publiée et rendraient un build EAS impossible ou instable.

**Décision** : figer la stack sur une **baseline Expo LTS réellement disponible et supportée par EAS** au démarrage du sprint 0, aligner toutes les libs sur `expo install` (versions résolues par le SDK), et **ne jamais** conserver des numéros de version « devinés ». Toute montée de version majeure (React 19, TS 6, Zod 4) doit être justifiée et testée, pas héritée par défaut. Un `expo-doctor` vert est une porte de sortie du sprint 0.

### 6.2 Librairies retenues (rôles)

- Navigation : **expo-router** (file-based, déjà en place).
- Données serveur : **@tanstack/react-query**.
- État client : **zustand** + persistance **react-native-mmkv**.
- Secrets/tokens : **expo-secure-store** (jamais MMKV pour les tokens).
- Formulaires : **react-hook-form + zod** (+ `@hookform/resolvers`).
- Cartes/corridor : **react-native-maps** + `expo-location`, avec variantes `.web.tsx` déjà prévues.
- i18n : **i18next + react-i18next + expo-localization** (fr/ar).
- Observabilité : **@sentry/react-native**.
- HTTP : **axios** avec intercepteurs.

### 6.3 Configuration & environnements

`app.json` cible déjà `tn.transporti.app` (iOS/Android), scheme `transporti`, plugins expo-router/secure-store/localization/sentry. Trois fichiers d'env existent (`.env.development|staging|production`). **Décision** : builds gérés par **EAS Build** avec profils `development`/`preview`/`production`, la base URL injectée par `EXPO_PUBLIC_API_BASE_URL`.

### 6.4 P1 — Dette qualité à purger avant reprise

- `jobApi.ts` contient un **commentaire parasite inline** et une incertitude d'import `jobModel` (`'../domain/jobModel'`) — à nettoyer et valider par `tsc --noEmit`.
- Factoriser le déballage pagination (`results`) dupliqué.
- Passe `tsc --noEmit` + ESLint verte exigée (CLAUDE.md §3).

---

## 7. Sécurité, authentification & conformité

- **JWT** : `access` en mémoire + `refresh` dans `expo-secure-store` (`tokenService.ts`). Refresh silencieux sur 401 via intercepteur, puis rejeu de la requête ; échec du refresh → `logout()` (`authStore.ts`).
- **RBAC côté UI** : le rôle porté par `User` conditionne la navigation (client vs transporteur) ; l'autorisation reste **autoritative côté backend** (le choke-point `RequireRole` du backend fait foi — cf. mémoire d'architecture). Le mobile ne fait que de l'affichage conditionnel.
- **Aucun secret côté client** hors clés publiques (CLAUDE.md §7). Les clés Sentry DSN/maps publiques uniquement.
- **KYC** : upload de documents via `trust/documents/` ; les images sensibles ne transitent que vers l'API, jamais vers un tiers.
- **Données personnelles** : jamais en query string ; conformité RGPD/loi tunisienne sur les données — pièces d'identité chiffrées au repos côté backend (dépendance backend, à confirmer, voir §12).
- **Deep links** : scheme `transporti://` validé pour éviter le hijacking d'intent (notamment retour de paiement post-MVP).

---

## 8. Temps réel, notifications & offline

### 8.1 P0 — Messagerie : polling, pas WebSocket

Le code mobile embarque un `socketManager.ts`, mais **le backend n'expose aucun canal WebSocket fonctionnel** : `realtime_api` n'expose que `/data/`, Channels est déclaré mais « fantôme », et la messagerie réelle est **HTTP** (`jobs/<id>/messages/`, `conversations/`). 

**Décision MVP** : `socketManager` est **désactivé/retiré du chemin critique** ; la messagerie et le suivi de course fonctionnent par **polling React Query** (`refetchInterval`, ex. 5–10 s sur l'écran de chat ouvert uniquement, pour préserver la batterie). Le temps réel WS est un chantier backend **prérequis** avant toute réactivation.

### 8.2 Notifications push

Le backend gère l'enregistrement de device tokens (`notifications/devices/register/`, FCM). **Risque (P1)** : sans worker asynchrone câblé (pas de Celery opérationnel), l'**émission** des push est incertaine. 

**Décision** : le mobile implémente correctement l'enregistrement du token et la réception, mais le MVP **ne dépend pas** du push pour le funnel — un **badge de non-lus par polling** (`notifications/unread-count/`) garantit que rien n'est manqué même si le push ne part pas. Le push est un « nice-to-have » activé quand le backend confirme un émetteur fiable.

### 8.3 Offline

`offlineQueueStore.ts` (file de rejeu) et `useNetworkStatus` existent. **Décision** : au MVP, on se limite à un **cache React Query + détection hors-ligne + message clair**, sans file d'écritures rejouées (source de bugs de cohérence). La file offline riche est **post-MVP**.

---

## 9. Paiement & escrow

### 9.1 P0 — COD comme chemin nominal

Le flux d'acceptation d'offre porte `payment_method: 'DIGITAL' | 'COD'`. La gateway digitale (`D17Gateway`, commit récent remplaçant Konnect) est un **squelette non testable end-to-end**. L'écran `app/payment/webview.tsx` (WebView) en dépend.

**Décision** : le MVP livre le funnel complet en **COD (paiement à la livraison)**. L'escrow est exposé en **lecture** (`jobs/<id>/escrow/`, `jobs/<id>/booking/`) pour la transparence, et la **confirmation de complétion** (`payments/confirm-completion/`) clôture la transaction. Le paiement digital (WebView + webhook `payments/webhook/`) reste **feature-flaggé off** jusqu'à ce que la gateway soit fonctionnelle et testée en sandbox.

### 9.2 Portefeuille & retraits

`wallet/` et `wallet/withdrawals/` sont exposés côté transporteur : **lecture seule** au MVP (solde, historique), sans déclenchement de retrait mobile (action financière sensible — cadrage backend + conformité requis).

---

## 10. Qualité, tests & CI/CD

- **Type-check** : `tsc --noEmit` bloquant en CI (CLAUDE.md §3), zéro erreur tolérée.
- **Lint/format** : ESLint (config expo) + Prettier, déjà configurés.
- **Tests** :
  - Unitaires sur **mappers** (`jobMapper`, `disputeMapper`, `trustMapper`) — frontière de contrat la plus risquée.
  - Tests de hooks React Query (mock axios) sur les flux critiques (offre, acceptation, complétion).
  - Un smoke test e2e (Maestro/Detox, post-stabilisation) sur le funnel A.
- **CI** : GitHub Actions → install (`expo install` résolu) → typecheck → lint → tests → `eas build --profile preview` sur merge vers `master`.
- **Distribution QA** : builds EAS `preview` diffusés via lien interne (TestFlight interne / APK), pointant sur **staging Render**.
- **Observabilité** : Sentry activé en staging/prod (source maps uploadées au build).

---

## 11. Plan de livraison (jalons)

| Sprint | Durée | Contenu | Sortie / DoD |
|---|---|---|---|
| **S0 — Socle** | ~1 sem. | Regeler la stack (§6.1), `expo-doctor` vert, purger dette qualité (§6.4), CI typecheck/lint, build EAS preview vide qui démarre | App buildable sur device, connectée à staging |
| **S1 — Identité & socle API** | ~1,5 sem. | Auth JWT + refresh, secure-store, i18n fr/ar (+ RTL), thème, client/intercepteurs, gestion erreurs `ApiResult` | Login/register/profil fonctionnels bout en bout |
| **S2 — Cœur trajets & offres** | ~2 sem. | Création demande + trajet retour, listes/détail, corridor + maps, émission/acceptation d'offre (COD) | Funnel A+B jusqu'à acceptation démontrable |
| **S3 — Cycle de course & clôture** | ~1,5 sem. | confirm-start, events, complete, confirmation de complétion, escrow en lecture, notation | Course complète réglée en COD |
| **S4 — Messagerie, notifs, KYC** | ~1,5 sem. | Chat polling, badge non-lus, enregistrement device token, upload KYC + statut | Communication + KYC opérationnels |
| **S5 — Durcissement & release** | ~1 sem. | Sentry, tests mappers/hooks, smoke e2e, perf/batterie du polling, préparation stores | Build `production` candidat, checklist store |

Séquencement piloté par le funnel : **rien n'est livré tant que le chemin client↔transporteur↔clôture n'est pas vert**.

---

## 12. Risques & mitigations

| # | Risque | Sév. | Mitigation |
|---|---|---|---|
| R1 | Baseline de dépendances irréaliste → build EAS impossible | **P0** | Regel stack sur SDK Expo LTS réel en S0, `expo-doctor` gate (§6.1) |
| R2 | Chat « temps réel » sans WebSocket backend | **P0** | Polling React Query ; WS = prérequis backend hors MVP (§8.1) |
| R3 | Paiement digital non testable (gateway squelette) | **P0** | COD nominal, digital feature-flaggé off (§9.1) |
| R4 | Push non émis faute de worker asynchrone | P1 | Funnel indépendant du push ; badge non-lus par polling (§8.2) |
| R5 | Stockage média/KYC sans S3 câblé | P1 | Dépendance backend ; le mobile n'assume que l'upload via API, à confirmer côté infra |
| R6 | Ambiguïté `/api/` vs `/api/v1/` | P1 | Mobile sur `/api/v1/` exclusivement (§4.1) |
| R7 | Dette qualité résiduelle (jobApi, imports) | P1 | Nettoyage + `tsc --noEmit` gate en S0 (§6.4) |
| R8 | RTL arabe non validé | P2 | Test I18nManager + revue design RTL en S1 |
| R9 | Scope creep offline queue | P2 | File offline reportée post-MVP (§8.3) |
| R10 | Dérive DTO backend | P2 | Tests unitaires sur mappers (§10) |

---

## Réserves & hypothèses

1. **Entrées de la tâche manquantes.** Les paramètres `PLAN INITIAL` et `CRITIQUES A INTEGRER` transmis par le script d'orchestration sont arrivés **`null`**. Faute de plan initial à réviser et de liste de critiques à intégrer, ce document a été **reconstruit intégralement à partir du code réel du dépôt**, et les critiques P0/P1 ont été **produites par revue directe** (rôle de directeur technique). Si un plan initial existe réellement, il convient de rejouer cette étape avec les entrées correctes pour garantir qu'aucune information amont n'a été perdue.
2. **App mobile en suppression.** Les 95 fichiers `mobile/` sont mis en scène pour suppression (`git rm`) dans l'index. Le plan **suppose une reprise** de cette base (architecture + mappers), pas une réécriture. Si l'intention de l'équipe est de repartir de zéro, les estimations du §11 restent valides mais le §6.4 (dette) devient sans objet.
3. **Versions de dépendances.** Le constat « baseline irréaliste » (§6.1) se fonde sur le contenu littéral de `mobile/package.json`. Le choix du SDK Expo cible exact n'est **volontairement pas figé ici** : il doit être arrêté en S0 sur la dernière LTS réellement supportée par EAS au moment du démarrage, via `expo install` (et non recopié de mémoire).
4. **État de l'infrastructure backend.** Les constats WebSocket « fantôme », absence de worker asynchrone/S3 opérationnels et gateway `D17Gateway` en squelette proviennent de la mémoire d'audit projet et des URLs backend observées. Ils doivent être **reconfirmés avec l'équipe backend** avant chaque déblocage (WS, push fiable, paiement digital, stockage KYC).
5. **Cible de déploiement.** Hypothèse : staging et production backend hébergés sur **Render** (cf. `render.yaml` et mémoire projet) ; les URLs exactes doivent être injectées via les profils EAS.
6. **Estimations de durée.** Les durées du §11 sont indicatives (équipe supposée de 1–2 développeurs mobile) et à recaler selon la capacité réelle.

---

## Méthodologie de production (transparence)

Ce plan a été produit par un workflow multi-agents (reconnaissance du dépôt réel → conception multi-dimensions → synthèse → critique). 10 agents sur 12 ont abouti ; 2 (brouillon de synthèse + critique dédiée) ont échoué sur une limite de session. L'agent de synthèse finale a compensé en reconstruisant le plan directement à partir du code réel et en jouant lui-même la revue P0/P1. Une passe de critique adversariale dédiée reste recommandée avant validation définitive.
