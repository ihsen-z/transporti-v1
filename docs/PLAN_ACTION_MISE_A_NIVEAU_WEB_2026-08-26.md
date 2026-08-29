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
| 0.2 Renommer les routes — **vague B** (7 routes restantes) | ✅ **fait** | `cb0d6d0` | 11 redirections vérifiées en `308`, 11 nouvelles routes en `200`, `next build` vert |
| 0.3 Annuler le mode sombre métier | ✅ **fait** | `cb66d5b` | `ThemeToggle` retiré d'`AppSidebar` + `ForceLightTheme` dans les deux layouts |
| 0.4 Socle Playwright — projet **`routage`** | ✅ **fait, actif en CI** | `731bc29` | **34 tests, 1,6 s**, sans binaire de navigateur ni backend |
| 0.4 Socle Playwright — projet **`parcours`** | ✅ **exécutable** | `731bc29`, `05109e6` | Décision 5 tranchée voie A : Chromium installé, étape de CI avec cache. Reste non bloquant tant qu'aucun backend de recette n'est joignable |
| 0.4 Socle Playwright — projet **`selecteurs`** | ✅ **fait, bloquant en CI** | `05109e6` | **3 tests verts dans Chromium.** Garde-fou des `data-testid`, sans backend |
| 0.5 Recette visuelle en arabe | ⏳ à faire | — | Demande un œil humain, non automatisable |

#### Comment 0.4 a été livré à moitié, sans trancher la décision 5

Le téléchargement du binaire Chromium (~150 Mo) ayant été refusé le 26/08, le socle a été **scindé en
deux projets Playwright séparés par ce qu'ils exigent pour tourner**. Cela permet d'encaisser la
moitié de la valeur immédiatement, sans préjuger de la décision.

**Projet `routage` — actif, bloquant en CI.** N'utilise que la fixture `request` de Playwright, donc
la pile HTTP de Node : **aucun navigateur, aucun backend**. Il vérifie les 11 redirections en `308`
vers la bonne cible, les 11 destinations, l'absence de survivance des anciennes routes, et — garde-fou
issu de l'incident du 26/08 — **qu'aucune route de page francisée n'a fuité dans un chemin `/api/`**.
Branché dans `frontend-ci.yml` comme étape bloquante.

**Projet `parcours` — écrit, en attente.** Les 3 parcours critiques. Les tests visant des écrans
encore inexistants sont marqués `fixme` et **deviennent la définition de fini des lots 1 à 3** : un
lot est terminé quand ses tests passent sans modification. Les tests s'auto-ignorent avec un message
explicite quand le backend est absent, plutôt que d'échouer pour une mauvaise raison.

**Ce que cela ne règle pas.** Le projet `parcours` ne s'exécute pas sans le binaire. Le lot 4 reste
donc **sans filet réel** : l'intégrité de routage ne couvre aucun gestionnaire d'API. La décision 5
demeure ouverte, mais son coût a baissé — il ne reste plus qu'à installer le binaire et lever les
`fixme`, tout le code de test est écrit.

#### Convention de sélecteurs retenue pour les tests web

Reprise de celle du mobile (lots L6.5 et L6.7) plutôt que d'en inventer une seconde :
`data-testid="<ecran>-<element>"` en kebab-case — par exemple `recherche-depart`,
`retours-nouveau-submit`, `demandes-recues-accepter`. Le mobile utilise déjà
`testID="change-password-submit"`, `testID="edit-profile-phone"`.

**Dette créée par 0.4, à payer dans les lots 1 à 3** : les écrans existants ne portent pas encore ces
attributs. Chaque lot doit les poser sur les écrans qu'il touche, sans quoi les tests `parcours`
échoueront sur des sélecteurs absents et non sur de vrais défauts.

#### Convention de sélecteurs retenue pour les tests web

Reprise de celle du mobile (lots L6.5 et L6.7) plutôt que d'en inventer une seconde :
`data-testid="<ecran>-<element>"` en kebab-case — par exemple `recherche-depart`,
`retours-nouveau-submit`, `demandes-recues-accepter`. Le mobile utilise déjà
`testID="change-password-submit"`, `testID="edit-profile-phone"`.

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

### Lot 0 · **terminé, à une réserve près**

Cinq tâches sur six sont livrées. Il reste **0.5**, la recette visuelle en arabe, qui demande un œil
humain, et la moitié « navigateur » de 0.4, suspendue à la décision 5.

