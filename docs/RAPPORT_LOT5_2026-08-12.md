# RAPPORT D'EXÉCUTION — LOT 5 (tenir dans le temps)

**Date :** 12 août 2026 · **Référence :** `PLAN_ACHEVEMENT_MOBILE_2026-08-07.md`
**Périmètre de la session :** achever le Lot 5 (10 tâches), dans la continuité directe des Lots 3
et 4 livrés plus tôt dans la même journée (voir `RAPPORT_LOT3_LOT4_2026-08-12.md`).

---

## 1. Résumé exécutif

Les 10 tâches du Lot 5 sont faites. Deux écarts assumés, documentés en détail plus bas :

- **5.2** a été traité par **deux mécanismes distincts** selon le conteneur UI réel de chaque liste
  (5 vraies `FlatList` → `useInfiniteQuery`, 3 listes imbriquées dans un `ScrollView` →
  rapatriement complet borné), pas un seul mécanisme uniforme comme le libellé de la tâche
  pouvait le laisser supposer.
- **5.10** tranche une décision produit (« chiffrer/renoncer ») en faveur du renoncement : le web
  est formellement sorti du périmètre, avec la découverte à l'appui que son bundle est de toute
  façon déjà cassé par un module natif introduit avant cette session.

Aucun commit n'a été créé — tout est dans l'arbre de travail, prêt à être relu.

---

## 2. Le tableau, tâche par tâche

| # | Tâche | Ce qui a été fait |
|---|---|---|
| 5.1 | Bug missions invisibles >20 | Déjà corrigé plus tôt dans la session (voir rapport Lot 3/4) |
| 5.2 | Pagination des 8 listes plafonnées à 20 | Voir §3 — traitement en deux temps |
| 5.3 | Troncatures serveur non visibles | `total_count` ajouté côté backend pour les messages ; bandeau ajouté pour la recherche (le total existait déjà, jamais comparé) |
| 5.4 | `focusManager` sur `AppState` | Branché dans `app/_layout.tsx`, gardé no-op sur web (`visibilitychange` y existe déjà) |
| 5.5 | `onlineManager` + bandeau hors ligne | `@react-native-community/netinfo` ; `OfflineBanner.tsx` a son propre abonnement (pas de pont artificiel avec `onlineManager`) |
| 5.6 | Anticipation d'expiration du token | `core/auth/jwt.ts` (décodage JWT écrit à la main) + `client.ts`, verrou de refresh partagé avec le rejeu sur 401 |
| 5.7 | Tests de `client.ts` | 9 tests : Bearer, anticipation, rejeu 401, anti-stampede, 502, 400, refresh absent |
| 5.8 | Tests des gardes de navigation | `authRouting.test.tsx` (régression `d3bb922`) + `FloatingTabBar.test.tsx` (rôles, tabPress, badge) |
| 5.9 | Outillage de test de composants | `@testing-library/react-native@12` + `react-test-renderer@18.3.1` (versions compatibles React 18, pas les dernières) |
| 5.10 | JWT en clair sur web | Web sorti du périmètre — voir §5 |

---

## 3. Lot 5.2 — pourquoi deux mécanismes, pas un

Avant d'écrire du code, les 8 listes visées ont été vérifiées une par une contre leur conteneur UI
réel :

| Liste | Conteneur | Traitement retenu |
|---|---|---|
| Notifications | `FlatList` (`NotificationBell`) | `useInfiniteQuery` + `onEndReached` |
| Mes avis | `FlatList` (`ReviewsPanel`) | `useInfiniteQuery` + `onEndReached` |
| Mes litiges | `FlatList` (`DisputesPanel`) | `useInfiniteQuery` + `onEndReached` |
| Conversations | `FlatList` (`messages/index.tsx`) | `useInfiniteQuery` + `onEndReached` |
| Demandes reçues sur un trajet | `FlatList` (`requests/[jobId].tsx`) | **Aucun** — endpoint déjà non paginé (voir ci-dessous) |
| Missions actives | `.map()` dans le `ScrollView` de l'Accueil | `fetchAllPages` (rapatriement complet) |
| Missions terminées | `.map()` dans le `ScrollView` de l'Accueil | `fetchAllPages` |
| Mes demandes (client) | `.map()` dans le `ScrollView` de `mes-demandes.tsx` | `fetchAllPages` |

