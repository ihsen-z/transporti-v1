# PLAN D'ACHÈVEMENT — APPLICATION MOBILE TRANSPORTI V1

**Date :** 07 août 2026 · **Statut :** proposition, à valider par la direction technique et le BO
**Références :** `VISION_PRODUIT_FONDATRICE.md` · `PLAN_MOBILE_MVP.md` (S0–S5) ·
`AUDIT_MOBILE_TRANSPORTI_2026-08-03.md` · `DICTIONNAIRE_KPI.md` · `PIVOT_STRATEGIQUE_TRAJETS_RETOUR_2026-07-14.md`

**Méthode.** Ce plan n'est pas une relecture de l'audit du 03/08. Il a été reconstruit à partir du
code réel du dépôt et de **sondes d'exécution sur le backend** (requêtes Django authentifiées jouant
les parcours client et transporteur de bout en bout). Chaque constat porte une preuve `fichier:ligne`
ou un code de réponse HTTP observé. Les écarts avec l'audit du 03/08 sont listés en **annexe A**.

---

## 1. Ce qui change par rapport à ce que l'on croyait

Trois découvertes non signalées par l'audit du 03/08 réorientent complètement la priorisation. Elles
ont toutes la même racine.

> **Sur un trajet retour, `job.owner` est le TRANSPORTEUR.** Le client n'est rattaché au job que par
> une `ReturnTripRequest` au statut `ACCEPTED`. Or les contrôles de participation du backend ne
> connaissent que deux figures : « le propriétaire du job » et « le transporteur d'une offre
> acceptée ». **Le client du canal retour n'existe pour aucun d'entre eux.**

**Découverte 1 — le parcours client du pivot est cassé, pas incomplet.** Sondes sur un client dont la
demande vient d'être acceptée (job `MATCHED`) :

| Appel | Réponse observée | Cause |
|---|---|---|
| `GET jobs/<id>/` | **403** | `logistics/views/jobs.py:181-186` |
| `GET/POST jobs/<id>/messages/` | **403** | `messaging/services.py:71-82` (alors que `GET conversations/` répond 200) |
| `POST payments/initiate/` | **404** | `payments/views.py:37` filtre `owner=request.user` |
| `POST payments/confirm-completion/` | **404** | `payments/views.py:270`, même filtre |
| `GET jobs/<id>/escrow/`, `/booking/` | **403** | `payments/views.py:313`, `:346` |
| `POST reviews/` | **400** « not a participant » | `reviews/serializers.py:32-39` |
| `POST disputes/` | **400** idem | `support/services.py:21-34` |
| `POST jobs/<id>/cancel/` | **404** | `logistics/views/jobs.py:422-431` (owner + DRAFT/PUBLISHED) |