**Le lot 1 peut démarrer.** Sa définition de fini est déjà écrite, sous forme de tests `fixme` dans
`e2e/parcours-a-retour-capte.spec.ts` : l'amorce de fin de mission (T4.4) et l'inventaire des trajets
publiés (T1.3). Première tâche du lot : les trois éléments backend B-1, B-2 et B-3a, puisque les
écrans en dépendent.

### Lot 1 — Le retour à vide capté · ✅ **TERMINÉ**

| Tâche | État | Commit | Preuve |
|---|---|---|---|
| **B-1** Volume de véhicule optionnel | ✅ **fait** | `24425cd` | `TrustProfile.vehicle_capacity_m3`, migration `trust/0011` |
| **B-2** Capacité disponible structurée | ✅ **fait** | `24425cd` | `available_capacity_kg` + `_m3`, migration `logistics/0015`, 6 sérialiseurs |
| **B-3a** Km à vide valorisés, taux de remplissage | ✅ **déjà en place** | — | **Constat corrigé, voir ci-dessous** |
| **B-3b** Revenu par corridor | ✅ **fait** | `24425cd` | `logistics/stats_corridors.py`, réconciliation avec K4 sous test |
| T4.4 Amorce de fin de mission — **web** | ✅ **fait** | `0cc0682` | Composant autonome, deux garde-fous, correspondance de gouvernorat tolérante |
| T4.4 Amorce de fin de mission — **mobile** | ✅ **fait** | `95fa62a` | Sur l'Accueil : le transporteur n'a pas de détail de mission sur mobile |
| T1.2 Publier un retour — **web** | ✅ **fait** | `05109e6` | Capacité structurée envoyée, 2 saisies rendues tactiles, `data-testid` posés |
| T1.2 Publier un retour — **mobile** | ✅ **fait** | `5590520` | Hook jumeau du web, 125 tests mobile verts, lint propre |
| T1.3 Inventaire des trajets publiés — **web** | ✅ **fait** | `8acce1a` | Pur frontend. Test `fixme` levé, l'inventaire devient exigible |
| T1.3 Inventaire des trajets publiés — **mobile** | ✅ **fait** | `cc7c8b2` | 125 tests mobile verts, lint propre. Écran hors barre d'onglets, choix assumé |
| T1.1 Hub « Mes retours » — **web + mobile** | ✅ **fait** | `5255baa` | Section extraite des deux côtés, km valorisés, retours en ligne |

**173 tests backend passent**, dont 13 nouveaux. Aucune régression. Côté web : 34 tests de routage,
3 tests de sélecteurs, `tsc --noEmit` propre.

#### Deuxième correction du même constat — le « risque n° 1 » était faux deux fois

Le plan initial classait en risque **élevé** l'absence de pré-remplissage du véhicule, dont dépend
la promesse des 30 secondes. Ce risque a été démenti en deux temps :

1. L'analyse backend a montré que les champs existaient (`trust/models.py:226-237`).
2. L'implémentation a montré que **le frontend les consommait déjà** — un bloc `Sprint 5 (H2)`
   dans `retours/nouveau/page.tsx` allait chercher `vehicle_type` et `vehicle_capacity_kg`.

Le vrai défaut était ailleurs, et plus subtil : le pré-remplissage était **lossy**. Le poids était
concaténé dans le libellé texte (`"800 kg"`) et **jamais transmis comme donnée structurée**. Le
matching quantitatif restait donc impossible malgré des données présentes de bout en bout.

**Leçon pour les lots suivants** : sur ce projet, un besoin déclaré manquant est souvent implémenté
à 80 %. Vérifier l'existant avant d'estimer — deux fois de suite, l'estimation initiale portait sur
du travail déjà fait.

#### Ce que T1.2 a réellement livré côté web

- `hooks/useVehiclePrefill.ts` — extraction hors d'une page de 562 lignes (CLAUDE.md §4), lecture du volume en plus du poids, et **aucune déduction de l'un vers l'autre**
- `available_capacity_kg` / `_m3` transmis au backend, en plus du libellé texte qui reste la description lisible
- Saisie 3 (date) et saisie 4 (capacité) rendues **tactiles** ; une saisie libre reprend la main et annule la déduction structurée, faute de pouvoir lire un texte arbitraire
- `data-testid` posés sur l'écran de publication et sur la connexion

**Reste ouvert sur T1.2** : après publication, la redirection va vers `/jobs` — elle devra pointer
vers `/retours`, l'inventaire, dès que T1.3 existera.