**Pourquoi deux mécanismes.** `onEndReached` a besoin d'une `FlatList` réelle pour détecter qu'on
approche de la fin — une liste rendue par `.map()` à l'intérieur du `ScrollView` d'un autre écran
n'a rien à quoi accrocher ce callback, sans réécrire l'écran (hors périmètre de cette tâche). Les
trois listes concernées (missions, missions terminées, mes demandes) sont aussi, par nature, des
jeux de données personnels et bornés — les missions d'UN SEUL transporteur, les demandes d'UN SEUL
client — contrairement aux notifications ou aux messages qui peuvent croître sur toute la durée de
vie d'un compte. `core/api/fetchAllPages.ts` (nouveau, testé — 4 tests) boucle sur `next` jusqu'à
épuisement ou un plafond de sécurité (10 pages, ~200 éléments), ce qui règle le bug réel (des
éléments invisibles au-delà de la page 1) sans forcer une réécriture d'écran.

**Découverte pendant l'exécution.** `jobs/<id>/requests/` (demandes reçues sur un trajet) est une
`APIView` nue qui renvoie déjà `count` + `results` SANS pagination DRF (`next`/`previous` absents)
— confirmé par un commentaire déjà présent dans `dto.ts` avant cette session
(`// Réponse custom (APIView, pas de pagination DRF)`). Il n'y avait donc rien à migrer : le hook
est resté un `useQuery` inchangé après vérification.

---

## 4. Lot 5.3 — le total existait déjà à moitié

- **Recherche de retours** (`ReturnTripMatchView`) : le total réel (`count`, avant troncature à
  `MAX_RESULTS=10`) était **déjà renvoyé** par le backend. Le mobile ne le comparait simplement
  jamais à `results.length`. Correctif mobile seul : un bandeau « affinez votre recherche » quand
  `count > results.length`.
- **Messages** (`jobs/<id>/messages/`) : `count` valait déjà `len(messages)`, donc toujours ≤ 100 —
  **aucune information sur le total réel n'existait**. Ajout d'un champ `total_count` côté backend
  (`conversation.messages.count()`), seule façon honnête de savoir si la conversation a été
  tronquée. 2 tests ajoutés (`messaging/tests.py`, jusque-là un scaffold vide).

**Effet de bord.** Écrire ces tests a fait apparaître un bug préexistant sans rapport : un
`IndexError` sur `last_name[0]` dès qu'un utilisateur a un nom de famille vide, présent à
l'identique dans 3 serializers (`messaging/serializers.py:22`, `logistics/serializers.py:66` et
`:407`). Un quatrième site, dans le même fichier que le premier, a déjà le bon garde-fou
(`if p.last_name else ...`). Signalé comme tâche séparée (chip de suggestion), **pas corrigé ici**
— hors périmètre du Lot 5.

---

## 5. Lot 5.10 — décision : le web est hors périmètre

La tâche posait un choix (« chiffrer/renoncer, soit retirer la cible web du périmètre »). Deux
éléments ont tranché en faveur du renoncement :

1. **`react-native-maps` casse déjà le bundle web**, découvert cette session en essayant de
   vérifier visuellement les changements du Lot 3 dans un navigateur (`npm run web` → 500 avant
   même l'écran de connexion). Ce module a été ajouté avant cette session (commit `8d6f926`,
   03/08), sans rapport avec le Lot 5 — mais il rend la question largement théorique aujourd'hui.
2. **Chiffrer les JWT côté JS pour le web n'aurait rien résolu structurellement** : la clé de
   déchiffrement vivrait dans le même contexte d'exécution que n'importe quelle XSS, donc dans le
   périmètre de la même attaque que ce qu'on cherche à mitiger.

**Changements :** `tokenService.ts` ne fait plus de repli silencieux vers `localStorage` sur web —
il lève une `UnsupportedPlatformError` explicite. `README.md` mis à jour (retrait de la mention
`'w' (web)` dans les instructions de lancement, note explicative ajoutée).

