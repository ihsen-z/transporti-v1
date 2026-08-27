# PLAN D'ACTION — MISE À NIVEAU DE L'APPLICATION WEB

**Date** : 26/08/2026 · **Périmètre** : `frontend/` · **Base** : cartographie applicative « Retour First » du 26/08
**Documents de référence** : `docs/CARTOGRAPHIE_APPLICATIVE_RETOUR_FIRST_2026-08-26.md`, `docs/AUDIT_WEB_DESIGN_UX_USERSTORIES_2026-08-26.md`, `docs/BRIEF_DESIGN_MOCKUPS_RETOUR_FIRST_2026-08-26.md`

---

## Journal d'avancement

> **Ce document est mis à jour à chaque échange.** Il doit pouvoir être lu seul
> pour savoir où en est le chantier.

**Dernière mise à jour** : 26/08/2026 · **Branche de travail** : `feature/lot0-fondations-retour-first`

### Lot 0 — Fondations et filet de sécurité · **en cours, 4 tâches sur 6**

| Tâche | État | Commit | Preuve |
|---|---|---|---|
| 0.1 Durcir la porte de merge | ✅ **fait** | `cb66d5b` | Tube `\| head -100` retiré ; le code de sortie d'ESLint remonte |
| 0.2 Renommer les routes — **vague A** (4 routes du pivot) | ✅ **fait** | `cb66d5b` | 4 redirections en `308` vers la bonne cible, 4 nouvelles routes en `200` |
| 0.2 Renommer les routes — **vague B** (7 routes restantes) | ✅ **fait** | `2d1a4f7` | 11 redirections au total vérifiées, `next build` vert |
| 0.3 Annuler le mode sombre métier | ✅ **fait** | `cb66d5b` | `ThemeToggle` retiré d'`AppSidebar` + `ForceLightTheme` dans les deux layouts |
| 0.4 Socle Playwright, 3 parcours | 🔨 **en cours** | — | Prérequis dur du lot 4 |
| 0.5 Recette visuelle en arabe | ⏳ à faire | — | Demande un œil humain, non automatisable |

**Décidé en chemin, hors plan initial** — la classe `dark` posée sur `<html>` par la zone
d'administration survivait à une navigation côté client vers les écrans métier. D'où la création de
`components/layout/ForceLightTheme.tsx`, monté dans les layouts `(app)` et `(marketing)`. Non prévu,
nécessaire.

**Volontairement laissé de côté au lot 0.2** — `/jobs` et `/jobs/[id]` ne sont pas renommés : ils
portent deux rôles (détail de trajet vu par un client, détail de mission vu par un transporteur), et
leur séparation relève du lot 4. Documenté comme dépendance.

**Incident de parcours à retenir** — la réécriture des références par `sed` a cassé trois chemins
**API** (`/api/jobs/return-trip/` transformé en `/api/retours/nouveau/`), repérés et restaurés avant
tout commit. Leçon pour la vague B et les lots suivants : **ne jamais réécrire un motif de route sans
exclure les chemins commençant par `/api/`.**

### Lots 1 à 6 · **non démarrés**

Les décisions bloquantes du §4 sont désormais toutes tranchées : le lot 1 peut démarrer dès que le
lot 0.4 est livré.

---

## 0. Cadrage

### 0.1 Paramètres retenus

| Paramètre | Valeur | Conséquence sur le plan |
|---|---|---|
| Horizon | **3 mois ou plus** | Plan complet : les 14 écrans du delta, la dette architecturale, et un socle de tests |
| Capacité | **Un développeur, temps plein** | Lots **séquentiels**. Un seul chantier transverse à la fois. Pas de parallélisation |
| Renommage des routes | **En premier**, avant tout le reste | Les 14 nouveaux écrans naissent directement sur la bonne arborescence |
| Tests front | **Parcours critiques uniquement** | Playwright sur les 3 parcours. Pas de tests unitaires de composants |
| Mode sombre | **Chantier annulé** (décision du 26/08) | L'option B (branchement des tokens + audit des 128 composants, 5 à 8 j) est retirée. Le branchement des tokens l'est aussi : son seul bénéfice concret était ce mode sombre. Reste l'acte d'annulation — retirer le `ThemeToggle` des écrans métier |

**Durée cible** : 12 semaines, en 7 lots. Chaque lot est livrable et déployable indépendamment.
*(13 semaines dans la version précédente ; l'annulation du mode sombre en libère une demie, et l'analyse backend en ajoute une demie côté lots 5 et 6.)*

### 0.2 État de départ mesuré