#### T1.2 mobile — premier écran livré des deux côtés

La décision 6 s'applique pour la première fois. Le mobile reçoit un **hook jumeau**
(`mobile/src/features/trips/components/publish/useVehiclePrefill.ts`, pendant de
`frontend/hooks/useVehiclePrefill.ts`) à la sémantique volontairement identique.

**Ce que cette symétrie évite concrètement** : deux règles différentes sur la part de capacité
produiraient deux chiffres différents pour le même trajet selon la plateforme de publication. C'est
précisément la divergence que la décision 6 cherche à supprimer, et elle se serait installée
silencieusement.

Deux bonnes surprises côté mobile : `useTrustStatus` fournissait déjà le véhicule — **aucun nouvel
appel d'API** — et la structure en petits fichiers (`publish/` : 6 fichiers, 580 lignes au total)
a rendu l'ajout net, là où le web imposait d'extraire un hook d'une page de 562 lignes.

**Coût réel de la livraison simultanée sur cet écran** : environ 35 % du temps du web, sous
l'estimation de 40 % retenue au §4. À reconfirmer sur T4.4, plus lourd.

#### T1.3 web — troisième fois que l'existant couvre plus que prévu

L'inventaire était estimé comme un chantier mêlant backend et frontend. Il s'est révélé **du pur
frontend** : `jobs/transporter/?type=owned` fournit la liste, `ReturnTripManageView` porte l'édition
(PATCH) et la dépublication (DELETE, suppression douce qui rejette et notifie les demandes en
attente). « Prolonger » n'est qu'un PATCH de `scheduled_time`, « dupliquer » un POST ordinaire.

C'est le **troisième** constat du même type après B-3a et le pré-remplissage du véhicule. La leçon
inscrite au §journal tient et doit être appliquée systématiquement : sur ce projet, vérifier
l'existant **avant** d'estimer.

**Décisions d'interface prises et pourquoi**

- L'expiration est affichée en clair, avec trois tons selon l'urgence. Un trajet qui expire sans que le transporteur s'en aperçoive disparaît **silencieusement** de la recherche — c'est le défaut que cet écran doit rendre impossible, pas seulement signaler.
- « Dépublier » est destructif et notifie les clients en attente. Traité en dernier, en texte seul, jamais au même poids visuel que les trois autres actions, et sa conséquence est annoncée **avant** dans la confirmation.
- `getMyReturnTrips` filtre sur `is_return_trip` **malgré** `?type=owned` : si le paramètre était un jour ignoré, l'endpoint renverrait l'union avec les missions assignées et l'inventaire afficherait des objets étrangers.

**Deux points de couture réglés au passage** : la redirection après publication pointe enfin vers
`/retours` (elle allait provisoirement vers `/jobs`), et « Mes retours » passe **en tête** de la
navigation transporteur — application d'IA-2, le retour étant la racine du transporteur et non une
entrée parmi d'autres. « Compléter mon aller » descend en secondaire, conformément au pivot.

`lib/services/returnTrips.ts` est le **premier fichier de service par domaine** du projet. Le lot 4
pourra modeler dessus l'extraction des autres domaines.

#### T1.3 mobile — une contrainte de charte qui déplace le point d'entrée

La barre transporteur porte **4 onglets plus le bouton central**, réparti en deux moitiés autour de
lui. Un cinquième onglet casserait cette mise en page. L'inventaire est donc déclaré `href: null` :
il existe et reste adressable, mais s'atteint depuis l'écran de publication — ce qui correspond au
parcours réel, puisqu'on y vient après avoir publié — et le sera depuis l'Accueil quand T1.1 livrera
le hub.

**Écart assumé avec le web**, où « Mes retours » est passé en tête de la barre latérale. Les deux
plateformes n'ont pas la même contrainte d'espace ; ce qui doit rester identique, c'est le
comportement de l'inventaire, pas son point d'entrée.

**Une confirmation utile** : le commentaire de `useMyMissions` documentait déjà le piège du
paramètre `type` (bug 5.1 — sans lui, l'endpoint renvoie l'union missions + retours, paginée à 20).
Le filtre défensif sur `is_return_trip` ajouté côté web répondait donc à un problème **déjà
rencontré sur ce projet**, pas à une précaution théorique.

**Le typecheck a rattrapé trois hypothèses fausses** sur les conventions mobile : variant
`secondary` inexistant (c'est `ghost`), `colors.white` inexistant (c'est `neutral[0]`), `spacing.3xl`
et `neutral[600]` inexistants. Rappel que les deux plateformes ne partagent pas leur design system —
relever les valeurs réelles avant d'écrire, ne pas transposer celles du web.