Autrement dit : **on ne peut pas construire les écrans clients manquants aujourd'hui**, ils
renverraient tous une erreur. Ce n'est pas du travail mobile, c'est du déblocage backend — et il est
peu coûteux (une règle à factoriser, cinq points d'appel).

**Découverte 2 — une mission retour acceptée ne peut jamais être terminée.**
`jobs/<id>/complete/` exige le `delivery_pin` dès qu'un `Booking` existe
(`logistics/views/jobs.py:552-564`), et `trip_requests.py:142` en crée toujours un. Or les trois
seules sources du PIN sont fermées au client. Le mobile l'affiche une fois, en volatile, depuis la
réponse de mutation (`MyRequestCard.tsx:33`) : rechargez l'écran, il est perdu. **La boucle n'est
pas ouverte, elle est coupée à la livraison.**

**Découverte 3 — une mission COD ne génère ni escrow, ni commission, ni gain visible.**
`create_commission_debt_on_cod` (`payments/services.py:572`) **n'a aucun appelant** dans tout le
dépôt. Sonde COD complète : `confirm-start` 200 → `complete` 200 → `GET wallet/` →
`{available: 0.0, cod_debt: 0.0, history: []}`. Le COD est pourtant le **chemin nominal** retenu par
le plan MVP §9.1. Conséquence directe : **la plateforme ne facture rien et le transporteur voit
0 TND** après une livraison réussie.

Bonne nouvelle vérifiée : sur le **canal classique** (client publie, transporteur fait une offre), la
boucle argent fonctionne intégralement en sandbox — `accept → initiate → verify → complete →
confirm-completion → wallet 360 TND → withdrawal 201`, tout en 200/201. La mécanique existe ; elle
n'a simplement jamais été câblée sur le canal qui est le cœur du modèle.

---

## 2. État actuel face aux attentes du BO

| Promesse / principe BO | Attendu | Réel au 07/08 |
|---|---|---|
| **Principe n°1** — les retours à vide sont le cœur | Le canal retour est le parcours le mieux traité | 🔴 C'est le seul canal **cassé côté serveur** pour le client. Le canal classique, lui, marche — mais le mobile ne l'emprunte jamais |
| **Transporteur** — « gagnez plus avec les trajets que vous faites déjà » | Voir ses gains, être payé, retirer | 🟠 Publication, demandes, contre-offre, départ, complétion, notation : OK. Gains = 4 tuiles en lecture seule (`gains.tsx`), **0 endpoint `wallet/` consommé**, aucun retrait, 0 TND affiché après un COD |
| **Client** — « un transporteur fiable au meilleur prix en quelques minutes » | Chercher, comparer, suivre, payer, noter | 🔴 Recherche + demande + alerte corridor : OK. **Tout ce qui suit l'acceptation renvoie 403/404.** L'app affiche déjà les boutons Avis et Litige, qui échouent |
| **Confiance** — transporteurs vérifiés, transparence | Voir note, avis et vérification avant de s'engager | 🔴 La carte de résultat n'expose ni `owner_id`, ni note, ni badge vérifié (`logistics/serializers.py:45-53`). « Transporteur fiable » se résume à un prénom. Les endpoints existent pourtant et répondent 200 |
| **Confiance** — assistance en cas de litige | Ouvrir un litige | 🔴 400 pour le client du canal retour ; bug 500 confirmé si un transporteur-propriétaire poste un avis (`reviews/models.py:146`) |
| **Simplicité** | Parcours fluide, réversible | 🟠 UI propre et conforme à la charte, i18n fr/ar + RTL réellement traités. Mais **aucune annulation** possible nulle part, et le mot de passe oublié est une impasse (**aucun e-mail n'est envoyé** : `users/views.py:424-441` se contente d'un `logger.info`) |
| **KPI — temps avant 1er matching** | Réponse rapide, donc push | 🔴 Aucun push possible : `PUSH_NOTIFICATION_MODE = SANDBOX`, le chemin `PRODUCTION` lève `NotImplementedError` (`notifications/push_service.py:156`), `expo-notifications` absent du mobile. Palliatif : 3 sondages (5 s / 10 s / 15 s) jamais suspendus |
| **KPI — conversion mission → paiement** | Mesurable | 🔴 Non mesurable : le mobile n'atteint jamais l'étape de paiement |
| **Livrabilité** | Un binaire tracé, publiable | 🔴 Zéro industrialisation : pas d'`eas.json`, pas de CI mobile, pas d'ESLint, pas de Sentry, pas d'`ErrorBoundary`, pas de `versionCode`, pas d'icône (le binaire porte l'icône Expo par défaut), pas d'iOS |
| **Qualité du socle** | Tenu | 🟢 `tsc --noEmit` 0 erreur, `jest` **11 suites / 57 tests** verts, `expo-doctor` vert, 0 `any` |

**Résumé pour le BO :** le transporteur a une application ; le client a une vitrine. Et personne ne
paie.

---

## 3. Principe de séquencement

Trois règles gouvernent l'ordre des lots.

1. **Rien de fonctionnel côté client avant le déblocage serveur.** Construire des écrans qui
   reçoivent 403 est du gaspillage pur. Le Lot 0 est court et conditionne les Lots 2 à 4.
2. **Le socle se fait en parallèle, pas après.** Le Lot 0 est du travail backend, le Lot 1 est du
   travail mobile : ils ne se marchent pas dessus et s'exécutent dans la même fenêtre.
3. **Le report du travail invisible doit devenir impossible, pas déconseillé.** Il a déjà été
   repoussé deux fois (S0, puis S5 du plan initial). Le mécanisme retenu n'est pas une
   recommandation : le contexte `mobile-build-and-test (20.x)` est **ajouté au ruleset de protection
   de `master`** (`github_ruleset_master.json`), donc à partir de la fin du Lot 1, **aucun code mobile
   ne peut être fusionné sans CI verte**. Et chaque lot suivant a pour DoD un **numéro de build EAS
   preview**, pas une démonstration sur le poste du développeur.

**Chemin critique :** `Lot 0 (déblocage retour) → Lot 2 (boucle argent) → Lot 4 (push)`.
Le Lot 1 est parallèle mais **bloquant pour la DoD de tous les autres**.

---

## LOT 0 — Débloquer le canal « trajet retour » *(backend, prérequis absolu)*

> **Objectif business :** rendre le pivot exploitable. Aujourd'hui le cœur du modèle est le seul
> canal qui ne fonctionne pas de bout en bout.

> ### ✅ Livré le 07/08/2026
>
> Les 11 tâches sont faites, avec deux écarts documentés (0.11 dépend encore de l'infra e-mail,
> et un point de politique financière est remonté plus bas). La règle de participation vit
> désormais dans **`backend/logistics/participants.py`** et est la seule source de vérité.
>
> **Découverte pendant l'exécution :** la règle n'était pas dupliquée 4 fois mais **5** — une
> cinquième copie se cachait dans `Review.clean()` (`reviews/models.py:136`), invisible depuis les
> vues. C'est le test d'intégration qui l'a fait tomber, pas la lecture du code.
>
> **Vérification :** `logistics/tests/test_parcours_retour.py` — **20 tests, tous verts**, qui
> rejouent le parcours retour complet en COD et en DIGITAL sandbox. Suite complète :
> **204 tests, 202 verts**, les 2 échecs restants étant préexistants et sans rapport
> (`test_book_return.py` et `test_workflows.py`, scripts ad-hoc à la racine de `backend/` qui
> plantent sur l'encodage console Windows — vérifié par `git stash`).
>
> **Point remonté au BO, non corrigé volontairement :** la temporisation de l'auto-libération part
> de la **création du séquestre** (donc du paiement), pas de la livraison. Une mission payée lundi
> et livrée vendredi se libère à l'instant même de la livraison, sans laisser au client la moindre
> fenêtre pour contester. Sept tests verrouillent ce comportement. C'est une décision de politique
> financière, pas un bug à corriger en silence — elle est documentée dans le code
> (`payments/services.py`, `get_escrow_eligible_for_auto_release`).

| # | Tâche | Ce qui a été fait | État |
|---|---|---|:--:|
| 0.1 | Règle de participation unique | **créé** `logistics/participants.py` : `get_job_client`, `get_job_transporter`, `get_paying_client`, `is_job_participant` (strict : argent, avis, litiges) et `is_conversation_participant` (élargi : messagerie seule) | ✅ |
| 0.2 | Brancher la règle partout | `messaging/services.py`, `support/services.py`, `reviews/serializers.py`, `logistics/views/jobs.py` (`JobDetailView`) **+ `reviews/models.py` (5ᵉ copie trouvée par le test)**. `get_or_create_conversation` peuple aussi les deux parties via la règle | ✅ |
| 0.3 | Payeur ≠ propriétaire | `get_paying_client` utilisé dans `InitiatePaymentView`, `VerifyPaymentView`, `ConfirmCompletionView`, `PaymentStatusView` ; `JobBookingDetailView` et `JobEscrowDetailView` passent par `is_job_participant` (deux blocs d'autorisation identiques supprimés) | ✅ |
| 0.4 | `delivery_pin` au client | **Aucun code ajouté** : `get_delivery_pin` implémentait déjà la bonne règle, elle était seulement inatteignable derrière le 403. La méthode a été réécrite sur `get_paying_client` pour ne pas laisser une copie de plus | ✅ |
| 0.5 | Commission sur COD | `create_commission_debt_on_cod` appelé dans `JobCompleteView`. Un refus du garde-fou de confiance est journalisé en ERROR sans jamais bloquer une livraison déjà effectuée | ✅ |
| 0.6 | Gains COD visibles | `get_wallet_summary` expose `cod_collected_net`, **délibérément hors de `available`** (l'argent est en main, la plateforme ne doit rien). `GET wallet/` ajoute une entrée d'historique `kind: 'COD'`, et `transporter/stats/` un `earnings_cod_collected` | ✅ |
| 0.7 | Annulation client | `ClientBookingCancelView` + route `jobs/<id>/client-cancel/`. Asymétrie assumée : sur un retour le trajet **repart en PUBLISHED** (il appartient au transporteur), sur le canal classique il passe en CANCELLED | ✅ |
| 0.8 | Signaux de confiance | `owner_id`, `owner_rating`, `owner_review_count`, `owner_verification_status` sur `TransportJobListSerializer` ; annotés dans `return-trips/match/` pour ne pas payer trois requêtes par résultat | ✅ |
| 0.9 | Filtre `?type=` | `jobs/transporter/` accepte `assigned` / `owned` ; sans paramètre le comportement précédent est conservé | ✅ |
| 0.10 | Correctifs de justesse | Bug 500 des avis corrigé (vues **et** modèle) ; `auto_release_escrow` délègue au helper avec garde-fou L2 et lit `settings.ESCROW_AUTO_RELEASE_HOURS` (48 h, décision L2 — la commande codait 72 h) ; `create_notification()` écrit comme adaptateur sur `notify()` — 3 événements n'émettaient **rien du tout** | ✅ |
| 0.11 | E-mail de réinitialisation | Gabarit `password_reset` + envoi réel via `send_transactional_email`, avec le lien web **et** le lien mobile dans le corps. Réponse inchangée en cas d'échec (pas d'énumération de comptes) | ⚠️ code fait, **dépend encore de l'infra SMTP** |

**Definition of Done — atteinte.**

```bash
cd backend && python manage.py test logistics.tests.test_parcours_retour
```

20 tests verts : accès au job, PIN visible du client et **invisible du transporteur**, messagerie,
booking, escrow, boucle COD complète (dette de commission + gains visibles), boucle DIGITAL complète
(`initiate → verify → complete → confirm-completion → escrow RELEASED → solde retirable`), avis des
deux côtés, litige, annulation client, signaux de confiance sur le matching, filtre `?type=`. Les
cas négatifs sont couverts aussi : un client dont la demande a été refusée reste à 403, un intrus ne
peut pas payer la mission d'un autre.

**Reste à faire pour clore le lot :** ajouter ce test à `backend-ci.yml` pour le rendre non
contournable, et provisionner le SMTP (`SENDGRID_API_KEY`, `EMAIL_BACKEND` ≠ console) pour 0.11.

---

## LOT 1 — Rendre l'app livrable et observable *(mobile, en parallèle du Lot 0)*

> **Objectif business :** qu'un binaire traçable sorte d'une machine qui n'est pas celle du
> développeur, et qu'un crash chez un utilisateur soit visible avant d'être un avis 1 étoile.

> ### ✅ Livré le 07/08/2026 — sauf ce qui exige un compte externe
>
> **Le report est désormais structurellement impossible :** le contexte
> `mobile-build-and-test (20.x)` est déclaré dans `github_ruleset_master.json`, et la CI mobile
> bloque sur **typecheck + lint + tests + expo-doctor**.
>
> **Le lint est bloquant dès l'introduction**, et non toléré comme prévu initialement : la
> première passe sur les 157 fichiers n'a remonté que **2 imports inutilisés**, corrigés dans la
> foulée. Il n'y avait aucune dette à amortir — tolérer les avertissements n'aurait fait qu'en
> laisser s'accumuler.
>
> **Écart assumé sur ESLint :** `eslint-config-expo@8`, la version alignée sur le SDK 52, est une
> config *legacy*. ESLint 9 ne l'accepte plus par défaut. Plutôt que de bricoler une passerelle,
> ESLint est épinglé en **8.57.1** avec un `.eslintrc.js` — la paire réellement supportée. La
> migration en config « flat » se fera avec la montée de SDK, pas avant.
>
> **Vérification :** `npm run typecheck` 0 erreur · `npm run lint` 0 avertissement ·
> `npm run test:ci` 11 suites / 57 tests · `npx expo-doctor` **18/18** · `npx expo config` résout.
> La couverture est désormais mesurée : **10,66 %** des lignes — chiffre attendu, la suite ne
> couvre que la logique pure. C'est le point de départ du Lot 5.
>
> **Non fait, faute d'accès :** `@sentry/react-native` n'est pas installé (pas de compte ni de
> DSN). L'abstraction `src/core/observability` est en place et l'`ErrorBoundary` l'appelle déjà :
> le jour où le DSN existe, **seul ce fichier change**, aucun site d'appel n'est touché. Sans DSN
> l'app fonctionne normalement et les erreurs vont en console. De même, `eas.json` attend un
> `projectId` (produit par `eas init`), et le ruleset doit être **ré-appliqué côté GitHub** —
> action d'administration du dépôt.

| # | Tâche | Détail / fichiers | Effort |
|---|---|---|:--:|
| 1.1 | `mobile/eas.json` — profils `development` / `preview` / `production`, `appVersionSource: "remote"`, `autoIncrement` en production | **créer** `mobile/eas.json` (eas-cli ≥ 21.6.0) | S |
| 1.2 | Workflow CI mobile calqué sur `frontend-ci.yml` : `paths: mobile/**`, **Node 20.x** (eas-cli exige ≥ 20), job nommé **`mobile-build-and-test`** pour ne pas entrer en collision avec le contexte `build-and-test (18.x)` | **créer** `.github/workflows/mobile-ci.yml` | S |
| 1.3 | **Ajouter le contexte `mobile-build-and-test (20.x)` au ruleset de `master`** puis le ré-appliquer côté GitHub — sans cela une CI rouge ne bloque rien | `github_ruleset_master.json` + action d'administration du dépôt | XS |
| 1.4 | ESLint + Prettier commités (`npx expo install --dev eslint eslint-config-expo prettier`) — `npm run lint` casserait aujourd'hui en CI, eslint n'est pas au lockfile | `mobile/eslint.config.js`, `.prettierrc`, `package.json` | S |
| 1.5 | Sentry + plugin Expo + upload des source maps au build | `npx expo install @sentry/react-native`, `app.json` plugins, `app/_layout.tsx` | M |
| 1.6 | `ErrorBoundary` racine + écran de repli traduit (aujourd'hui : écran blanc muet) | **créer** `src/shared/ui/ErrorScreen.tsx`, monter dans `app/_layout.tsx:56-64` | S |
| 1.7 | `script test:ci` (`jest --ci --coverage --maxWorkers=2`) + seuil de couverture | `package.json`, `jest.config.js` | XS |
| 1.8 | Icônes, splash, adaptive-icon (le binaire porte l'icône Expo par défaut ; `mobile/assets/` n'existe pas) | **créer** `mobile/assets/*` par rastérisation de `frontend/public/images/logo.svg` | M |
| 1.9 | Secrets de build documentés et provisionnés : `.env.example` complété, secrets EAS et GitHub (`EXPO_TOKEN`, `SENTRY_AUTH_TOKEN`, clé Maps restreinte package + SHA-1) | `mobile/.env.example`, secrets EAS/GitHub | S |
| 1.10 | Traçabilité du binaire : injecter `commitSha` / `buildNumber` / `channel` et les afficher dans « À propos » | `app.config.js`, `src/core/env.ts`, `src/shared/ui/AboutPanel.tsx:17` | XS |
| 1.11 | **Correctifs XS à ne pas reporter** : `userInterfaceStyle: "light"` (mode sombre déclaré, palette sombre inexistante → texte blanc sur fond blanc dans la barre d'état) ; `timeout` sur l'appel de refresh (`client.ts:36`, `axios.post` nu → l'app peut geler indéfiniment) ; ne plus déconnecter sur erreur transitoire (`client.ts:44-46`, `catch { return null }` transforme un 502 en logout + purge du cache) ; `setTokens` atomique (`tokenService.ts:27-28`, deux écritures non atomiques + rotation serveur = session perdue) | `app.json`, `src/core/api/client.ts`, `src/core/auth/tokenService.ts` | S |
| 1.12 | Trancher et documenter : Continuous Native Generation (aucun commit de `ios/`/`android/`), et aligner le README sur `newArchEnabled: false` (le README affirme l'inverse) | `mobile/README.md` | XS |

**Definition of Done.** Un merge sur `master` déclenche `mobile-build-and-test (20.x)` (typecheck +
lint + tests + expo-doctor), puis produit un **build EAS `preview` installable**. Le numéro de build
et le SHA du commit sont lisibles dans l'écran « À propos ». Un crash provoqué volontairement
(`throw` dans un écran) affiche l'écran de repli **et** remonte dans Sentry.

**Dépendances hors code :** compte Expo/EAS (`projectId`, `EXPO_TOKEN`), organisation Sentry (DSN +
auth token), clé Google Maps de production restreinte.

---

## LOT 2 — Fermer la boucle économique *(dépend de L0 et L1)*

> **Objectif business :** qu'une mission se termine, se paie et se voie. C'est le seul lot qui rend
> la plateforme capable d'encaisser une commission.

> ### ✅ Livré le 07/08/2026
>
> **La boucle est fermée côté mobile.** Trois features créées — `tracking`, `payments`, `wallet` —
> et un écran de suivi adressable `app/(app)/mission/[id].tsx` d'où le client paie, suit, confirme
> la réception et annule.
>
> Décisions prises en cours de route :
>
> - **Le PIN de livraison vient désormais du détail du job**, plus de la réponse d'une mutation. Il
>   survit au rechargement de l'écran ; il disparaissait auparavant au premier refresh.
> - **Avis et litige ne s'affichent plus qu'une fois la mission terminée.** La carte « mes
>   demandes » les proposait dès l'acceptation, et le serveur les refusait — on promettait une
>   action impossible.
> - **Deux chemins de paiement, parce que le backend en expose deux.** Passerelle réelle → ouverture
>   du navigateur et retour par lien profond ; SANDBOX → le backend renvoie notre propre schéma
>   (`transporti://…`), donc aucune page à afficher : on enchaîne sur la vérification et **l'UI dit
>   explicitement qu'aucun paiement réel n'a eu lieu**. Pas de faux « paiement réussi ».
> - **`expo-web-browser` volontairement non ajouté** : ce serait un module natif de plus, donc un
>   nouveau build de développement, pour un chemin non testable tant que la passerelle est un
>   squelette. Le point de bascule est documenté dans `usePayJob.ts`.
> - **Les gains COD sont affichés à part du solde retirable.** Les mélanger ferait croire au
>   transporteur qu'il peut retirer un argent qu'il détient déjà en espèces.
>
> **Vérification :** `typecheck` 0 erreur · `lint` 0 avertissement · **12 suites / 66 tests** (9 de
> plus, sur la résolution des liens profonds — la logique la plus fragile, car la forme de l'URL
> varie selon la plateforme et un lien mal lu laisse un escrow bloqué en INITIATED).
> **Parité i18n FR/AR complète** sur les ~60 clés ajoutées.
>
> **Non couvert :** la DoD prévoyait une démonstration sur appareil physique depuis un build EAS —
> impossible sans compte Expo. Le parcours est vérifié côté serveur par
> `logistics/tests/test_parcours_retour.py` (lot 0), pas encore de bout en bout depuis l'appareil.

| # | Tâche | Fichiers mobile | Effort |
|---|---|---|:--:|
| 2.1 | Écran de suivi de mission adressable — socle de tout ce lot | **créer** `app/(app)/mission/[id].tsx`, `src/features/tracking/api/useJobDetail.ts` | M |
| 2.2 | Chronologie de course + PIN de livraison persistant (lu depuis le détail, plus depuis une réponse de mutation) | `mission/[id].tsx`, `src/features/my-requests/components/MyRequestCard.tsx:33` | S |
| 2.3 | **Confirmation de réception par le client** → libère l'escrow | **créer** `src/features/payments/api/useConfirmCompletion.ts` + CTA dans `mission/[id].tsx` | S |
| 2.4 | Escrow et booking en lecture (transparence des fonds) | `src/features/payments/api/useJobEscrow.ts` | S |
| 2.5 | Paiement digital : `initiate` → WebView → `verify`, avec **bandeau explicite piloté par un flag serveur** tant que `PAYMENT_GATEWAY = SANDBOX` | `src/features/payments/api/{useInitiatePayment,useVerifyPayment}.ts`, `app/payment/callback.tsx` | L |
| 2.6 | Handler de deep link `transporti://payment/callback` — le backend fabrique déjà cette URL (`payments/views.py:75-79`), aucun handler JS n'existe. À monter dans `app/_layout.tsx` (hors des groupes `(app)`/`(auth)`) | **créer** `src/core/deeplink/useDeepLinkRouting.ts` | S |
| 2.7 | **Portefeuille transporteur réel** : `GET wallet/` (solde, historique `ESCROW`/`WITHDRAWAL`, dettes COD) en remplacement des 4 tuiles de KPI | **réécrire** `app/(app)/gains.tsx`, **créer** `src/features/wallet/` | M |
| 2.8 | Demande de retrait (`POST wallet/withdrawals/`, montant ≥ 10 TND + RIB, erreurs 400 traduites) | `src/features/wallet/api/useCreateWithdrawal.ts` | M |
| 2.9 | Afficher le net transporteur : `offer_price_net` et `offer_commission` sont déjà servis par le backend et **jetés par le DTO mobile** | `src/features/missions/api/dto.ts:14-24` | XS |

**Definition of Done — parcours démontré sur un build EAS preview, sur device physique :** un client
réserve un retour, suit la mission, la confirme à la livraison ; l'escrow est libéré ; le
transporteur voit le montant net dans son portefeuille et déclenche une demande de retrait acceptée
par le serveur. Le même parcours est rejoué en COD avec une dette de commission visible.

**Décision business bloquante :** `D17Gateway` lève `NotImplementedError` (`payments/gateway.py:311`)
et le mode `SANDBOX` valide tout paiement. **Aucun encaissement réel n'est possible avant décision
D15/F1 et intégration du prestataire.** Le Lot 2 livre le parcours complet en COD (nominal) et le
digital en sandbox derrière un bandeau explicite.

---

## LOT 3 — Confiance et réversibilité *(dépend de L0)*

> **Objectif business :** la confiance est le premier produit (valeur BO n°2). Aujourd'hui on demande
> à un client de s'engager à l'aveugle, sans possibilité de revenir en arrière.

> ### ✅ Livré le 12/08/2026
>
> **Bonne surprise à l'exécution :** des 8 tâches, deux étaient déjà résolues comme effet de bord du
> Lot 2. **3.2** (annulation client) vit dans `useClientCancel.ts` depuis l'écran de mission ; **3.5**
> (n'afficher avis/litige qu'une fois la mission terminée) est déjà le comportement de
> `mission/[id].tsx:197` (`d.status === 'COMPLETED'`) — la carte « mes demandes » ne propose plus que
> `track`, tout le reste a été déplacé au Lot 2. Les 6 tâches restantes ont été construites cette
> session, chacune contre un endpoint déjà vérifié opérationnel (aucun blocage backend, contrairement
> au Lot 0) :
>
> - **3.1** — `src/features/profiles/` (`useTransporterProfile`, `useTransporterReviews`) +
>   `app/(app)/transporteur/[id].tsx`, lié depuis `TripResultCard` : `owner_id`/`owner_rating`/
>   `owner_review_count`/`owner_verification_status` étaient déjà servis par `return-trips/match/`
>   depuis 0.8 mais absents du DTO mobile (`TripResultDto`), donc jamais affichés ni exploitables.
> - **3.3** — `useTransporterCancel.ts` + `TransporterCancelSheet.tsx` (motif obligatoire, calqué sur
>   `CancelMissionSheet.tsx`), branché sur `MissionCard.tsx` pour les missions `MATCHED`/`IN_PROGRESS`.
> - **3.4** — `useCancelRequest.ts`, bouton retrait dans `MyRequestCard` pour `PENDING`/`COUNTERED`.
> - **3.6** — `useCorridorAlerts` (liste) + `useDeleteCorridorAlert` + `CorridorAlertsPanel.tsx`,
>   ouvert depuis une icône cloche sur l'écran Recherche.
> - **3.7** — `usePasswordResetConfirm.ts` + `ResetPasswordForm.tsx` + `app/(auth)/reset-password.tsx`,
>   routé depuis `useDeepLinkRouting.ts` (le type `reset-password` était déjà reconnu par `resolve.ts`
>   mais jamais routé).
> - **3.8** — `app/(app)/mes-demandes.tsx`, nouvel onglet CLIENT (`FloatingTabBar` : `home` /
>   `mes-demandes` / `messages` / `profile`), extrait de l'accueil où `MyRequestsList` n'avait ni
>   pull-to-refresh ni existence dans la navigation.
>
> **Vérification :** `typecheck` 0 erreur · `lint` 0 avertissement · **12 suites / 66 tests** verts ·
> `expo-doctor` 18/18. Parité i18n FR/AR vérifiée par diff structurel des deux fichiers de locale
> (seul écart : le schéma de pluriel à 6 catégories de l'arabe contre singulier/pluriel du français —
> la convention déjà en usage pour `trips.success`/`search.results_count`).
>
> **Non couvert :** comme pour le Lot 2, la DoD prévoit une démonstration sur build EAS / device
> physique — toujours hors de portée sans compte Expo. Vérification supplémentaire cette fois
> impossible même en aperçu web : `npm run web` casse dès l'écran de recherche sur un import de module
> natif (`react-native-maps`, introduit avant ce lot, sans rapport avec lui).

| # | Tâche | Fichiers | Effort |
|---|---|---|:--:|
| 3.1 | Profil transporteur + avis reçus consultables **avant** d'envoyer la demande (endpoints déjà 200, il manquait `owner_id` côté liste — livré en 0.8) | **créer** `app/(app)/transporteur/[id].tsx`, `src/features/profiles/api/` | M |
| 3.2 | Annulation client après acceptation (`jobs/<id>/client-cancel/`, livré en 0.7) | `src/features/tracking/api/useClientCancel.ts` | S |
| 3.3 | Annulation transporteur (`jobs/<id>/transporter-cancel/`, motif obligatoire) — endpoint opérationnel, jamais appelé | `src/features/missions/api/useTransporterCancel.ts` | S |
| 3.4 | Retrait d'une demande en attente (`trip-requests/<id>/cancel/`) — endpoint opérationnel, jamais appelé | `src/features/my-requests/api/useCancelRequest.ts` | XS |
| 3.5 | Litiges : n'afficher le point d'entrée que lorsqu'il est réellement ouvrable, et le brancher | `src/features/my-requests/components/MyRequestCard.tsx:82-89`, `src/features/disputes/` | S |
| 3.6 | Alertes corridor : liste et suppression (création déjà branchée ; aujourd'hui une alerte est créable et jamais supprimable) | `src/features/search/api/{useCorridorAlerts,useDeleteCorridorAlert}.ts` | S |
| 3.7 | Écran de confirmation de réinitialisation de mot de passe + route deep link `transporti://reset-password` | **créer** `app/(auth)/reset-password.tsx`, `src/features/auth/api/usePasswordResetConfirm.ts` | M |
| 3.8 | Onglet CLIENT dédié au suivi des demandes (la nav client n'a que 4 destinations, le suivi est une section noyée dans l'accueil) | `src/shared/ui/FloatingTabBar.tsx:20-31`, **créer** `app/(app)/mes-demandes.tsx` | S |

**DoD.** Sur build preview : un client consulte la note et les avis d'un transporteur, envoie une
demande, la retire ; sur une autre mission acceptée, il annule et l'événement est tracé côté serveur ;
il ouvre un litige qui apparaît en back-office ; il termine un cycle « mot de passe oublié » depuis
l'e-mail jusqu'à la reconnexion.

---

## LOT 4 — Réactivité : push et routes adressables *(dépend de L1)*

> **Objectif business :** KPI « temps moyen avant premier matching ». Aujourd'hui une demande n'existe
> que si l'utilisateur ouvre l'application.

**Ces deux chantiers ne se séparent pas** : une notification qui n'ouvre pas le bon écran ne sert à
rien, et aucun écran de détail n'est adressable aujourd'hui.

> ### ✅ Livré le 12/08/2026 — sauf ce qui exige un appareil réel ou une décision BO
>
> 7 des 9 tâches sont faites. **4.9 n'a délibérément pas été touchée** : le plan lui-même la pose
> comme un arbitrage à porter au BO (accepter la latence ou provisionner un worker), pas comme un bug
> à corriger en silence — elle reste ouverte, cf. « Blocage structurel » ci-dessous.
>
> - **4.1** — Décision confirmée : **Expo Push**. Aucun code n'y était propre, la recommandation du
>   07/08 est simplement devenue le chemin réellement câblé par 4.2/4.8.
> - **4.2** — `_send_expo()` écrit pour de vrai dans `notifications/push_service.py` : un appel HTTP
>   POST vers `https://exp.host/--/api/v2/push/send` (`requests`, déjà une dépendance backend), sans
>   clé ni compte — c'est précisément ce que 4.1 avait anticipé. `PUSH_NOTIFICATION_MODE`,
>   `MOBILE_APP_SCHEME` et `MOBILE_DEEP_LINK_ENABLED` sont désormais déclarés dans `render.yaml`
>   (absents de tout bloc `envVars` jusqu'ici — vérifié dans le fichier, pas seulement supposé).
>   `MOBILE_DEEP_LINK_ENABLED` passe à `true` : son seul consommateur mobile (3.7) existe maintenant.
>   **`PUSH_NOTIFICATION_MODE` reste `SANDBOX`** : aucun
>   appareil réel n'a pu confirmer une réception, et personne ne surveille encore les tickets d'erreur
>   Expo en production — même logique de prudence que la passerelle de paiement du Lot 2. Un seul flip
>   de variable suffira, aucun redéploiement de code.
> - **4.3 — découverte à l'exécution : ce n'était pas un problème.** `DeviceTokenRegisterSerializer.token`
>   n'a jamais porté de contrainte de format — un token Expo (`ExponentPushToken[...]`) était déjà
>   accepté tel quel. Seuls le `help_text` du serializer et du modèle ont été corrigés pour refléter la
>   réalité (migration `0006_alter_devicetoken_token`).
> - **4.4** — `send_push_notification()` distingue maintenant `sent` (PRODUCTION, réellement remis à
>   Expo) de `logged` (SANDBOX) : la métrique ne peut plus lire « 100 % délivré » quand 0 appareil n'a
>   été contacté.
> - **4.5** — `messages.tsx` et `requests.tsx` (master-détail par `useState`) remplacés par
>   `messages/{_layout,index,[jobId]}.tsx` et `requests/{_layout,index,[jobId]}.tsx`. Aucun
>   renommage d'onglet côté `app/(app)/_layout.tsx` : les deux groupes restent nommés `messages` et
>   `requests`, seule leur pile interne a changé.
> - **4.6** — `FloatingTabBar.go()` émet désormais `tabPress` dans tous les cas (pas seulement au
>   changement d'onglet) : retaper un onglet déjà actif réinitialise sa pile imbriquée à sa racine,
>   comportement standard de react-navigation que cette barre custom court-circuitait.
> - **4.7** — `src/features/notifications/data/notificationRoute.ts` (`resolveNotificationRoute`),
>   **16 tests**. Le rôle de l'utilisateur est un paramètre à part entière : un même `type`
>   (ex. `JOB_COMPLETED`) part vers le client et le transporteur, mais seul le client a un écran de
>   suivi adressable (`mission/[id]`, Lot 2) — le transporteur n'en a pas, la fonction rend `null`
>   plutôt que d'ouvrir un écran qui n'a pas de sens pour son rôle. Branché dans
>   `NotificationBell.tsx` (le tap ouvrait déjà la notification, ne menait nulle part avant).
> - **4.8** — `expo-notifications` installé, plugin déclaré dans `app.json`. Permission, canal Android
>   par défaut, `getExpoPushTokenAsync`, enregistrement (`POST devices/register/`), présentation au
>   premier plan (`setNotificationHandler`), et navigation au tap (listener + `getLastNotificationResponseAsync`
>   pour le cold-start) vivent dans un seul hook, `core/push/usePushNotifications.ts`, monté dans
>   `app/(app)/_layout.tsx`. **Sans `eas.json` `projectId`** (`eas init` jamais lancé dans cet
>   environnement), `getExpoPushTokenAsync` lèverait à coup sûr : repli silencieux identique à celui
>   déjà en place pour le DSN Sentry ou la clé Google Maps — l'app démarre normalement, elle
>   n'enregistre simplement aucun token.
>
> **Vérification :** backend — **210 tests** (6 nouveaux sur `_send_expo`/le mode SANDBOX-vs-PRODUCTION),
> `makemigrations --check` propre. Mobile — `typecheck` 0 erreur · `lint` 0 avertissement ·
> **13 suites / 82 tests** (16 nouveaux sur la table de routage) · `expo-doctor` 18/18 ·
> `npx expo config` résout avec le plugin `expo-notifications`.
>
> **Non couvert :** la DoD ci-dessous demande une notification reçue « application fermée » sur un
> appareil réel — structurellement impossible à vérifier sans compte Expo/EAS. Le code est écrit et
> testé unitairement (résolution de route, appel HTTP, gestion d'erreur de ticket) ; il n'a pas été
> vérifié de bout en bout par un push réellement livré.

| # | Tâche | Détail | Effort |
|---|---|---|:--:|
| 4.1 | **Décision de provider push** — prérequis absolu, aucun code avant | Recommandation : **Expo Push** (`_send_expo()` dans `notifications/push_service.py`, aucun `google-services.json`, aucun `firebase-admin` à ajouter). L'alternative FCM impose un fichier natif dans un projet en CNG | — |
| 4.2 | Implémenter le transport push + basculer `PUSH_NOTIFICATION_MODE` hors SANDBOX, **et le déclarer dans `render.yaml`** (absent de tout bloc `envVars` : sans cela le déploiement reste en sandbox) | `notifications/push_service.py:156`, `render.yaml` | M |
| 4.3 | Élargir le contrat `devices/register/` aux tokens Expo (le serializer n'accepte que `ANDROID\|IOS` / FCM-APNS) | `notifications/serializers.py:70-73` | S |
| 4.4 | Cesser de compter `sent` en sandbox (métrique de délivrabilité fausse à 100 %) | `notifications/push_service.py:85-87` | XS |
| 4.5 | Migration des routes : `messages.tsx` et `requests.tsx` sont du master-détail par `useState`, sans URL. Cible : `messages/_layout.tsx` + `index.tsx` + `[jobId].tsx`, idem `requests/` | ~1 à 2 jours, 1 commit par écran, aucun renommage d'onglet requis | M |
| 4.6 | Retour matériel Android : résolu structurellement par 4.5, + ~5 lignes dans `FloatingTabBar.tsx:49-61` pour revenir à la liste quand l'onglet est déjà actif | `src/shared/ui/FloatingTabBar.tsx` | XS |
| 4.7 | Figer la convention `type + metadata → route` (le `metadata` est aujourd'hui un JSON libre, hétérogène selon l'émetteur) sous forme de fonction pure testable | **créer** `src/features/notifications/data/notificationRoute.ts` + tests | S |
| 4.8 | `expo-notifications` : permission, enregistrement du token, réception premier plan / arrière-plan, navigation au tap | `npx expo install expo-notifications`, `app.json` plugins, `src/features/notifications/` | M |
| 4.9 | Émission asynchrone : les 30+ points d'appel de `notify()` envoient le push **dans le cycle HTTP** ; `notify_corridor_alerts` boucle sur N clients → N appels HTTP synchrones dans une requête de publication | `notifications/services.py:23-71` — a minima découpler, sinon prévoir un worker | M |

**DoD.** Application fermée, un client reçoit une notification à l'acceptation de sa demande ; le tap
ouvre directement `mission/<id>` ; le bouton retour Android revient à la liste. Un test unitaire
couvre la table `type → route`.

**Blocage structurel :** aucun worker asynchrone n'existe (0 occurrence de `celery` dans le dépôt).
La tâche 4.9 est un arbitrage à porter au BO : soit on accepte la latence ajoutée aux requêtes, soit
on provisionne un worker.

---

## LOT 5 — Tenir dans le temps *(peut démarrer avec L3)*

> **Objectif business :** l'app est correcte au jour 1 et se dégrade silencieusement dès que les
> volumes montent. Ce lot contient **un bug fonctionnel déjà présent**, pas seulement de la
> prévention.

| # | Tâche | Détail | Effort |
|---|---|---|:--:|
| 5.1 | ✅ **Corrigé le 12/08/2026.** Bug actif : trois hooks filtraient côté client la même page de 20 de `jobs/transporter/`. Un transporteur ayant 25 missions dont les 20 plus récentes sont terminées voyait **« aucune mission active »** et son retour publié disparaissait | `useMyMissions.ts`, `useCompletedMissions.ts`, `useMyReturnTrips.ts` — recâblés sur `?type=assigned`/`?type=owned` (livré en 0.9) | M |
| 5.2 | Pagination : 8 hooks de liste plafonnés à 20 (`PAGE_SIZE = 20`, `next` jamais lu, 0 `useInfiniteQuery`, 0 `onEndReached`) — notifications, missions, missions terminées, demandes reçues, mes demandes, conversations, avis, litiges | migration en `useInfiniteQuery` | L |
| 5.3 | Rendre visibles les troncatures serveur non contournables : recherche de retours plafonnée à **10** (`corridors.py:34`), messages à **100** (`messaging/views.py:135`) | bandeau « affinez votre recherche » plutôt qu'une liste silencieusement coupée | S |
| 5.4 | `focusManager` sur `AppState` — en React Native l'événement `visibilitychange` n'existe pas, donc React Query se croit **toujours** au premier plan et les 3 sondages tournent en arrière-plan | ~12 lignes dans `app/_layout.tsx` | S |
| 5.5 | `onlineManager` + `@react-native-community/netinfo` + bandeau hors ligne — React Query se croit **toujours** en ligne, les requêtes partent dans le vide et le cache MMKV s'affiche sans indiquer qu'il est périmé | `app/_layout.tsx`, `src/shared/ui/OfflineBanner.tsx` | S |
| 5.6 | Vérifier l'expiration du token avant envoi (aujourd'hui, la première action après 30 min d'inactivité coûte systématiquement un 401 inutile) | `src/core/api/client.ts:18-26` | S |
| 5.7 | Tests du fichier le plus cher à casser : `client.ts` (refresh, anti-stampede, comportement sur 502, logout) — **aucun test aujourd'hui** | **créer** `src/core/api/client.test.ts` + `axios-mock-adapter` | M |
| 5.8 | Tests des gardes de navigation et de la logique de rôle (une régression y est déjà survenue — commit `d3bb922`) | `app/__tests__/authRouting.test.tsx`, `FloatingTabBar.test.tsx` | M |
| 5.9 | Outillage de test de composants : `react-test-renderer` **n'est même pas installé**, donc aucun test d'écran n'est exécutable aujourd'hui | `@testing-library/react-native` + peer deps | S |
| 5.10 | Repli `localStorage` sur web pour les JWT (cible web construite : `web.output: static`, `npm run web`) — soit chiffrer/renoncer, soit retirer la cible web du périmètre | `src/core/auth/tokenService.ts:10-24` | S |

---

## LOT 6 — Publier

> **Objectif business :** franchir la revue des stores. Aucun de ces éléments n'existe aujourd'hui.

| # | Tâche | Détail | Effort |
|---|---|---|:--:|
| 6.1 | **Suppression de compte in-app** (exigence Google Play 2024 / Apple 2022) — côté backend : aucune route n'existe, et une suppression dure est **impossible** (FK en `PROTECT` sur `TransportJob.owner`, `Offer.transporter`, modèles de paiement). Solution : `anonymize_account(user, password)` refusant l'opération s'il reste des transactions en cours, exposé sous `/api/v1/` | **créer** `backend/users/services_account_deletion.py` + route ; `src/features/auth/api/useDeleteAccount.ts` | L |
| 6.2 | Révocation des sessions à la suppression : `ROTATE_REFRESH_TOKENS` et `BLACKLIST_AFTER_ROTATION` sont à `True` mais l'app `token_blacklist` n'est pas installée | `transporti_core/settings.py:373-374` | S |
| 6.3 | Politique de confidentialité et CGU **publiquement accessibles** : les pages existent mais sont des stubs **derrière `AuthGuard`** — un relecteur de store ne peut pas les ouvrir | déplacer vers `frontend/app/(public)/` + rédiger le contenu réel | M |
| 6.4 | `privacyManifests` iOS + formulaires Data Safety | `mobile/app.json` bloc `ios` | S |
| 6.5 | `testID` systématiques — **0 dans les 157 fichiers**, ce qui interdit purement et simplement l'E2E | `src/shared/ui/*` d'abord | M |
| 6.6 | Parcours E2E Maestro : login → publication → demande → acceptation → complétion (nécessite un backend de recette avec jeu de données seedé et comptes stables — **aucun script de seed n'existe**) | `mobile/.maestro/` + seed backend | L |
| 6.7 | Accessibilité : 3 `accessibilityLabel` pour 46 `Pressable`, 0 `accessibilityHint`, 0 `allowFontScaling`. Commencer par `TextField.tsx` (utilisé 29 fois, sans aucune propriété d'accessibilité) | `src/shared/ui/TextField.tsx`, boutons à icône seule | M |
| 6.8 | Projet iOS + passage sur appareil réel (en CNG, via EAS) | — | M |
| 6.9 | Mettre le `README.md` à jour (il annonce « Sprint S0, aucun parcours métier branché » et un fonctionnement sous Expo Go, impossible avec MMKV et react-native-maps) | `mobile/README.md` | XS |

---

## 4. Dépendances hors du code mobile

| Type | Élément | Bloque |
|---|---|---|
| **Décision business** | Prestataire de paiement (D15/F1) — `D17Gateway` lève `NotImplementedError` | Tout encaissement réel (Lot 2 livre le COD + le sandbox) |
| **Décision business** | Politique d'annulation (fenêtre, frais, remboursement) | Tâche 0.7 |
| **Décision produit** | Ouvre-t-on le canal **classique** (demande client + offres) au mobile ? Il fonctionne déjà de bout en bout côté serveur | Périmètre, à ne **pas** mener dans le même sprint que le Lot 0 |
| **Décision technique** | Provider push : Expo Push (recommandé) vs FCM | Lot 4 entier |
| **Infra** | SMTP / `SENDGRID_API_KEY`, `EMAIL_BACKEND` ≠ console | 0.11, 3.7 |
| **Infra** | Worker asynchrone (0 occurrence de `celery`) | 4.9, fiabilité des notifications de masse |
| **Infra** | `PUSH_NOTIFICATION_MODE` à déclarer dans `render.yaml` | 4.2 |
| **Comptes** | Expo/EAS (`projectId`, `EXPO_TOKEN`), Sentry (DSN + auth token), clé Maps de production restreinte | Lot 1 |
| **Administration dépôt** | Ré-appliquer le ruleset `master` avec le contexte mobile | 1.3, et donc le caractère non contournable de tout le plan |

---

## 5. Ce que nous ne faisons pas, et pourquoi

Application des principes produit du BO (vision §11 : si une fonctionnalité ne sert aucun des six
critères, elle ne doit pas être développée).

| Écarté | Justification |
|---|---|
| **Chat temps réel WebSocket** | Aucun canal WS fonctionnel côté backend. Le polling suffit au MVP ; le vrai gain de réactivité est le push (Lot 4), pas le WS |
| **File de rejeu hors ligne** | Source de bugs de cohérence. Le Lot 5 livre la détection + le message clair, qui couvre 90 % de la valeur pour 10 % du risque |
| **Connexion sociale Google/Facebook** | N'améliore aucun des six critères ; le frein à l'inscription n'est pas documenté comme un problème observé |
| **Transporteurs favoris** | Contredit le principe n°1 : la valeur vient du matching sur corridor, pas de la fidélisation à un transporteur donné |
| **Thème sombre complet** | Coût réel (palette + audit de contraste de 24 composants) pour zéro effet sur les KPI. On force `light` (1.11) |
| **Espace admin / modération mobile** | Reste sur le web, conformément au plan MVP §2.2 |
| **Canal classique (demande + offres) sur mobile** | À arbitrer **après** le Lot 0. Le mener en parallèle diluerait l'effort sur le pivot, qui est le principe n°1 |

---

## 6. Traçabilité — chaque lot sert un KPI

| Lot | KPI / promesse BO servi |
|---|---|
| **L0** | Taux de matching, conversion mission → paiement (aujourd'hui structurellement à 0 sur le canal retour) |
| **L1** | Aucun KPI direct — condition d'existence de tous les autres. C'est aussi le seul lot qui rend les KPI **mesurables** (Sentry, traçabilité des builds) |
| **L2** | Revenu moyen par mission, commission moyenne, conversion mission → paiement, **North Star** (une mission n'est comptée que si elle se clôt) |
| **L3** | NPS client, taux de litiges, taux d'annulation (aujourd'hui non mesurable : on ne peut pas annuler), confiance |
| **L4** | **Temps moyen avant premier matching**, taux de remplissage des retours |
| **L5** | Satisfaction transporteur (bug 5.1 = missions invisibles), rétention, coût data/batterie |
| **L6** | Condition d'accès au marché — sans lui, aucun KPI n'existe en production |

---

## 7. Risques

| # | Risque | Sév. | Mitigation |
|---|---|:--:|---|
| R1 | Le Lot 0 est du backend : si l'équipe backend n'est pas alignée, tout le plan glisse | **P0** | Lot 0 court et cadré (11 tâches, majorité S/XS) ; DoD = un test d'intégration qui entre en CI |
| R2 | Le Lot 1 est à nouveau repoussé « parce qu'il ne se voit pas » | **P0** | Le ruleset (1.3) le rend structurellement non contournable, et les DoD suivantes exigent un build EAS |
| R3 | Pas de prestataire de paiement → le digital reste en sandbox | **P0** | Le COD est le chemin nominal ; le digital est livré derrière un bandeau explicite piloté par un flag serveur |
| R4 | Migration de routes (4.5) sous-estimée | P1 | Chiffrée par mesure : 2 fichiers supprimés, 6 créés, aucun renommage d'onglet. 1 commit par écran, `messages/` en premier pour valider le motif |
| R5 | Nouveaux écrans livrés sans i18n ni RTL | P1 | Toute PR ajoutant un écran doit ajouter les clés **fr et ar** (343/351 aujourd'hui) — règle de revue, vérifiable par lint |
| R6 | Push synchrone dans le cycle HTTP dégrade les temps de réponse | P1 | Arbitrage explicite en 4.9 ; à défaut de worker, limiter aux notifications unitaires |
| R7 | E2E impossible sans jeu de données de recette | P2 | Seed backend traité en 6.6, pas plus tôt |
| R8 | Suppression de compte impossible en dur (FK `PROTECT`) | P2 | Anonymisation plutôt que suppression, refus si transactions en cours |

---

## 8. Ordre d'exécution recommandé

1. **Maintenant, en parallèle** : Lot 0 (backend, débloquer le canal retour) **et** Lot 1 (mobile,
   rendre l'app livrable). Ils n'entrent pas en conflit et conditionnent tout le reste.
2. **Dès que le Lot 0 est vert** : Lot 2 — fermer la boucle économique. C'est le premier moment où
   Transporti peut encaisser une commission.
3. **Ensuite** : Lot 3 (confiance et réversibilité), qui peut chevaucher le Lot 5 (tenue dans le
   temps) puisque l'un est fonctionnel et l'autre technique.
4. **Puis** : Lot 4 — push et routes adressables, une fois qu'un dev build EAS existe (sans lui, le
   push n'est pas testable).
5. **Enfin** : Lot 6 — publication.

**Volume indicatif** : 6 lots, pour une équipe de 1 à 2 développeurs mobile **plus** une contribution
backend non négligeable sur les Lots 0, 4 et 6. Les tailles d'effort par tâche (XS→XL) sont données ;
une conversion en jours-homme n'a pas été faite faute de mesure de vélocité réelle de l'équipe.

---

## Annexe A — Corrections apportées à l'audit du 03/08/2026

| Affirmation de l'audit | Réalité vérifiée au 07/08 |
|---|---|
| « 6 suites / 22 tests » | **11 suites / 57 tests**, tous verts |
| « la purge du cache au logout n'est pas testée » | **Couverte** — `src/core/auth/authStore.test.ts:31-45` |
| « `auth/password-reset/` est appelé (l'e-mail part) » | **L'e-mail ne part pas** : `users/views.py:424-441` se contente d'un `logger.info`, `EMAIL_BACKEND` = console |
| « la boucle économique n'est pas fermée côté mobile » | Exact, **mais la cause est plus profonde** : elle est aussi cassée côté backend sur le canal retour (403/404), et le COD ne génère aucune commission |
| « 3 accessibilityLabel, 32 accessibilityRole » | 3 `accessibilityLabel`, **34** `accessibilityRole`, 0 `accessibilityHint`, 0 `testID`, 0 `allowFontScaling` |
| Non mentionné | `jobs/transporter/` mélange deux natures d'objets → **bug fonctionnel actif** (missions invisibles), cf. 5.1 |
| Non mentionné | `create_notification()` n'existe pas : 3 événements n'émettent ni notification ni push, `ImportError` avalé |
| Non mentionné | `auto_release_escrow` contourne le garde-fou litige : risque de libérer un séquestre dû au client |

## Annexe B — Réserves

1. **Vérification.** Les constats backend proviennent de sondes d'exécution réelles (client et
   transporteur authentifiés, parcours joués sur une base de développement), les constats mobile de
   commandes exécutées (`tsc`, `jest`, `expo config`, `grep` comptés). Les preuves `fichier:ligne`
   figurent dans chaque tâche.
2. **Vérification factuelle faite ; contre-expertise du séquencement non faite.** Une passe de
   contrôle a été menée le 07/08 sur les affirmations les plus coûteuses si elles étaient fausses —
   résultat en **annexe C**, aucune correction n'a été nécessaire. En revanche, le plan n'a **pas**
   été soumis à un relecteur contradictoire sur l'**ordre des lots** ni sur les **tailles
   d'effort** : ces deux dimensions restent des jugements non contre-vérifiés.
3. **Efforts.** Exprimés en tailles (XS→XL), pas en jours. Seule la migration de routes (4.5) porte
   une estimation en jours, issue d'une mesure de périmètre.
4. **Restriction de la clé Google Maps** (package + SHA-1) : à confirmer dans la console Google
   Cloud, non vérifiable depuis le dépôt.

## Annexe C — Passe de vérification du 07/08/2026

Contrôle des affirmations sur lesquelles repose le séquencement. **Aucune n'a été infirmée.**

| Affirmation vérifiée | Résultat |
|---|---|
| `_is_job_participant` ignore le client du canal retour (messagerie) | ✅ `messaging/services.py` — owner **ou** transporteur d'offre `ACCEPTED`, rien d'autre |
| Idem litiges | ✅ `support/services.py` — code dupliqué à l'identique |
| Idem avis | ✅ `reviews/serializers.py` — `else: "You are not a participant in this job."` |
| `JobDetailView` refuse le client après acceptation | ✅ `logistics/views/jobs.py:181` — CLIENT accepté seulement si `owner` **ou** `status == PUBLISHED` ; après acceptation le job est `MATCHED` |
| `complete/` exige le PIN dès qu'un `Booking` existe | ✅ `logistics/views/jobs.py:552` — `code: PIN_REQUIRED` |
| `create_commission_debt_on_cod` n'a aucun appelant | ✅ une seule occurrence dans tout `backend/` : sa définition (`payments/services.py:572`) |
| Les 5 vues de paiement excluent le client du canal retour | ✅ `payments/views.py:37` et `:270` (`owner=request.user`), `:184` (`job.owner != request.user`), `:313` et `:346` (`is_owner = job.owner == request.user`) |
| `jobs/transporter/` mélange deux natures d'objets sans filtre | ✅ `logistics/views/jobs.py:63-75` — `assigned | return_trips`, aucun paramètre de requête |
| Push impossible | ✅ `settings.py:434` (`SANDBOX` par défaut) + `push_service.py:156` (`NotImplementedError`) |
| Passerelle de paiement inopérante | ✅ `payments/gateway.py` — `init_payment`, `check_status`, `refund` lèvent toutes `NotImplementedError` |
| Aucun e-mail de réinitialisation | ✅ **0** occurrence de `send_mail` / `send_transactional_email` dans `users/views.py` |
| Ruleset aveugle au CI mobile | ✅ `github_ruleset_master.json` ne liste que `build-and-test (18.x)` et `build-and-test (3.11)` |
| Recherche de retours tronquée à 10 | ✅ `logistics/views/corridors.py:34` et `:91` |
| Socle mobile vert | ✅ `npx tsc --noEmit` → 0 erreur ; `npx jest` → **11 suites / 57 tests** |
| Industrialisation absente | ✅ 0 `testID`, 3 `accessibilityLabel` pour 34 `accessibilityRole`, 0 `ErrorBoundary`, pas de `mobile/assets/`, ni `versionCode` ni `buildNumber`, ni `expo-notifications` ni `netinfo` ni `react-test-renderer` au `package.json` |
| Mode sombre déclaré sans palette | ✅ `app.json:8` `"userInterfaceStyle": "automatic"` (et `newArchEnabled: false` en `:9`, contrairement au README) |