| Constat | Valeur | Source |
|---|---|---|
| Routes existantes | 45 `page.tsx` | `frontend/app/` |
| Écrans conformes / à faire évoluer / à créer | 24 / 17 / 14 | cartographie |
| Lignes dans `app/` | 19 071 | — |
| Fichier le plus gros | `app/(app)/jobs/[id]/page.tsx`, **1 470 lignes, 12 gestionnaires d'API** | `page.tsx:119-406` |
| Pages avec appel réseau inline | 28 | — |
| Couche `lib/services/` | 4 domaines, 718 lignes (dont 474 pour l'admin seul) | — |
| Références de routes à corriger au renommage | ~75 sur 8 routes (97 `href`/`router.push` au total) | — |
| **Tests front** | **aucun** | CI et arborescence |
| Tests back | présents (`test_return_trip.py`, `test_workflows.py`, `logistics/tests`) | — |
| CI front | prettier, eslint *(non bloquant)*, typecheck *(bloquant)*, build, taille de bundle | `.github/workflows/frontend-ci.yml` |

### 0.3 Limite déclarée — Context7

**Context7 n'est pas disponible dans cette session** (aucun outil `resolve-library-id` / `get-library-docs`).
Conformément au `CLAUDE.md` §1, je le signale explicitement plutôt que de m'appuyer silencieusement
sur ma mémoire. Les points ci-dessous reposent sur le code du projet et **doivent être revalidés
contre la documentation officielle courante avant implémentation** :

- **Lot 0.2** — forme exacte de la clé `redirects` dans `next.config.mjs` et sémantique `permanent`
- **Lot 4** — conventions actuelles de découpage App Router : frontière composant serveur / client, colocation des `hooks/`, et emplacement recommandé de la couche d'accès aux données
- **Lots 1, 5, 6** — conventions Django REST Framework pour les nouveaux endpoints d'agrégation : pagination, sérialisation des agrégats, et forme actuelle des permissions personnalisées

*(Un point sur le branchement des couleurs Tailwind vers des variables CSS figurait ici. Il tombe avec l'annulation du chantier mode sombre.)*

Aucun autre point du plan ne dépend d'une API externe susceptible d'avoir changé.

### 0.4 Architecture backend — ce qu'elle impose au plan

Analyse du 26/08 via le graphe, puis lectures ciblées. Le backend est **mieux structuré que le
frontend** : vues découpées par domaine (`logistics/views/{jobs,offers,trip_requests,return_trips,corridors,profiles,misc}.py`),
et une suite de tests réelle (`test_parcours_retour.py`, `test_trip_requests.py`, `test_corridors.py`,
`test_payment_lock.py`, `test_status_transitions.py`, `test_offer_commission.py`). Le plan doit
s'aligner sur ces conventions, pas en inventer.

#### Contraintes structurelles à respecter pour tout ajout

| Contrainte | Détail | Conséquence |
|---|---|---|
| **Agrégat unique** | `TransportJob` (`logistics/models.py:6`) porte **à la fois** les demandes classiques et les trajets retour, distingués par le drapeau `is_return_trip` (`models.py:65`) | La séparation de routes `/trajets/[id]` contre `/expeditions/[id]` du lot 0.2 est une distinction **de vue**, pas de modèle. Ne pas chercher à scinder l'agrégat |
| **RBAC en point de passage unique** | `RequireRole.for_roles('CLIENT', …)` (`users/permissions.py:21-38`), **102 usages** | Tout nouvel endpoint passe par cette fabrique. Jamais de contrôle de rôle écrit à la main |
| **Double surface API** | `/api/v1/` pour le mobile (compatibilité ascendante), `/api/` pour le web (`transporti_core/urls.py:55-56,100`) | Tout nouvel endpoint doit être exposé **dans les deux**, sous peine de désynchroniser le mobile |
| **Un test par endpoint** | La convention existe et est tenue | Aucune tâche backout de ce plan n'est finie sans son test |

#### Ce qui est déjà servi par l'API — donc pur frontend

| Écran du plan | Endpoint vérifié | Statut |
|---|---|---|
| C1.7 Mes alertes corridor | `CorridorAlertListCreateView` (GET + POST) et `CorridorAlertDeleteView` (`views/corridors.py:109,171`) | ✅ GET de liste présent : l'écran est du pur assemblage |
| T5.3 Réputation · C5.2 Mes avis | `reviews/my/` → `ReviewMyListView` (`reviews/urls.py:14`) | ✅ |
| C2.4 Annulation client | `jobs/<id>/client-cancel/` → `ClientBookingCancelView` (`logistics/urls.py:40`) | ✅ |
| C5.3 Transporteurs favoris | `FavoriteListView` + `FavoriteToggleView` (`views/misc.py:64,97`) | ✅ |
| C1.2 Économie estimée | `pricing.py` : `estimate_price()`, `PricingGrid` (`models.py:180`), `estimate_road_distance_km()` | ✅ base de calcul disponible |

#### Quatre écarts qui imposent du travail backend non prévu

**B-1 — Le véhicule existe, mais en kilogrammes.** *(Lève le risque n°1 du plan initial.)*
Le pré-remplissage de T1.2 est possible : `TrustProfile.vehicle_type`, `vehicle_capacity_kg`,
`vehicle_plate`, `vehicle_photos` (`trust/models.py:226-237`). Le champ est dans l'app **`trust`**,
pas `users` — c'est là qu'il faut aller le chercher.

Mais l'unité est le **kilogramme**, alors que la cartographie et le brief de design parlent en
**mètres cubes** (« 8 m³ », « 1,4 m³ libres »). Le backend ne connaît aucune notion de volume.
→ **Décision produit requise avant le lot 1**, voir §4.

**B-2 — La capacité disponible n'est pas structurée.** `TransportJob.available_capacity` est un
`CharField(max_length=255, blank=True)` en texte libre (`models.py:67`). Le matching quantitatif
(« mon frigo rentre-t-il ? ») est donc impossible en l'état, et la saisie 4 de T1.2 (« quelle place
reste-t-il ? ») n'a pas de champ typé où atterrir.
→ Migration à prévoir au lot 1.

**B-3 — `metrics/dashboard/` ne renvoie pas les KPI du pivot.** `CrossMetricsView`
(`views/misc.py:137`) est un tableau de bord **générique par rôle** : côté transporteur
`total_offers`, `accepted_offers`, `completed_missions`, `acceptance_rate`, `total_earned` ; côté
client `total_jobs`, `total_spent`, `avg_rating_given`, `favorite_transporters`.

Ni les **kilomètres à vide valorisés**, ni le **taux de remplissage**, ni le **revenu par corridor**
n'en font partie. Les écrans T1.1 et T5.4 exigent donc une **agrégation nouvelle**.

Bonne nouvelle : aucun changement de modèle n'est requis. La matière première est en place —
`TransportJob.distance_km` (`models.py:80`), `is_return_trip`, et `pickup_governorate` /
`dropoff_governorate` **tous deux indexés** (`models.py:57-58`). Mieux : `pricing.py` porte déjà
`estimate_road_distance_km()`, annoté en clair *« NSM instrumentation (vision v1.0) »*. L'instrument
de la métrique unique existe ; il n'est simplement pas exposé.

**B-4 — Les favoris sont à sens unique.** Le modèle `FavoriteTransporter` (`models.py:229`) va du
client vers le transporteur, et les deux vues sont verrouillées `RequireRole.for_roles('CLIENT')`
(`views/misc.py:70,102`). Donc C5.3 (favoris côté client) est du pur frontend, mais **T5.5 « clients
fidèles » — le versant transporteur — n'a aucun endpoint**. C'est une agrégation inverse à écrire.
→ Tâche backend au lot 6.

#### Un acquis à ne pas redécouvrir

`CounterOffer` (`models.py:256`) est un modèle complet, avec `proposed_price` et `status`. La
contre-offre sur le flux classique est donc **prête côté données**, même si elle reste classée
*Future*. Ne pas la reconstruire si elle est un jour rouverte.

### 0.5 Méthode de lecture du code

Graphe Graphify consulté avant chaque lecture (graphe du 25/08/2026, à jour : aucun changement de
code depuis sa construction — seuls les documents d'audit du 26/08 sont non suivis). Lectures
ciblées `file:line` sur les nœuds retournés, jamais de lecture de fichier entier.

---

## 1. Vue d'ensemble

| Lot | Titre | Semaines | Nature | Ce qui devient vrai à la fin |
|---|---|---|---|---|
| **0** | Fondations et filet de sécurité | 1 – 2 | Transverse | L'arborescence est juste, le mode sombre est retiré, les 3 parcours sont sous test |
| **1** | Le retour à vide capté | 3 – 5 | Fonctionnel + **backend** | Un transporteur qui livre publie son retour en 30 s |
| **2** | La boîte de réception transporteur | 6 | Fonctionnel | Il voit toutes ses demandes en un écran |
| **3** | La conversion client | 7 – 8 | Fonctionnel | Le client voit son économie et gère ses alertes |
| **4** | Dette architecturale | 9 – 10 | Transverse | `jobs/[id]` est découpé, la couche services couvre tous les domaines |
| **5** | Argent et réputation | 11 – 12 | Fonctionnel + **backend** | Chacun voit ce qu'il gagne et sa réputation |
| **6** | Rétention et acquisition | 12 | Fonctionnel + **backend** | Fidélisation et pages publiques de confiance |

**Logique de séquencement.** Le lot 0 est un prérequis dur : renommer après avoir créé 14 écrans
double le travail, et découper `jobs/[id]` sans test de parcours est le risque de régression le plus
élevé du plan. Les lots 1 à 3 sont ordonnés par impact sur la métrique unique. Le lot 4 est placé
*après* eux volontairement : la dette ne bloque pas la création d'écrans **nouveaux**, elle bloque
la modification de l'existant — or les lots 1 à 3 créent plus qu'ils ne modifient.

---

## LOT 0 — Fondations et filet de sécurité

**Semaines 1 – 2** · Transverse · **Aucune valeur utilisateur visible, et c'est normal.**

Ce lot ne livre aucune fonctionnalité. Il rend les six lots suivants moins chers et moins risqués.
C'est le seul lot dont sauter une étape se paie plus tard avec intérêts.

### 0.1 — Durcir la porte de merge *(0,5 jour)*

Le lint est aujourd'hui non bloquant **deux fois** : par `continue-on-error: true`
(`frontend-ci.yml:52`) et par le tube `| head -100` qui masque le code de sortie d'ESLint. C'est un
choix explicite — le commentaire du fichier désigne le typecheck comme porte de merge — mais il
laisse passer les régressions de qualité pendant treize semaines de développement soutenu.

- Retirer le tube `| head -100` pour que le code de sortie remonte
- Garder `continue-on-error: true` dans un premier temps, mais **traiter la dette de lint existante** avant de le retirer
- Une fois à zéro avertissement, retirer `continue-on-error` et aligner `next.config.mjs` (`eslint.ignoreDuringBuilds` passe à `false`)

**Fini quand** : le CI échoue sur une erreur de lint introduite volontairement pour le test.

### 0.2 — Renommer les routes *(2 jours)*

Passe mécanique unique. ~75 références sur 8 routes.

| Actuelle | Cible |
|---|---|
| `/jobs/return-trips` | `/recherche` |
| `/jobs/[id]` *(vue client d'un trajet)* | `/trajets/[id]` |
| `/jobs/new` | `/demandes/nouvelle` |
| `/jobs/browse` | `/demandes` |
| `/jobs/[id]` *(vue liste client)* | `/expeditions` |
| `/jobs/return-trip` | `/retours/nouveau` |
| `/offers` | `/mes-offres` |
| `/wallet` | `/portefeuille` |
| `/settings` | `/compte` |
| `/disputes` | `/litiges` |

**Méthode** : déplacer les dossiers, corriger les références, ajouter les redirections permanentes
dans `next.config.mjs`, vérifier au typecheck et au build.

**Point de vigilance** — `/jobs/[id]` porte aujourd'hui **deux rôles** (détail de trajet retour vu
par un client, et détail de mission vu par un transporteur). Le renommage ne peut pas les séparer à
lui seul : conserver une seule route `/expeditions/[id]` à ce stade, et documenter la séparation
comme dépendance du lot 4.

**Fini quand** : build vert, aucune référence à `/jobs/`, chaque ancienne URL redirige.

### 0.3 — Annuler le mode sombre sur les écrans métier *(0,5 jour)*

**Décision du 26/08 : le chantier mode sombre est annulé.** L'option de branchement des tokens et
d'audit des 128 composants (5 à 8 j) est retirée du plan, et avec elle le branchement des tokens
Tailwind sur les variables CSS — son seul bénéfice concret était ce mode sombre.

Reste l'acte d'annulation, qui retire un défaut visible au lieu de le laisser en place.

**Le défaut, en trois faits vérifiés.** `ThemeToggle` est monté dans `AppSidebar.tsx:113`, donc
visible par tous les utilisateurs métier. Il suit `prefers-color-scheme` en l'absence de préférence
stockée (`ThemeToggle.tsx:26-30`) : un utilisateur dont le système est en sombre reçoit la classe
`dark` **sans avoir cliqué**. Or `app/(app)` et `app/(marketing)` contiennent **zéro** style `dark:`.
Résultat atteignable sans action : barre latérale sombre contre contenu blanc, bordures forcées
`neutral-700` par `.dark *` (`globals.css:153`) sur fond clair.

**À faire**

- Retirer `ThemeToggle` de `components/navigation/AppSidebar.tsx` — la zone d'administration le garde, elle est réellement dark-aware (10 fichiers stylés)
- Neutraliser l'adhérence à `prefers-color-scheme` sur les écrans métier, pour qu'un système en sombre ne pose plus la classe `dark`
- Conserver `ThemeToggle.tsx` et le bloc `.dark` de `globals.css` : rien n'est supprimé, le chantier reste rouvrable sans repartir de zéro

**Fini quand** : un système réglé en mode sombre affiche l'application métier entièrement en clair,
sans zone hybride.

### 0.4 — Socle de tests des 3 parcours critiques *(3 jours)*

Playwright. Trois scénarios, pas plus. Ce sont eux qui autorisent le lot 4.

| Scénario | Chemin couvert | Ce qu'il protège |
|---|---|---|
| **A — Retour capté** | mission livrée → publication d'un retour → retour visible en recherche | Le cœur du pivot |
| **B — Recherche sans impasse** | recherche avec résultats → demande envoyée ; **et** recherche vide → repli → demande pré-remplie **ou** alerte | Le funnel client et ses deux branches |
| **C — Négociation** | demande envoyée → contre-proposition transporteur → acceptation client → paiement | La transaction |

Les `testID` posés sur le mobile lors des lots L6.5 et L6.7 fournissent la convention de nommage à
reprendre côté web, ce qui évite d'en inventer une seconde.

**Fini quand** : les 3 scénarios passent en CI, et le CI échoue si l'un casse.

### 0.5 — Recette visuelle en arabe *(1 jour)*

Le RTL est réellement implémenté : `dir` posé avant le premier rendu (`app/layout.tsx:51`),
synchronisé à chaque changement de locale (`useAppI18n.tsx:95`), police Cairo sur `dir="rtl"`,
58 lignes de CSS RTL, et **76 `ms-*`/`me-*` + 47 `ps-*`/`pe-*` contre 0 `ml-*`/`mr-*`/`pl-*`/`pr-*`** :
la migration vers les propriétés logiques est allée jusqu'au bout.

Ce qui reste n'est pas mesurable par recherche statique et demande un passage à l'œil, une fois :
miroir des icônes directionnelles (chevrons, flèches de progression), rendu des graphiques
`recharts` et de la carte Leaflet en RTL.

**Fini quand** : une passe complète en arabe sur les 10 écrans les plus fréquentés, anomalies
corrigées ou consignées.

> **Livrable du lot 0** : arborescence juste, tokens branchés, mode sombre réglé, 3 parcours sous
> test, RTL recetté, porte de merge crédible. **Aucune fonctionnalité nouvelle.**

---

## LOT 1 — Le retour à vide capté

**Semaines 3 – 5** · Fonctionnel · **Le lot qui justifie le pivot.**

**Objectif métier** — Qu'un transporteur qui vient de livrer publie son retour sans y penser.
C'est le seul lot dont le résultat se lit directement dans la métrique unique.

### Contenu

| Réf. | Écran | Nature | Détail |
|---|---|---|---|
| **T4.4** | Fin de mission → amorce de retour | **Créer** | Bandeau d'amorce à l'état final de `/missions/[id]`, corridor inversé et véhicule pré-remplis. Priorité 1 du delta |
| **T1.2** | Publier un retour | **Faire évoluer** | Ramener à **4 saisies maximum**. Véhicule et capacité issus du profil, jamais ressaisis. Choix tactiles au lieu de saisie libre pour date et capacité |
| **T1.3** | Mes trajets publiés | **Créer** | Inventaire : éditer, prolonger, dupliquer, dépublier, expiration visible. Classé *Core* par le pivot |
| **T1.1** | Hub « Mes retours » | **Faire évoluer** | Le tableau de bord passe de « mes missions » à « mes retours ». Bandeau d'amorce conditionnel en première ligne, indicateurs, km à vide valorisés |

### Travail backend requis *(nouveau, issu de l'analyse du 26/08)*

| # | Tâche | Détail |
|---|---|---|
| **B-2** | Structurer `available_capacity` | Aujourd'hui `CharField(255)` en texte libre (`logistics/models.py:67`). La saisie 4 de T1.2 n'a pas de champ typé où atterrir, et le matching quantitatif est impossible. Migration + sérialiseur + test |
| **B-1** | Exposer le véhicule au pré-remplissage | Les données existent : `TrustProfile.vehicle_type`, `vehicle_capacity_kg` (`trust/models.py:226-232`). Les rendre disponibles à l'écran de publication |
| **B-3a** | Km à vide valorisés pour T1.1 | `CrossMetricsView` ne les renvoie pas. Agrégation sur `distance_km` × `is_return_trip`. Pas de changement de modèle |

### Dépendances

- Lot 0.2 pour naître sur `/retours/*` et `/missions/*`
- Lot 0.4 scénario A comme filet
- ~~Vérification du lien profil → véhicule~~ → **risque levé** : les champs existent dans
  `trust/models.py:226-237`. Le pré-remplissage de T1.2 est faisable sans nouveau modèle.
- **Décision produit bloquante** : kilogrammes ou mètres cubes ? Le backend ne connaît que
  `vehicle_capacity_kg` ; la cartographie et le brief parlent en m³. Voir §4, décision n° 2.

### Risque et garde-fou

Le bandeau d'amorce est intrusif par construction. Prévoir dès la conception une échappatoire
(« Plus tard ») et une règle de non-répétition, sinon il sera perçu comme une relance publicitaire
et désactivé mentalement.

**Fini quand** : le scénario A de Playwright passe de bout en bout, et un transporteur réel publie
un retour en moins de 30 secondes sans aide.

---

## LOT 2 — La boîte de réception transporteur

**Semaine 6** · Fonctionnel · Lot court, valeur immédiate.

**Objectif métier** — Qu'un transporteur avec plusieurs retours en ligne sache d'un coup d'œil
combien de décisions l'attendent.

### Contenu

| Réf. | Écran | Nature | Détail |
|---|---|---|---|
| **T2.1** | Demandes reçues, tous trajets confondus | **Créer** | Onglets par attente d'action (`À décider`, `En négociation`, `Archivées`) avec compteurs. Trois actions par carte, sans ouvrir le détail |
| **T4.1** | Mes missions, segmentées | **Faire évoluer** | Onglets `À venir` / `En cours` / `Terminées`, aujourd'hui mélangés |

Aujourd'hui les demandes ne sont visibles que **trajet par trajet** (via `TripRequestsPanel`, 382 l.).
Le composant existe et fonctionne : ce lot ajoute la vue consolidée au-dessus, il ne le remplace pas.

### Dépendances

Lot 1 (T1.3 fournit la liste des trajets à agréger). API `trip-requests/my/` déjà disponible.

**Fini quand** : le compteur de l'onglet `À décider` correspond exactement au nombre de demandes en
attente, tous trajets confondus.

---

## LOT 3 — La conversion client

**Semaines 7 – 8** · Fonctionnel.

**Objectif métier** — Rendre visible au client la raison pour laquelle il paie moins, et ne jamais
le laisser dans une impasse.

### Contenu

| Réf. | Écran | Nature | Détail |
|---|---|---|---|
| **C1.2** | Économie estimée dans les résultats | **Créer** *(composant)* | Ligne dédiée en vert sur la carte de trajet. Priorité 4 du delta |
| **C1.7** | Mes alertes corridor | **Créer** | Lister, désactiver, supprimer. `corridor-alerts/:id` existe, l'écran non |
| **C2.1** | Mes expéditions, triées par attente d'action | **Faire évoluer** | Tri primaire « qui doit agir », pas la date |
| **C1.1** | Recherche de trajet | **Faire évoluer** | Devient l'accueil client. Pas de tableau de bord côté client |

### Point technique sur l'économie estimée

C'est le seul élément de ce lot qui demande une **décision de calcul, pas seulement d'affichage**.
`return-trips/match/` fournit déjà le rapprochement, et le matching est exposé côté UI
(`matchBannerTitle`, `reverseMatchTitle` dans `fr.ts:1017,1724`). Ce qui manque est la référence :
économie par rapport à quoi ? Trois bases possibles, à trancher avant de coder :

1. Prix médian des demandes classiques sur le même corridor
2. Prix issu de `jobs/estimate-price/` pour un trajet dédié équivalent
3. Barème forfaitaire par corridor, administré

**Recommandation** : option 2, qui réutilise un endpoint existant et reste explicable au client.
Afficher la mention de la base de comparaison, jamais un chiffre nu.

### Dépendances

Lot 0.2 pour `/recherche` et `/alertes`. Lot 0.4 scénario B comme filet.

**Fini quand** : le scénario B passe sur ses deux branches, et l'économie affichée est justifiable
à l'euro près par une règle écrite.

---

## LOT 4 — Dette architecturale

**Semaines 9 – 10** · Transverse · **Le lot le plus risqué. Il n'est faisable qu'après le lot 0.4.**

**Objectif technique** — Rendre le cœur de la négociation modifiable sans peur, avant que le pilote
corridor A1 n'impose des itérations rapides dessus.

### 4.1 — Découper `jobs/[id]/page.tsx` *(6 jours)*

1 470 lignes, **12 gestionnaires d'API** identifiés (`page.tsx:119-406`) : `handlePayNow`,
`handleConfirmStart`, `fetchJob`, `handleConfirmDelivery`, `handleBookReturnTrip`,
`handleSendTripRequest`, `handleAcceptCounter`, `handleCancelTripRequest`, `handleCancelJob`,
`handleMarkDelivered`, `handleLogMilestone`, `handleTransporterCancel`.

**Méthode — par extraction, jamais par réécriture.** Un gestionnaire à la fois, dans cet ordre, en
vérifiant le scénario Playwright correspondant après chacun :

1. Les mutations vers `lib/services/` (`jobs.ts` existant, `tripRequests.ts` à créer)
2. La lecture (`fetchJob`) vers un hook `useJobDetail`
3. Les panneaux d'interface vers `components/jobs/` (le fichier porte aussi 4 dialogues, `page.tsx:1355-1423`)
4. La page devient une composition, conformément au `CLAUDE.md` §4

**Séparer les deux rôles** de l'ancienne route, dépendance identifiée au lot 0.2 : détail de trajet
vu par un client, et détail de mission vu par un transporteur.

### 4.2 — Compléter la couche services *(4 jours)*

`lib/services/` couvre 4 domaines pour 718 lignes, dont 474 pour l'administration seule. **28 fichiers
de `app/`** appellent le client HTTP directement. Domaines sans couche service : portefeuille,
litiges, confiance, avis, messagerie, demandes de trajet.

Créer un fichier par domaine, avec les types issus du schéma backend plutôt que réécrits à la main.

### Garde-fou

Ce lot ne livre **aucune** valeur utilisateur et porte le risque de régression le plus élevé.
Deux règles : un commit par gestionnaire extrait, et aucune extraction sans que le scénario
Playwright correspondant repasse. Si les tests du lot 0.4 n'ont pas été faits, **ne pas commencer ce
lot** — reporter et l'assumer explicitement.

**Fini quand** : aucun fichier de `app/` ne dépasse 300 lignes, aucun appel réseau ne subsiste
hors `lib/`, et les 3 scénarios passent.

---

## LOT 5 — Argent et réputation

**Semaines 11 – 12** · Fonctionnel · Beaucoup d'API déjà livrées, peu de backend à écrire.

**Objectif métier** — Rendre visible à chacun ce qu'il gagne et ce que vaut sa réputation. Trois
promesses de la vision fondatrice sont aujourd'hui invisibles dans l'interface bien que servies par
l'API.

### Contenu

| Réf. | Écran | Nature | État côté API |
|---|---|---|---|
| **T5.4** | Performance retours | **Créer** | ⚠️ **Backend requis** — voir B-3b ci-dessous |
| **T5.3** | Réputation transporteur | **Créer** | ✅ `reviews/my/` → `ReviewMyListView`. Complété par `TrustProfile.trust_score`, `response_time_avg_minutes`, `total_jobs_completed`, `completion_rate` (`trust/models.py:217,252-257`) — pur assemblage |
| **C5.2** | Mes avis donnés | **Créer** | ✅ `reviews/my/` |
| **C5.1** | Portefeuille client | **Créer** | ✅ `wallet/` existe, absent de la navigation client (`AppSidebar.tsx:68-74`) |
| **T5.2** | Historique paiements et commissions | **Faire évoluer** | ✅ À distinguer du solde |
| **C2.4** | Annulation client | **Faire évoluer** | ✅ `ClientBookingCancelView` existe (`logistics/urls.py:40`) et n'est pas câblé ; le web appelle le `cancel/` générique (`page.tsx:410`). Afficher les conséquences chiffrées avant confirmation |

### Travail backend requis — B-3b : les KPI du pivot *(2 jours)*

`CrossMetricsView` (`views/misc.py:137`) est un tableau de bord générique par rôle et ne renvoie
**aucun** des trois indicateurs de T5.4. À produire, en agrégation pure — aucun changement de
modèle n'est nécessaire :

| Indicateur | Source de calcul |
|---|---|
| Kilomètres à vide valorisés | somme de `distance_km` sur les `TransportJob` terminés avec `is_return_trip = True` |
| Taux de remplissage | retours ayant abouti à une mission / retours publiés |
| Revenu par corridor | regroupement sur `pickup_governorate` × `dropoff_governorate`, tous deux indexés (`models.py:57-58`) |

Réutiliser `pricing.py::estimate_road_distance_km()`, déjà annoté *« NSM instrumentation (vision
v1.0) »* : l'instrument existe, il n'est pas exposé. Nouvel endpoint sous `RequireRole.for_roles('TRANSPORTER')`,
exposé **dans les deux surfaces** `/api/` et `/api/v1/`, livré avec son test.

### Dépendance

Lot 4.2 : ces six écrans sont exactement ceux dont les domaines n'ont pas de couche service. Les
construire avant le lot 4 ajouterait six pages à la dette au lieu de la réduire.

**Fini quand** : plus aucun endpoint de la liste ci-dessus n'est orphelin.

---

## LOT 6 — Rétention et acquisition

**Semaine 13** · Fonctionnel · Lot de finition.

| Réf. | Écran | Nature | Justification |
|---|---|---|---|
| **C5.3** | Transporteurs favoris | **Créer** | ✅ `FavoriteListView` + `FavoriteToggleView` livrés. Pur frontend |
| **T5.5** | Clients fidèles | **Créer** | ⚠️ **Backend requis (B-4)** — voir ci-dessous |
| **P4** | Devenir transporteur | **Créer** | Acquisition. Le pivot notait déjà cette entrée comme « enfouie » |
| **P3** | Confiance et sécurité | **Créer** | Lève l'objection n°1 du persona client |
| **T0.1 / T0.4** | Onboarding transporteur par étapes | **Créer** | Identité, zone d'activité, corridors habituels. Alimente le matching inversé |
| **C5.6** | Carnet d'adresses | **Créer** | Confort, réduit la friction de recherche répétée |

### Travail backend requis — B-4 : les favoris à l'envers *(1 jour)*

Le modèle `FavoriteTransporter` (`logistics/models.py:229`) va **du client vers le transporteur**, et
les deux vues sont verrouillées `RequireRole.for_roles('CLIENT')` (`views/misc.py:70,102`). Le
transporteur n'a donc aucun moyen de voir qui l'a mis en favori, ni ses clients récurrents.

À écrire : un endpoint d'agrégation inverse, sous `RequireRole.for_roles('TRANSPORTER')`, croisant
les favoris reçus et les missions répétées avec le même client. Exposé dans les deux surfaces API,
livré avec son test.

**Arbitrage à confirmer** — sur l'onboarding, la cartographie recommande d'autoriser la publication
d'un retour **avant** vérification complète, avec mention « en cours de vérification ». Bloquer
derrière la vérification tarit l'inventaire, donc la promesse client. Décision produit, pas
technique.

**Fini quand** : les six écrans sont en ligne et aucun endpoint livré ne reste sans interface.

---

## 2. Ce qui reste hors périmètre, et pourquoi

| Élément | Raison |
|---|---|
| Contre-offres sur le flux classique (`offers/:id/counter/`) | Classé *Future* par le pivot. Backend livré, écart assumé |
| Trajets récurrents | *Future*. À rouvrir après validation du modèle simple par le pilote |
| Pièces jointes au chat | *Secondary*. Le chat texte suffit à la négociation |
| Comptes entreprise, facturation | Persona d'expansion, hors MVP selon la vision |
| Mode sombre métier complet | Option B du lot 0.3. À rouvrir après le lot 6 |
| Tests unitaires de composants | Hors périmètre choisi. Seuls les 3 parcours sont couverts |
| Matching v2 (haversine, détours) | *Future*. Optimisation prématurée tant que la liquidité par gouvernorat n'est pas prouvée |

## 3. Risques principaux

| Risque | Gravité | Parade |
|---|---|---|
| Le lot 4 régresse sur le parcours de négociation | **Élevée** | Ne pas commencer sans le lot 0.4. Extraction par gestionnaire, un commit chacun |
| ~~Le pré-remplissage véhicule n'existe pas~~ | **Levé** | Les champs existent (`trust/models.py:226-237`). Remplacé par le risque d'unité ci-dessous |
| Confusion kg / m³ entre backend et maquettes | **Élevée** | Trancher §4 décision 2 **avant** le lot 1. Un écran qui affiche des m³ sur une donnée en kg est un mensonge à l'utilisateur |
| La migration de `available_capacity` casse des trajets existants | Moyenne | Champ texte libre aujourd'hui : migration avec conservation de l'ancienne valeur en repli, et test de non-régression sur `test_parcours_retour.py` |
| Un nouvel endpoint oublie `/api/v1/` | Moyenne | Le mobile se désynchronise silencieusement. À inscrire dans la définition de fini de chaque tâche backend |
| Le bandeau d'amorce est perçu comme intrusif | Moyenne | Échappatoire et règle de non-répétition dès la conception |
| L'économie estimée n'est pas justifiable | Moyenne | Trancher la base de calcul avant de coder. Afficher la référence |
| Le renommage casse des liens externes ou des favoris | Faible | Redirections permanentes, conservées au moins six mois |
| Un lot glisse et décale les six suivants | Moyenne | Lots indépendamment déployables : en cas de glissement, on livre et on décale, on ne cumule pas |

## 4. Ordre des décisions à prendre

Trois décisions bloquent des lots. À trancher dans cet ordre.

| # | Décision | Bloque | État |
|---|---|---|---|
| 1 | Mode sombre : confiner ou brancher ? | Lot 0.3 | ✅ **Tranché le 26/08 — chantier annulé.** Seul le retrait du `ThemeToggle` métier subsiste |
| 2 | **Unité de capacité : kilogrammes ou mètres cubes ?** | Lot 1 | ✅ **Tranché le 26/08 — option (c), les deux.** `vehicle_capacity_kg` reste la contrainte réglementaire et la source de vérité ; un `vehicle_capacity_m3` **optionnel** est ajouté, parce que le volume est ce que l'utilisateur se représente (« mon frigo rentre-t-il ? »). Conséquences : migration sur `TrustProfile`, et l'interface n'affiche des m³ **que** si la donnée existe — jamais de conversion inventée depuis le poids |
| 3 | Base de calcul de l'économie estimée | Lot 3 | ✅ **Tranché le 26/08.** `estimate_price()` de `logistics/pricing.py` avec `PricingGrid`, et **affichage de la base de comparaison** à côté du chiffre. Jamais un montant nu |
| 4 | Publication d'un retour avant vérification complète ? | Lot 6 | ✅ **Tranché le 26/08 — autorisée**, avec mention explicite du statut « en cours de vérification » sur le trajet publié. Bloquer tarirait l'inventaire, donc la promesse client |

**Toutes les décisions bloquantes sont tranchées.** Les lots 1 à 6 peuvent s'enchaîner sans nouvel
arbitrage produit.

## 5. À revalider avec Context7 avant implémentation

Rappel de la limite du §0.3, pour ne pas la perdre en route :

- Lot 0.2 — clé `redirects` de `next.config.mjs`, sémantique `permanent`
- Lot 0.3 — référence des couleurs Tailwind vers des variables CSS avec `darkMode: "class"`
- Lot 4 — conventions App Router : frontière serveur / client, colocation des hooks, emplacement de la couche d'accès aux données