#### T4.4 — l'écran de priorité 1, livré des deux côtés

**Une différence structurelle découverte en implémentant.** Sur mobile,
`mission/[id]` est un écran **client** — payer, confirmer la réception, noter — atteint depuis
`MyRequestCard`. Le transporteur n'a **aucun détail de mission**. L'amorce ne pouvait donc pas vivre
au même endroit qu'au web ; l'Accueil est son seul point de passage après une livraison, et
`CompletedMissionsList` y établissait déjà le contexte.

Deuxième fois qu'une contrainte de plateforme déplace un point d'entrée sans changer le
comportement, après l'inventaire. La règle se confirme : **ce qui doit rester identique entre
plateformes, c'est le comportement, pas l'emplacement.**

**Un défaut silencieux évité de justesse.** Le backend stocke `pickup_governorate` en texte libre.
Une comparaison stricte avec la liste des gouvernorats aurait échoué sur « Gabes » sans accent — et
échoué **sans aucune erreur visible** : le formulaire se serait ouvert vide, l'amorce aurait
simplement déplacé la saisie au lieu de la supprimer, et T4.4 aurait été vidé de son sens sans que
rien ne le signale. Résolu des deux côtés par une correspondance insensible à la casse et aux
accents (`localeCompare` avec `sensitivity: "base"`), et couvert par 4 tests côté mobile.

C'est le type de défaut que ni le typecheck ni un test de parcours ne rattrapent : il faut l'avoir
anticipé.

**Le typecheck a rattrapé deux nouvelles transpositions du web** (`appStorage.set` au lieu de
`setString`, nuance `cta[700]` inexistante), après les trois de T1.3. Le constat est désormais
systématique et vaut consigne pour les lots suivants.

#### T1.1 — le lot 1 est clos

Le hub passe de « mes missions » à « mes retours », des deux côtés. Trois blocs, dans l'ordre de ce
qui rapporte : l'amorce conditionnelle, les kilomètres valorisés, les retours en ligne.

**Point de cohérence important** : l'amorce du hub réutilise le **même composant et la même clé de
refus** que celle de l'écran de mission (T4.4). Refuser à un endroit masque aux deux. Sans cela, un
transporteur ayant écarté l'amorce sur sa mission la retrouverait sur son accueil — et elle
deviendrait exactement la relance que les deux garde-fous cherchent à éviter.

**Une cause racine enfin identifiée.** Le symptôme `implicit any` sur `.filter` revenait depuis
T1.3. Ce n'était ni la clé de requête ni l'inférence du hook — les deux écartés par élimination —
mais `data ?? []`, qui produit une union `T[] | never[]` : TypeScript ne résout pas la signature de
`.filter` sur une union de types tableau. Corrigé et documenté sur place, pour que le prochain
développeur ne refasse pas la même recherche.

#### Bilan du lot 1

| Livrable | Web | Mobile |
|---|---|---|
| B-1 Volume de véhicule optionnel | ✅ backend commun | ✅ |
| B-2 Capacité structurée | ✅ backend commun | ✅ |
| B-3b Ventilation par corridor | ✅ backend commun | — *(consommé au lot 5)* |
| T1.2 Publier un retour | ✅ | ✅ |
| T1.3 Inventaire | ✅ | ✅ |
| T4.4 Amorce de fin de mission | ✅ | ✅ |
| T1.1 Hub « Mes retours » | ✅ | ✅ |

**Le parcours A est complet de bout en bout** : mission livrée → amorce → publication en 4 saisies →
inventaire. C'est le parcours qui porte la métrique unique.

**Réserve levée le 27/08** : les tests du parcours A ont été exécutés contre un backend réel.
**4 sur 4 passent.** Le détail et les défauts trouvés sont en §Recette ci-dessous.

**Trois estimations sur quatre étaient trop hautes** (B-3a déjà fait, pré-remplissage déjà fait,
T1.3 pur frontend). La règle inscrite au plan — vérifier l'existant avant d'estimer — vaut pour les
lots suivants, dont les durées sont probablement surévaluées de la même façon.

#### Recette du 27/08 — première exécution contre un backend réel

Backend démarré, migrations du lot 1 appliquées, base peuplée. **Parcours A : 4 tests sur 4.**