---

## 6. Vérification effectuée

**Mobile** (`npm run typecheck` / `lint` / `test:ci` / `npx expo-doctor`) :

- `typecheck` : 0 erreur.
- `lint` : 0 avertissement (`--max-warnings=0`).
- `test:ci` : **18 suites, 112 tests**, tous verts — **30 nouveaux** par rapport à la fin du Lot 4
  (82) : 4 (`fetchAllPages`), 5 (`jwt`), 9 (`client.ts`), 4 (`authRouting`), 8 (`FloatingTabBar`).
- `expo-doctor` : 18/18.
- Couverture globale : **18,69 %**, contre 10,66 % à la fin du Lot 1 et ~10,5 % avant cette session
  — `client.ts` était explicitement le fichier que `jest.config.js` réservait pour poser un seuil
  de couverture réel (commentaire présent dans le fichier avant cette session : « le seuil sera
  posé avec les tests de src/core/api/client.ts »).

**Backend** (`backend/venv/Scripts/python.exe manage.py test`) :

- **212 tests, 210 verts** (2 nouveaux sur `total_count`, tous deux verts). Les 2 échecs restants
  sont les scripts ad-hoc pré-existants `test_book_return.py`/`test_workflows.py` (encodage
  console Windows), inchangés depuis le début de la session — zéro régression introduite.

**Non vérifié :** comme pour les Lots 3 et 4, aucune vérification visuelle device n'a été possible
(pas de compte Expo/EAS). Le web, seule cible où une vérification navigateur aurait été possible,
est précisément celle que ce lot vient de sortir du périmètre (§5).

---

## 7. Fichiers touchés

**Backend**

- `messaging/views.py` (`total_count`), `messaging/tests.py` (2 tests, fichier jusque-là vide)

**Mobile — nouveaux fichiers**

```
app/__tests__/authRouting.test.tsx
src/core/api/fetchAllPages.ts (+ .test.ts)
src/core/api/useFlatInfiniteList.ts
src/core/auth/jwt.ts (+ .test.ts)
src/core/api/client.test.ts
src/shared/ui/FloatingTabBar.test.tsx
src/shared/ui/OfflineBanner.tsx
```

**Mobile — modifiés**

`app/_layout.tsx` (focusManager, onlineManager, OfflineBanner), `app/(app)/messages/index.tsx`,
`app/(app)/search.tsx`, `src/core/api/client.ts` (anticipation d'expiration, `scheduleRefresh`
partagé), `src/core/auth/tokenService.ts` (web hors périmètre), `src/features/missions/api/{useMyMissions,useCompletedMissions}.ts`,
`src/features/my-requests/api/useMyRequests.ts`, `src/features/notifications/api/useNotifications.ts`,
`src/features/notifications/components/NotificationBell.tsx`, `src/features/disputes/api/useMyDisputes.ts`,
`src/features/disputes/components/DisputesPanel.tsx`, `src/features/reviews/api/useMyReviews.ts`,
`src/features/reviews/components/ReviewsPanel.tsx`, `src/features/messaging/api/useConversations.ts`,
`src/features/messaging/components/ChatView.tsx`, `src/features/messaging/api/dto.ts`,
`src/shared/ui/FloatingTabBar.tsx`, `README.md`, `package.json` / `package-lock.json`
(`axios-mock-adapter`, `@react-native-community/netinfo`, `@testing-library/react-native`,
`react-test-renderer`).

**Documentation** : `docs/PLAN_ACHEVEMENT_MOBILE_2026-08-07.md` (Lot 5 marqué livré, écarts
documentés).

---

## 8. Prochaine étape recommandée

Avec les Lots 0 à 5 livrés, il ne reste que le **Lot 6 (publication)** — dont la quasi-totalité des
tâches dépendent de comptes externes (Apple/Google Developer, Sentry, Expo/EAS) ou de décisions
produit (politique de suppression de compte, contenu réel des CGU) plutôt que de code pur. La
tâche la plus autonome du lot, **6.5 (`testID` systématiques)**, pourrait démarrer sans attendre
ces dépendances.
