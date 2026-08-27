# AUDIT APPLICATION WEB — DESIGN, UX/UI & COUVERTURE DES USER STORIES

**Date** : 26/08/2026 · **Périmètre** : `frontend/` (Next.js 14 App Router) · **Version** : Transporti V1

---

## 0. Méthode et limites

**Méthode** : lecture du graphe de connaissances Graphify (`graphify-out/`, construit le 25/08/2026 — à jour : dernier commit `f809ae2` du 25/08 et arbre de travail propre), puis lectures ciblées `file:line` sur les nœuds retournés. Aucune lecture de fichier complet.

**Référentiel de besoins** utilisé comme source de vérité :
- `docs/VISION_PRODUIT_FONDATRICE.md` — personas, proposition de valeur, North Star Metric
- `docs/PIVOT_STRATEGIQUE_TRAJETS_RETOUR_2026-07-14.md` §5 (parcours) et §6 (priorisation)
- Surface API réelle : `backend/*/urls.py`

**Limite déclarée** : **Context7 n'est pas disponible dans cette session** (aucun outil `resolve-library-id` / `get-library-docs`). Conformément au `CLAUDE.md` §1, je le signale explicitement : les constats portant sur les conventions Next.js 14 / Tailwind reposent sur le code du projet, non sur une vérification contre la documentation officielle courante. Les recommandations touchant l'App Router doivent être revalidées avec Context7 avant implémentation.

**Chiffres de base mesurés**

| Mesure | Valeur |
|---|---|
| Routes (`page.tsx`) | 45 (10 admin, 22 app, 5 auth, 1 marketing, divers) |
| Lignes dans `app/` | 19 071 |
| Lignes dans `components/` | 12 994 |
| Composants | 128 fichiers `.tsx` |
| Pages avec appel réseau inline | 28 |
| Locales | 2 (`fr.ts` 1 770 clés, `ar.ts` 1 767 clés) |

---

## 1. Couverture fonctionnelle — besoins vs application web

Classes reprises du pivot §6 : **Core** = sans elle le pivot n'existe pas · **High** = requise avant ouverture large · **Secondary** · **Future**.