| Suite | Résultat |
|---|---|
| Backend (logistics, trust, payments, users) | **194 passent** |
| Playwright `routage` | **34 passent** |
| Playwright `selecteurs` | **4 passent** |
| Playwright `parcours` A — le retour capté | **4 passent** |
| Playwright `parcours` B et C | 6 échouent, 3 ignorés — écrans des lots 2 et 3 |

Les 6 échecs visent `recherche-depart`, `expeditions-onglet-negociation` et
`dashboard-demandes-en-attente` : des sélecteurs sur des écrans non construits. **Aucune régression
sur le lot 1.**

**Trois défauts trouvés, dont deux invisibles à la relecture.**

**1. La fixture E2E n'aurait jamais rien testé.** Elle sondait `/api/health/`, qui répond 404 —
`/health/` est monté à la racine. Les parcours se seraient **ignorés en silence** même avec un
backend disponible, et le socle aurait paru vert sans rien vérifier. Les comptes de test étaient de
même inventés plutôt que repris de `seed_test_data`.

*C'est le défaut le plus instructif du lot* : un test qui s'auto-ignore proprement ressemble
exactement à un test qui n'a rien à signaler. Un socle de tests doit être vérifié en conditions
réelles avant qu'on lui fasse confiance.

**2. « Aujourd'hui » posait une heure déjà passée.** Le bouton de choix rapide posait 8 h 00 ;
passé le petit matin, le champ refusait la valeur et la publication échouait **sans message**. Or
c'est précisément le cas d'usage visé — un transporteur qui vient de livrer et rentre maintenant,
souvent en fin de journée. Les deux chemins divergeaient de surcroît : le bouton posait 8 h, le
paramètre d'URL +3 h.

**3. L'amorce affichait une adresse au lieu d'un gouvernorat.** Le repli sur l'adresse produisait
« Vous rentrez à Rue de Marseille, La Marsa à vide ? » et menait à un **formulaire vide**. Une
amorce qui n'économise aucune saisie est pire qu'une absence d'amorce : elle promet 30 secondes et
n'en tient rien.

**Le jeu de test était aussi en cause** : une seule mission terminée sur 516 jobs, et sans
gouvernorats — le cœur du pivot était donc intestable. Corrigé à la source dans `seed_test_data`.

**Conséquence pour le lot 4** : le filet est désormais réel sur le parcours A, mais **le parcours C
reste sans couverture** — or c'est lui qui traverse les 12 gestionnaires de `jobs/[id]/page.tsx`. Le
lot 2 doit donc précéder le lot 4, ce que l'ordre du plan prévoit déjà, mais pour une raison
supplémentaire : sans T2.1, le refactor du lot 4 se ferait toujours partiellement à l'aveugle.

#### Lot 2 — B-5, l'endpoint qui manquait

`trip-requests/my/` existait côté **client** ; aucun vis-à-vis ne permettait au transporteur de
lire ses demandes tous trajets confondus. `ReceivedTripRequestsView` le fournit.

Deux choix à retenir : le filtre porte sur `job__owner` et non sur les offres — sur un trajet
retour, le transporteur est le **propriétaire** du job et le client n'y est rattaché que par sa
demande. Et `?status=` **valide ses valeurs** au lieu de les passer brutes : un statut inconnu
renverrait sinon une liste vide, indistinguable d'une absence de demandes — un compteur à zéro qui
ment. Il renvoie 400.

6 tests, dont un qui vérifie l'exposition sur `/api/v1/` : la règle des deux surfaces est désormais
testée, plus seulement écrite.

#### Défaut que j'avais introduit au lot 1, corrigé

Mon `trips/api/useMyReturnTrips.ts` doublonnait un `requests/api/useMyReturnTrips.ts` préexistant —
**même clé react-query `['myReturnTrips']`**, filtre et forme différents. Deux hooks sur une même
clé, c'est le premier monté qui gagne le cache et l'autre qui reçoit des données mal filtrées.
L'ancien ne lisait de surcroît que la première page, le bug 5.1 qu'il citait pourtant lui-même.

Consolidé sur un hook unique. **Leçon** : avant de créer un fichier dans une base que l'on connaît
mal, chercher le nom qu'on s'apprête à employer. Le coût de la vérification est nul, celui de la
collision de cache est invisible jusqu'à ce qu'il ne le soit plus.

#### Enseignement de méthode — la parité i18n est un coût récurrent

Trois clés ajoutées côté mobile, en français **et** en arabe. Le projet maintient une parité stricte
(1 770 clés FR contre 1 767 AR côté web). Chaque écran des lots suivants portera ce coût : à ne pas
oublier dans les estimations, et à vérifier avant chaque livraison.

#### Correction d'un constat de l'audit — B-3a n'était pas manquant

L'analyse backend du 26/08 annonçait que les KPI du pivot étaient absents. **C'était faux pour deux
d'entre eux.** `logistics/stats.py` expose déjà `km_transformed` (somme de `distance_km` sur les
retours `COMPLETED`) et `fill_rate`, servis par `transporter/stats/` et `auth/dashboard/`.

L'erreur : j'avais examiné `CrossMetricsView` (`metrics/dashboard/`), qui est un tableau de bord
**générique par rôle** et ne porte effectivement pas ces indicateurs — sans vérifier l'autre endpoint
de statistiques. Seule la **ventilation par corridor** manquait réellement.

Conséquence : B-3 était surestimé d'environ 1,5 jour. Le gain est réinvesti dans la partie
prospective de T5.4 (`underserved_corridors`), qui n'était pas prévue au plan initial et qui
transforme un écran rétrospectif en invitation à publier.

#### Découverte à retenir — `stats.py` porte un contrat explicite

> *« Every figure shown to a transporter anywhere in the product MUST come from
> `get_transporter_stats()` … Frontends must never recompute these. »*

Ce contrat, adossé à `docs/DICTIONNAIRE_KPI.md`, est plus strict que ce que le plan supposait. Deux
conséquences pour les lots suivants : **aucun chiffre affiché à un transporteur ne peut être calculé
côté frontend**, et tout nouvel indicateur doit passer par `get_transporter_stats()` et être ajouté
au dictionnaire. C'est pourquoi `stats_corridors.py` est un module séparé mais **appelé depuis**
`get_transporter_stats`, et non exposé directement.

### Lot 2 — La boîte de réception transporteur · **en cours**

| Tâche | État | Commit | Preuve |
|---|---|---|---|
| **B-5** Endpoint transverse des demandes reçues | ✅ **fait** | `56c2da7` | 6 tests, dont l'exposition sur `/api/v1/` |
| **T2.1** Boîte de réception — **web** | ✅ **fait** | `199b302` | Test de consolidation vert contre backend réel |
| **T2.1** Boîte de réception — **mobile** | ⏳ à faire | — | L'écran actuel liste les trajets, à transformer |
| **T4.1** Missions segmentées — web + mobile | ⏳ à faire | — | — |

#### Un défaut d'infrastructure de test, trouvé au passage

T2.1 passait **seul** mais échouait en exécution complète, avec une erreur qui ressemblait à un
défaut fonctionnel : le test s'arrêtait sur `/login`.

Cause réelle : les parcours se connectent tous aux **mêmes comptes** de `seed_test_data`, et
`LoginView` porte `AuthRateThrottle`. Avec plusieurs workers, la limitation se déclenche. Les
parcours partagent de surcroît un **unique jeu de données**, ce qui les rendait dépendants de leur
ordre d'exécution.

Configuration passée à **un seul worker**. La piste `storageState` — se connecter une fois et
réutiliser la session — est notée pour le jour où la suite s'allongera.

**Deuxième fois** qu'un problème du socle de tests se déguise en défaut produit, après la fixture
qui sondait la mauvaise URL de santé. Un socle de tests demande la même défiance qu'un code métier.

#### Le test T2.1 vérifiait la mauvaise chose

Sa première version vérifiait qu'un onglet s'affiche avec un compteur. Il serait passé sur un écran
n'affichant **qu'un seul trajet** — c'est-à-dire sur l'ancien comportement, celui que T2.1 remplace.
Il vérifie désormais la **consolidation** : deux demandes posées sur deux trajets différents doivent
apparaître dans la même liste.

### Lots 3 à 6 · **non démarrés**

**Toutes les décisions du plan sont tranchées**, produit comme méthode. Les lots 2 à 6 peuvent
s'enchaîner sans nouvel arbitrage.

**Prochain lot** : le 2, la boîte de réception transporteur. Rappel du §1bis — le mobile porte
**déjà** cet écran (`app/(app)/requests/index.tsx` et `[jobId].tsx`). Le lot 2 est donc une
**transposition vers le web**, pas une création, et c'est le seul lot que la décision 6 n'allonge
pas.

**Prérequis non technique à traiter en parallèle** : monter un backend de recette joignable, sans
quoi les tests du parcours A resteront non exécutés et le filet du lot 4 restera théorique.

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