| Besoin (source) | Classe | État web | Preuve |
|---|---|---|---|
| Rails financiers : portefeuille, escrow, verrou paiement vers exécution | Core | **Couvert** | `app/(app)/wallet/page.tsx`, `components/booking/EscrowBadge.tsx`, `/api/wallet/`, `/api/payments/initiate`, `verify`, `confirm-completion` |
| Cycle de vie trajets retour (publication, édition, écran owner) | Core | **Couvert** | `app/(app)/jobs/return-trip/page.tsx` (562 l.), `components/return-trips/TripRequestsPanel.tsx` |
| Demande structurée D5 (remplace la réservation auto-acceptée) | Core | **Couvert** | `/api/trip-requests/`, `respond/`, `accept-counter/` consommés dans `app/(app)/jobs/[id]/page.tsx` |
| Notifications entrantes (demande reçue / acceptée / message) | Core | **Couvert** | `contexts/NotificationContext.tsx`, `components/notifications/NotificationBell.tsx`, `app/(app)/notifications/page.tsx` |
| Funnel client inversé (recherche d'abord, repli pré-rempli) | Core | **Couvert** | `components/navigation/AppSidebar.tsx:54-66` (drapeau `RETURN_TRIPS_FIRST` place « Trouver un trajet » en premier) ; repli `app/(app)/jobs/return-trips/page.tsx:418-430` |
| Matching v1 (gouvernorats + fenêtre de date) | High | **Couvert** | `/api/return-trips/match/` appelé ; libellés exposés côté UI (`matchBannerTitle`, `matchBannerCta`, `reverseMatchTitle` dans `lib/i18n/locales/fr.ts:1017-1021,1724-1727`) |
| Landing + navigation repositionnées | High | **Couvert** | `app/(marketing)/page.tsx`, `app/page.tsx` (565 l.) |
| Capacité structurée + lien véhicule profil | High | **Couvert** | `components/profile/VehicleGallery.tsx`, `components/jobs/TransportDetailsForm.tsx` |
| Alertes corridor client + matching inversé | High | **Couvert** | `app/(app)/jobs/return-trips/page.tsx:79,94,106` vers `/api/corridor-alerts/` |
| KPI pivot (remplissage, corridors, économie) + dashboards | High | **Partiel** | `app/(admin)/admin/dashboard/page.tsx` traite le corridor ; mais `/api/metrics/dashboard/` **jamais appelé** par le web |
| Étapes de mission + preuve de livraison | Secondary | **Couvert** | `components/jobs/MissionStepper.tsx`, `components/jobs/PostDeliveryPanel.tsx`, `/api/jobs/:id/events/` |
| Gestion documents / vérification enrichie | Secondary | **Couvert** | `app/(app)/verification/page.tsx`, `components/trust/VerificationUpload.tsx`, `components/admin/DocumentReviewDrawer.tsx` |
| i18n AR complète | Secondary | **Couvert** | 1 767 clés + direction RTL réellement implémentée — voir §3.2 |
| Dark mode | Secondary | **Écart P0** — bouton exposé, thème non implémenté | voir §3.1 |
| Pièces jointes chat | Secondary | **Non couvert** | aucun uploader dans `components/messaging/` |
| Trajets récurrents | Future | Non couvert (conforme) | 0 occurrence de `recurr` |
| Contre-offres flux classique | Future | **Backend livré, web absent** | `/api/offers/:id/counter/` et `/api/counter-offers/:id/respond/` : 0 appel web |
| Favoris / fidélisation clientèle | non priorisé | **Backend livré, web absent** | `/api/favorites/`, `/api/favorites/toggle/` : 0 appel web |

### 1.1 Endpoints livrés au backend mais non exposés dans le web

| Endpoint | Impact produit |
|---|---|
| `favorites/`, `favorites/toggle/` | Le besoin persona transporteur « **fidéliser sa clientèle** » (Vision §8) n'a aucune matérialisation UI |
| `metrics/dashboard/` | Les KPI pivot ne sont pas tous instrumentés à l'écran ; pilotage du pilote corridor A1 dégradé |
| `offers/:id/counter/`, `counter-offers/:id/respond/` | Négociation impossible sur le flux classique alors que le backend la supporte |
| `reviews/my/` | Pas d'écran « mes avis » ; la réputation numérique promise (Vision §7) n'est visible que sur le profil public |
| `jobs/:id/client-cancel/` | Le web appelle le `cancel/` générique (`app/(app)/jobs/[id]/page.tsx:410`) ; l'annulation client dédiée, avec ses règles propres, n'est pas câblée — asymétrie avec `transporter-cancel/` qui l'est |

---

## 2. Design system — état et écarts

**Actifs existants** : `design-system/` (6 maquettes HTML : fondations, dashboard transporteur, publier, recherche client, repli client, composants), `frontend/tailwind.config.ts` (tokens), `frontend/app/globals.css` (variables CSS).

**Palette** (`tailwind.config.ts`) : `brand` (bleu royal, 500 = `#2563B3`, 600 = `#1E3A8A`), `primary` (bleu), `accent` (vert `#10b981`), `cta` (orange `#f97316`), `neutral` (gris).

### Écarts

| # | Écart | Gravité | Preuve |
|---|---|---|---|
| D1 | **Deux échelles de bleu concurrentes** — `brand.*` et `primary.*` coexistent avec des valeurs proches mais différentes (`brand.600` `#1E3A8A` vs `primary.800` `#1e3a8a` ; `brand.500` `#2563B3` vs `primary.600` `#2563eb`). Rien dans le code ne définit laquelle est canonique. | P1 | `tailwind.config.ts:17-41` |
| D2 | **Tokens non branchés** — `globals.css` définit `--color-neutral-*`, `--color-brand*`, `--shadow-*`, mais `tailwind.config.ts` ne contient **aucun** `var(--…)` (0 occurrence). Les deux systèmes de tokens sont parallèles et désynchronisables ; c'est la cause racine de D3 et de §3.1. | **P0** | `tailwind.config.ts` (0 hit `var(--`) vs `app/globals.css:19-27,120-150` |
| D3 | **Maquettes non contraignantes** — `design-system/*.html` sont des fichiers statiques sans lien de build ni test de conformité ; aucune garantie que l'implémentation n'ait pas dérivé. | P2 | absence de script de vérification dans `frontend/scripts/` |
| D4 | **Deux systèmes de composants pour la même fonction** — `components/ui/{Pagination,StatusBadge}` et `components/admin/{Pagination,StatusBadge,StatCard}`, plus `components/dashboard/StatCard`. Trois `StatCard` distincts. | P1 | arborescence `components/` |

---

## 3. UX/UI — écarts

### 3.1 Dark mode : commande exposée, thème inexistant hors admin — P0

Chaîne de faits vérifiés :

1. `components/ui/ThemeToggle.tsx` est monté dans `components/navigation/AppSidebar.tsx:113`, donc visible par **tous** les utilisateurs client et transporteur.
2. Ce composant applique la classe `dark` sur `<html>` et, **en l'absence de préférence stockée, suit `prefers-color-scheme`** (`ThemeToggle.tsx:26-30`). Un utilisateur dont l'OS est en sombre reçoit donc la classe `dark` **sans jamais avoir cliqué**.
3. `.dark` dans `globals.css:120-150` inverse les variables `--color-neutral-*`. Mais les utilitaires Tailwind `bg-neutral-50`, `text-neutral-900` et consorts compilent vers les **hex littéraux** de `tailwind.config.ts` (écart D2) et **ignorent ces variables**.
4. Couverture réelle de `dark:` : `app/(admin)` 10 fichiers, `app/(app)` **0 fichier**, `app/(marketing)` **0 fichier**. Côté `components/`, seuls 10 fichiers sur 128 sont dark-aware — dont `AppSidebar.tsx` et `ui/Pagination.tsx`.

**Conséquence** : sur l'app métier, activer le sombre — ou simplement avoir un OS en sombre — produit une **sidebar sombre juxtaposée à un contenu resté clair**, avec les bordures forcées à `border-neutral-700` par `.dark *` (`globals.css:153`) sur fond clair. C'est un état visuel dégradé atteignable sans action utilisateur.

**Correction** : soit retirer `ThemeToggle` de `AppSidebar` et le confiner à l'admin (coût faible, honnête), soit brancher les couleurs Tailwind sur les variables CSS (`neutral: { 50: "var(--color-neutral-50)", … }`) puis auditer les 128 composants. Décision produit requise.

### 3.2 i18n arabe et RTL — conforme

> **Correction du 26/08, même jour.** Une première passe de cet audit concluait à une absence totale de RTL. Ce constat était faux : il reposait sur un motif de recherche mal échappé (`\|` interprété comme un pipe littéral en mode `-E`), qui retournait zéro résultat sur un code qui en contient 104. La conclusion ci-dessous remplace la précédente.

`lib/i18n/locales/ar.ts` compte 1 767 clés (parité quasi totale avec `fr.ts`, 1 770), et le RTL est implémenté proprement :

| Élément | État | Preuve |
|---|---|---|
| `dir` posé avant le premier paint (pas de FOUC) | ✅ | script inline `LOCALE_INIT_SCRIPT`, `app/layout.tsx:51` |
| `dir` synchronisé à chaque changement de locale | ✅ | `lib/i18n/useAppI18n.tsx:95` |
| `dir` / `isRTL` exposés au contexte React | ✅ | `useAppI18n.tsx:115-119` |
| Police arabe dédiée (Cairo) sur `dir="rtl"` | ✅ | `app/globals.css:529-531`, import `next/font/google` |
| Bloc CSS RTL dédié | ✅ | 58 lignes à partir de `globals.css:525` |
| Propriétés logiques au lieu de directionnelles | ✅ | **76** `ms-*`/`me-*`, **47** `ps-*`/`pe-*`, et **0** `ml-*`/`mr-*`/`pl-*`/`pr-*` sur `app/` + `components/` |
| Couverture | 39 fichiers touchés par le RTL | — |

Le zéro absolu sur les utilitaires directionnels est le signal le plus fort : la migration vers les propriétés logiques a été menée jusqu'au bout, sans reliquat.

**Reste à vérifier** (non mesurable par recherche statique, à passer en recette visuelle en arabe) : miroir des icônes directionnelles (chevrons, flèches de progression), rendu des graphiques `recharts` et de la carte Leaflet en RTL, et application du RTL aux **écrans à créer** listés dans la cartographie.

### 3.3 Accessibilité sous le seuil — P1

| Signal | Mesure | Lecture |
|---|---|---|
| `aria-*` | 33 hits / 15 fichiers sur 128 | très faible pour 45 écrans, dont de nombreux tableaux admin et modales |
| `htmlFor` | 13 hits / 5 fichiers | la majorité des champs de formulaire n'a **pas** de label lié — impact direct sur `jobs/new` (701 l.), `settings` (706 l.), les formulaires d'offre et de litige |
| `role=` | 12 hits / 10 fichiers | modales et dialogues probablement sans `role="dialog"` ni gestion systématique du focus |
| lien d'évitement / `sr-only` | 1 hit | pas de « aller au contenu » ; navigation clavier coûteuse avec sidebar + header |
| `alt=` | 11 hits / 9 fichiers | à recouper avec `VehicleGallery` et les photos de marchandise (`PhotoUploader`) |
| `focus-visible` / `focus:ring` | 209 hits / 39 fichiers | **point fort** : la visibilité du focus est correctement traitée |

### 3.4 États de chargement et d'erreur incohérents — P1

`components/ui/LoadingState.tsx` et `components/ui/Skeleton.tsx` existent mais ne sont utilisés que dans **3 pages chacun**, sur environ 34 pages applicatives. `showToast` est utilisé dans 15 fichiers. Il n'y a donc pas de traitement uniforme du chargement, du vide et de l'erreur — chaque écran improvise. Sur un produit dont la promesse est « trouvez un transporteur en quelques minutes », la latence perçue est un enjeu de conversion direct.

Point positif : l'écran de repli du funnel (`return-trips/page.tsx:418-430`) traite explicitement le vide avec deux actions — c'est le bon modèle à généraliser.

### 3.5 Architecture des pages contraire au CLAUDE.md §4 — P1

Le `CLAUDE.md` du projet impose : une page **compose**, la logique vit dans `lib/`, et un fichier approchant 150 à 200 lignes doit être scindé.

| Fichier | Lignes |
|---|---|
| `app/(app)/jobs/[id]/page.tsx` | **1 470** |
| `app/(admin)/admin/users/page.tsx` | **1 249** |
| `app/(admin)/admin/verifications/page.tsx` | 793 |
| `app/(app)/jobs/page.tsx` | 763 |
| `app/(admin)/admin/disputes/page.tsx` | 740 |
| `app/(admin)/admin/jobs/page.tsx` | 724 |
| `app/(app)/settings/page.tsx` | 706 |
| `app/(app)/jobs/new/page.tsx` | 701 |

De plus, **28 fichiers de `app/`** appellent `apiClient` ou `fetch` directement, alors que `lib/services/` ne couvre que 4 domaines (`admin`, `dashboard`, `jobs`, `notifications`). Les domaines wallet, litiges, trust, avis, messagerie et trip-requests n'ont **pas** de couche service.

**Impact UX indirect** : `jobs/[id]/page.tsx` porte à lui seul le détail mission, la demande structurée, l'annulation transporteur, la contre-offre, le démarrage et la complétion. Toute évolution du parcours de négociation touche un fichier de 1 470 lignes — c'est le principal frein à l'itération sur le cœur du pivot.

### 3.6 Navigation — asymétries de rôle — P2

`AppSidebar.tsx:68-74` : `/wallet` n'apparaît que dans `transporterItems`. Le client paie et peut être remboursé (chantier K1/K2/L1/L2 « remboursement/litige » livré le 22/07 selon le `BACKLOG.md`), mais n'a **pas** d'entrée portefeuille. Aucun rôle n'a d'entrée « Mes avis ». `/help` et `/settings` sont bien communs.

---

## 4. User stories — couverture par persona

Notation : ✅ couvert · ⚠️ partiel · ❌ absent.

### 4.1 Transporteur (persona **principal** — Mehdi, camionnette 2T, Tunis)

| # | User story | État | Écart |
|---|---|---|---|
| T1 | En tant que transporteur, je publie mon trajet retour en ~30 s avec véhicule et capacité **pré-remplis depuis mon profil**. | ⚠️ | Écran présent (`jobs/return-trip/page.tsx`). Le **pré-remplissage** depuis le profil n'est pas démontré par le code inspecté — à confirmer ; le pivot §5.1 en fait la condition des « 30 secondes ». |
| T2 | Je reçois une notification contextuelle « Vous rentrez à vide ? » après avoir terminé une livraison. | ❌ | Aucun déclencheur post-complétion vers la publication de retour. C'est le **hameçon d'acquisition du pivot** (§5.1 étape 1) et la source directe de la North Star Metric. |
| T3 | Je consulte les demandes structurées reçues sur mon trajet (marchandise, photos, prix). | ✅ | `components/return-trips/TripRequestsPanel.tsx` (382 l.) |
| T4 | J'accepte, refuse ou **contre-propose** une demande. | ✅ | `/api/trip-requests/:id/respond/`, `accept-counter/` |
| T5 | Je contre-propose sur une offre du **flux classique**. | ❌ | `/api/offers/:id/counter/` non appelé. Classé *Future* au pivot, donc **écart assumé** — mais le backend est déjà payé. |
| T6 | J'exécute la mission par jalons et fournis une preuve de livraison. | ✅ | `MissionStepper.tsx`, `PostDeliveryPanel.tsx`, `/api/jobs/:id/events/` |
| T7 | Je suis payé au portefeuille et je retire mes fonds. | ✅ | `app/(app)/wallet/page.tsx` + `/api/wallet/withdrawals/` |
| T8 | Je construis une réputation numérique visible. | ⚠️ | Avis affichés sur le profil public (`components/profile/ReviewsList.tsx`) mais **aucun écran « mes avis »** ; `/api/reviews/my/` non consommé. |
| T9 | Je **fidélise ma clientèle**. | ❌ | Besoin explicite (Vision §8). Backend `favorites/` livré, **zéro UI**. |
| T10 | Je fais vérifier mes documents et j'affiche mes badges de confiance. | ✅ | `verification/page.tsx`, `components/profile/TrustBadges.tsx` |
| T11 | Je réactive un trajet récurrent (« tous les mardis »). | ❌ | *Future* assumé. |
| T12 | Je vois combien mes retours m'ont rapporté et mon taux de remplissage. | ⚠️ | `/api/transporter/stats/` consommé, mais les **KPI pivot** (remplissage, économie de km à vide) ne sont pas exposés au transporteur ; `metrics/dashboard/` inutilisé. |

### 4.2 Client particulier (persona secondaire — Ahmed, frigo Tunis vers Sousse)

| # | User story | État | Écart |
|---|---|---|---|
| C1 | J'arrive sur « Trouver un trajet » et je saisis départ, arrivée, fenêtre de dates. | ✅ | `AppSidebar.tsx:54-58` met la recherche en première position sous `RETURN_TRIPS_FIRST` |
| C2 | Je vois les trajets compatibles avec transporteur noté, véhicule, capacité, prix, **économie estimée**. | ⚠️ | Liste, matching et bandeau de compatibilité branchés (`/api/return-trips/match/`, `matchBannerTitle`). Seule l'**économie estimée** — argument de conversion du pivot §5.2 — reste absente : aucun libellé d'économie ou de gain dans `fr.ts`. |
| C3 | Si aucun trajet : repli sans cul-de-sac (demande classique pré-remplie **ou** alerte corridor). | ✅ | `return-trips/page.tsx:418-430` + `/api/corridor-alerts/` — **bien fait, à ériger en modèle** |
| C4 | J'envoie une demande structurée avec photos et prix proposé. | ✅ | `components/jobs/PhotoUploader.tsx`, `/api/trip-requests/` |
| C5 | Je négocie (contre-offre) puis je paie de façon sécurisée. | ✅ | `booking/[jobId]/page.tsx`, `PaymentGateway.tsx`, `EscrowBadge.tsx` |
| C6 | Je suis ma mission en temps réel. | ✅ | `components/jobs/JobTimeline.tsx`, `components/map/RouteMap.tsx` |
| C7 | Je confirme la réception et je note le transporteur (double-aveugle). | ✅ | `/api/payments/confirm-completion/`, `components/reviews/ReviewForm.tsx` |
| C8 | J'ouvre un litige et j'en suis le traitement. | ✅ | `app/(app)/disputes/page.tsx` (655 l.) |
| C9 | J'**annule** ma demande selon des règles claires. | ⚠️ | Le web appelle `jobs/:id/cancel/` générique ; `client-cancel/` dédié non câblé. Règles et pénalités côté client à vérifier. |
| C10 | Je consulte mon portefeuille et mes remboursements. | ❌ | `/wallet` absent de la navigation client (`AppSidebar.tsx:68-74`) |
| C11 | J'utilise l'application **en arabe**. | ✅ | 1 767 clés + RTL implémenté (§3.2). Reste une recette visuelle à passer. |
| C12 | Je joins un document au chat pendant la négociation. | ❌ | *Secondary* assumé. |

### 4.3 Entreprise / PME (persona d'expansion — Vision §8)

| # | User story | État |
|---|---|---|
| E1 | Compte entreprise, plusieurs utilisateurs, commandes multiples | ❌ aucune notion d'organisation ; `select-role` propose client ou transporteur uniquement |
| E2 | Facturation, historique exportable | ❌ export présent côté **admin** seulement (`/api/admin/jobs/export/`, `users/export/`) |

**Écart de périmètre assumé** : la Vision place les PME en « expansion », donc hors MVP. À noter pour ne pas le redécouvrir comme un défaut.

### 4.4 Administrateur

| # | User story | État |
|---|---|---|
| A1 | Modération : utilisateurs, vérifications, litiges, avis | ✅ 10 écrans admin, tous câblés |
| A2 | Dashboard liquidité par corridor, taux de remplissage, GMV retours vs classique, funnel | ⚠️ `admin/dashboard/page.tsx` traite le corridor ; `metrics/dashboard/` inutilisé — instrumentation du pivot incomplète |
| A3 | Identifier les corridors déséquilibrés pour le démarchage ciblé | ⚠️ dépend de A2 |
| A4 | Journal d'audit, escrow, commissions | ✅ `admin/audit-log`, `admin/payments`, `/api/admin/escrow/:id/release` et `refund` |

---

## 5. Écarts priorisés

### P0 — à traiter avant toute ouverture

| # | Écart | Section |
|---|---|---|
| P0-1 | **Dark mode atteignable et cassé** hors admin : `ThemeToggle` exposé à tous, suit `prefers-color-scheme`, mais `app/(app)` et `app/(marketing)` ont 0 style `dark:` | §3.1 |
| P0-2 | **Tokens de design non branchés** : `tailwind.config.ts` n'utilise aucun `var(--…)` ; les variables de `globals.css` sont inertes — cause racine de P0-1 | §2 D2 |

*(Un troisième P0 « arabe sans RTL » figurait dans la première passe. Il est retiré : le constat était erroné, voir §3.2.)*

### P1

| # | Écart | Section |
|---|---|---|
| P1-1 | Notification contextuelle post-livraison « vous rentrez à vide ? » absente — hameçon d'acquisition du pivot et moteur de la North Star Metric | §4.1 T2 |
| P1-2 | « Économie estimée » et compatibilité non exposées au client — argument de conversion du funnel | §4.2 C2 |
| P1-3 | Accessibilité : labels de formulaire (`htmlFor`, 13 hits), `aria-*` (33 hits), pas de lien d'évitement | §3.3 |
| P1-4 | Pages monolithiques (1 470 et 1 249 lignes) + 28 appels réseau inline, contre `CLAUDE.md` §4 | §3.5 |
| P1-5 | États chargement, vide et erreur non uniformisés (3 pages sur environ 34) | §3.4 |
| P1-6 | Doublons de composants (3 `StatCard`, 2 `Pagination`, 2 `StatusBadge`) et deux échelles de bleu | §2 D1, D4 |
| P1-7 | KPI pivot non instrumentés à l'écran (`metrics/dashboard/` inutilisé) — pilote corridor A1 piloté à l'aveugle | §4.4 A2 |

### P2

| # | Écart | Section |
|---|---|---|
| P2-1 | Fidélisation clientèle (`favorites/`) : backend livré, UI absente | §4.1 T9 |
| P2-2 | Écran « mes avis » absent (`reviews/my/`) | §4.1 T8 |
| P2-3 | Portefeuille absent de la navigation client | §3.6, §4.2 C10 |
| P2-4 | `client-cancel/` non câblé (asymétrie avec `transporter-cancel/`) | §4.2 C9 |
| P2-5 | Maquettes `design-system/*.html` sans contrôle de conformité | §2 D3 |
| P2-6 | Contre-offres flux classique, pièces jointes chat, trajets récurrents, comptes entreprise — *Future* et *Secondary* assumés, à documenter comme tels | §4 |

---

## 6. Lecture d'ensemble

**Ce qui est solide.** La couverture fonctionnelle du pivot « Return Trips First » est réelle : les cinq besoins **Core** sont implémentés côté web, et le point le plus délicat — le funnel client inversé avec repli sans cul-de-sac — est traité proprement (`return-trips/page.tsx:418-430`). La surface API est largement consommée : sur environ 140 routes backend, seule une petite dizaine reste orpheline. Deux chantiers transverses sont mieux traités que dans la majorité des produits comparables : la **visibilité du focus clavier** (209 hits sur 39 fichiers) et le **RTL arabe**, mené jusqu'au zéro absolu d'utilitaires directionnels.

**Où se situe le vrai risque.** Il n'est pas fonctionnel, il est **de finition perçue**. Un seul écart est visible par l'utilisateur final sans qu'il ait rien demandé, mais il est sévère : un OS en mode sombre suffit à produire une interface mi-sombre mi-claire, sidebar sombre contre contenu blanc, bordures forcées sur fond clair. Sa cause est structurelle — les tokens de `globals.css` ne sont pas branchés aux utilitaires Tailwind — ce qui en fait aussi le plus rapide à corriger à la racine.

**Où se situe la dette qui coûtera le plus cher.** `jobs/[id]/page.tsx`, à 1 470 lignes, concentre le cœur de la négociation du pivot. C'est précisément la zone qui devra itérer le plus vite pendant le pilote corridor A1, et la plus difficile à modifier sans régression.

**Recommandation d'ordonnancement** : P0-2 (brancher les tokens) puis P0-1, car le second dépend du premier ; ensuite P1-1 et P1-2, les deux seuls écarts P1 qui touchent directement la North Star Metric ; enfin P1-4, à mener par extraction progressive de `jobs/[id]` vers `lib/services/` plutôt qu'en réécriture. Le RTL ne demande plus qu'une recette visuelle en arabe, pas un chantier.

**À revalider avec Context7 avant implémentation** : les recommandations §3.2 (`dir` dans `app/layout.tsx`, App Router) et §2 D2 (couleurs Tailwind via `var(--…)`), non vérifiées contre la documentation officielle courante faute d'outil dans cette session.