**B-3 — les KPI du pivot sont partiellement exposés.**

> **Constat corrigé le 26/08, après implémentation.** La version initiale de ce paragraphe concluait
> que les KPI du pivot étaient tous absents. C'était faux : `logistics/stats.py` expose déjà
> `km_transformed` et `fill_rate` via `transporter/stats/`. Seule la ventilation par corridor
> manquait. L'erreur venait d'avoir examiné un seul des deux endpoints de statistiques. Le texte
> ci-dessous reste valable **pour `CrossMetricsView` uniquement**.

`CrossMetricsView`
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

## 1bis. Et l'application mobile ?

**Question posée le 26/08. Réponse : ce plan ne couvre que le web.** Ce n'était pas un choix
raisonné — le périmètre a été fixé à `frontend/` dès l'audit initial, et personne ne l'a
rouvert depuis. C'est une omission, et voici ce qu'elle implique.

### Ce qui n'est pas un problème

**Le renommage des routes du lot 0.2 n'a aucun impact sur le mobile.** Vérifié : le mobile consomme
**exclusivement `/api/v1/`** (28 endpoints relevés dans `mobile/src`), et le lot 0.2 n'a renommé que
des routes de **pages web**, jamais un chemin d'API. Le mobile ne référence aucune URL de page web.

**La contrainte de double surface API est déjà dans ce plan** (§0.4) : tout nouvel endpoint doit être
exposé dans `/api/` **et** `/api/v1/`. Elle protège précisément le mobile.

### Ce qui est un vrai problème — trois points

**M-1 — Les quatre tâches backend servent les deux applications, mais le plan n'ordonnance qu'un
seul consommateur.** B-1 (véhicule et unités), B-2 (capacité structurée), B-3 (KPI du pivot) et B-4
(favoris à l'envers) sont des tâches backend uniques dont le mobile a exactement le même besoin. Les
faire au titre du web est efficace ; ne planifier que l'écran web qui les consomme laisse le mobile
en attente sans que ce soit écrit nulle part.

**M-2 — Cinq écrans du pivot manquent sur les deux applications.** Mesuré sur `mobile/app` et
`mobile/src` :

| Écran du delta | Web | Mobile |
|---|---|---|
| T4.4 Fin de mission → amorce de retour | ❌ | ❌ *(0 occurrence de l'amorce)* |
| T1.3 Mes trajets publiés (inventaire) | ❌ | ❌ |
| T5.4 Performance retours | ❌ | ❌ *(0 occurrence de `metrics`)* |
| C1.2 Économie estimée | ❌ | ❌ *(0 occurrence d'économie ou de gain)* |
| T5.5 / C5.3 Favoris et clients fidèles | ❌ | ❌ *(0 occurrence de `favorite`)* |

Le risque n'est pas le retard, c'est la **divergence** : deux implémentations séparées du même écran
d'amorce, avec deux règles de non-répétition différentes et deux calculs d'économie différents.

**M-3 — Le mobile est en avance sur deux écrans, et le plan web prévoit de les réinventer.**

| Écran | Mobile | Web |
|---|---|---|
| Alertes corridor (C1.7) | ✅ **complet** — `CorridorAlertsPanel.tsx`, `CorridorAlertRow.tsx`, `useCorridorAlerts.ts`, `useCreateCorridorAlert.ts`, `useDeleteCorridorAlert.ts` | ❌ à créer, priorité 6 du delta |
| Demandes reçues consolidées (T2.1) | ❌ **constat erroné, corrigé le 27/08** — l'écran mobile liste les *trajets*, pas les demandes | ❌ à créer, priorité 3 du delta |

> **Correction du 27/08.** La ligne T2.1 ci-dessus était fausse, et je l'ai vérifiée trop vite en
> me fiant au nom des fichiers. L'écran mobile « Demandes reçues » liste les **trajets** du
> transporteur ; il faut en taper un pour voir ses demandes — exactement le motif « trajet par
> trajet » que T2.1 doit remplacer. Son propre commentaire le disait.
>
> **Conséquence** : le lot 2 n'est pas une transposition mais une création, et il exige un
> **cinquième chantier backend** (B-5), non prévu. Il s'allonge donc, contrairement à ce
> qu'annonçait le tableau du §4.

Le mobile a donc déjà résolu **un** problème que le plan web traitait comme neuf — les alertes
corridor. **Le lot 3 doit transposer cette implémentation, pas en écrire une autre.**

### Ajustement retenu

Ce plan **reste un plan web** — l'élargir maintenant à un plan bi-plateforme le rendrait illisible,
et un plan mobile existe déjà (`docs/PLAN_ACHEVEMENT_MOBILE_2026-08-07.md`, lots L0 à L5 et L6.5
livrés au 25/08, reste de L6 bloqué sur des comptes externes). Trois règles suffisent à supprimer le
risque de divergence :

1. **Toute tâche backend de ce plan (B-1 à B-4) est livrée pour les deux surfaces API et marquée
   comme servant aussi le mobile.** Déjà la règle, désormais explicite.
2. **Tout écran du delta absent des deux applications est spécifié une seule fois** — dans le brief
   de design — avec ses deux déclinaisons. Le calcul de l'économie estimée et la règle de
   non-répétition de l'amorce sont définis côté backend ou dans un module partagé, jamais deux fois.
3. **Les lots 2 et 3 commencent par lire l'implémentation mobile existante** (`CorridorAlertsPanel`,
   `requests/index`) et la transposer. Ajouté à la définition de fini de ces lots.

**Reste à décider** — faut-il un lot 7 « rattrapage mobile » qui porte les cinq écrans manquants sur
le mobile après le lot 6, ou bien chaque écran est-il livré sur les deux plateformes au sein de son
lot ? La seconde option évite la divergence mais allonge chaque lot d'environ 40 %. **Question
ouverte, à trancher avant le lot 1.**

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

| 5 | **Voie retenue pour le socle de tests (lot 0.4)** | Lot 4 | ✅ **Tranchée le 26/08 — voie A, Playwright complet.** Décision déléguée puis prise : c'est le seul filet possible pour le lot 4, et le code de test était déjà écrit. Chromium installé, étape de CI avec cache sur `package-lock.json`. Le lot 4 a désormais sa parade |
| 6 | **Portée mobile : un lot 7 de rattrapage, ou chaque écran livré sur les deux plateformes ?** | Lot 1 | ✅ **Tranché le 26/08 — chaque écran est livré sur les deux plateformes, au sein de son lot.** La divergence est le risque réel ; on paie pour l'éliminer à la source plutôt que de la rattraper. Ce plan cesse donc d'être un plan web : il devient bi-plateforme |

#### Conséquence de la décision 6 sur le calendrier — à assumer

La livraison simultanée allonge chaque lot fonctionnel d'environ 40 %. Avec un développeur à temps
plein, l'horizon passe de **12 à environ 16 semaines** — au-delà des 3 mois initialement évoqués.

**Ce n'est pas une dérive, c'est le prix d'une décision prise en connaissance de cause.** Trois
options si les 3 mois redeviennent contraignants : réduire le nombre d'écrans du delta plutôt que la
qualité de chacun ; livrer les lots 5 et 6 en web seul et rattraper le mobile après ; ou renforcer la
capacité. À rouvrir seulement si une date externe l'impose.

| Lot | Durée initiale (web seul) | Durée révisée (deux plateformes) |
|---|---|---|
| 1 — Le retour à vide capté | 3 semaines | **4 semaines** |
| 2 — Boîte de réception transporteur | 1 semaine | **1 semaine** *(le mobile a déjà l'écran, simple transposition inverse)* |
| 3 — Conversion client | 2 semaines | **3 semaines** |
| 4 — Dette architecturale | 2 semaines | 2 semaines *(web uniquement, le mobile n'a pas cette dette)* |
| 5 — Argent et réputation | 2 semaines | **3 semaines** |
| 6 — Rétention et acquisition | 1 semaine | **2 semaines** |
| **Total** | 12 semaines | **16 semaines** |

Le lot 2 ne s'allonge pas : le mobile porte déjà la boîte de réception consolidée, c'est le web qui
rattrape. Le lot 4 non plus : la dette de `jobs/[id]/page.tsx` est purement web.

Les décisions **produit** sont toutes tranchées. Deux décisions **de méthode** restent ouvertes (5 et 6)
et conditionnent respectivement le lot 4 et le lot 1.

## 5. À revalider avec Context7 avant implémentation

Rappel de la limite du §0.3, pour ne pas la perdre en route :

- Lot 0.2 — clé `redirects` de `next.config.mjs`, sémantique `permanent`
- Lot 0.3 — référence des couleurs Tailwind vers des variables CSS avec `darkMode: "class"`
- Lot 4 — conventions App Router : frontière serveur / client, colocation des hooks, emplacement de la couche d'accès aux données
