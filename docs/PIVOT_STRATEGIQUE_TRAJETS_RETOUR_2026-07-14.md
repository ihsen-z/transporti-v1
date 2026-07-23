# PIVOT STRATÉGIQUE — « RETURN TRIPS FIRST »
## Transporti V1 · Réévaluation produit et roadmap régénérée

**Date :** 14 juillet 2026 · **Révision 1.1 :** 17 juillet 2026 (alignement sur le document fondateur) · **Révision 1.2 :** 22 juillet 2026 (chantier financier K1/K2/L1/L2 clôturé, REC-P repris — §7.2)
**Nature :** revue stratégique — aucun code dans ce document
**Document de référence supérieur :** `VISION_PRODUIT_FONDATRICE.md` (v1.0) — ce pivot en est la déclinaison opérationnelle.
**Documents liés :** Audit (`AUDIT_PARCOURS_TRANSPORTEUR_2026-07-14.md`) · Plan de remédiation (`PLAN_EXECUTION_REMEDIATION_TRANSPORTEUR_2026-07-14.md`) · Décisions (`DOSSIER_DECISIONS_SPRINT0.md`) · KPI (`DICTIONNAIRE_KPI.md`) · Recette (`RECETTE_PARCOURS_TRANSPORTEUR.md`)
**Base factuelle :** état réel du code vérifié (audit GUI 13–14/07, investigations Sprint 0, Sprints 1-2 livrés, vérifications complémentaires sur le module trajets retour).

---

# 0. ALIGNEMENT SUR LE DOCUMENT FONDATEUR (révision 1.1)

La vision officielle v1.0 **confirme intégralement** l'orientation de ce pivot (Principe n°1 : « les retours à vide constituent le cœur du modèle économique ») et y ajoute quatre exigences que cette révision intègre :

| Apport de la vision | Conséquence opérationnelle | Où |
|---|---|---|
| **North Star Metric : « kilomètres de retour à vide transformés en kilomètres chargés »** (remplace le « taux de remplissage » comme NSM ; celui-ci reste un KPI de liquidité) | Instrumenter la **distance** : calcul haversine × 1,25 stocké sur chaque mission à la création (champ additif `distance_km`), agrégé sur les missions issues de trajets retour menées à terme et payées | Sprint 3 (instrumentation), Sprint 5 (agrégats) ; `DICTIONNAIRE_KPI.md` v2 (K-NSM) |
| **Catégorie KPI « Impact »** : km à vide économisés, tonnes CO₂ évitées, revenus additionnels transporteurs | Facteur d'émission paramétrable (kg CO₂/km par type de véhicule) ; bloc Impact sur le dashboard admin ; base des futurs rapports publics | Sprint 5 (calcul + admin), Sprint 8 (restitution) ; K-I1…K-I3 |
| **Corridor prioritaire nommé : A1 (Tunis – Sousse – Sfax – Gabès)** | Le pilote cible le corridor A1 entier (4 gouvernorats, paires orientées) au lieu des deux paires initialement proposées | §8 Phase C (mis à jour) |
| **Principes Produit = porte de gouvernance** : toute fonctionnalité doit améliorer ≥ 1 des 6 questions officielles (retours publiés, matching, remplissage, temps de mise en relation, confiance, simplicité) | Checklist obligatoire inscrite au registre de décisions ; chaque lot des Sprints 3+ est annoté du principe qu'il sert | `DOSSIER_DECISIONS_SPRINT0.md` (gouvernance) ; §7.2 |

Confirmations sans changement de périmètre : personas (transporteur principal, particulier secondaire, **B2B = expansion** → classement « Future » du §6 validé par la vision) ; Principe n°4 (liquidité) déjà traité comme risque n°1 (§9) ; Principe n°3 (confiance) déjà porté par les rails financiers livrés aux Sprints 1-2 ; positionnement anti-« petites annonces » cohérent avec la demande structurée (D5) et le paiement sécurisé (D3) ; Principe n°2 (valeur avant volume) cohérent avec la séquence « offre d'abord, corridor par corridor ».

---

# 1. RÉSUMÉ EXÉCUTIF

## Le pivot
Transporti cesse d'être « une marketplace de fret généraliste avec une option trajets retour » pour devenir **la place de marché des retours à vide** : les transporteurs publient leurs trajets retour, les clients cherchent d'abord un trajet compatible, et la demande de fret classique devient la solution de repli lorsqu'aucun retour ne correspond.

## Les cinq conclusions de la revue

1. **Le pivot est réalisable par extension, pas par refonte.** L'inventaire du code révèle que le module trajets retour est plus avancé que ne le montrait l'audit transporteur : il existe déjà une **page de recherche client dédiée** (`/jobs/return-trips` : filtres 24 gouvernorats au départ ET à l'arrivée, tri, pagination), un **endpoint public filtrable** (`/api/jobs/public/?is_return_trip=true&pickup_governorate=…&dropoff_governorate=…`), une **réservation directe** (`book-return` : proposition de prix, choix COD/digital avec plafond 300 TND, création d'offre, escrow, conversation, notifications), et une règle de visibilité saine (un transporteur ne voit pas les retours de ses concurrents). Environ **70 % du socle nécessaire au pivot existe déjà**.

2. **Rien de ce qui a été livré n'est perdu.** Le Sprint 1 (commission net garanti, feedback des offres, seed, KPI) est **agnostique au positionnement** : une marketplace de retours à vide a encore plus besoin d'une couche financière exacte, puisque la réservation directe y remplace souvent l'enchère. Les décisions D1–D10 restent valides ; la décision **D5 (demande structurée)** se révèle prémonitoire — elle devient le cœur transactionnel du pivot.

3. **Les P0 financiers restent des P0.** Le verrou paiement→exécution (D3) et le portefeuille (D4) conditionnent la crédibilité de N'IMPORTE quel positionnement. Le flux `book-return` actuel souffre d'ailleurs des mêmes défauts que le flux classique (escrow avalé en cas d'échec, Booking jamais créé). **Le Sprint 2 est maintenu tel quel** : c'est le pivot qui en dépend, pas l'inverse.

4. **Le vrai chantier du pivot est le parcours client**, peu couvert jusqu'ici (l'audit était transporteur-centré) : inversion du funnel de création de demande (« cherchez d'abord un retour »), matching demande↔trajets, alertes corridor, page d'accueil repositionnée. Charge nouvelle estimée : **+38 j/h**, absorbée en réordonnant les phases P1/P2 existantes — le calendrier global passe de 18 à **19 semaines** avant contre-audit.

5. **Le risque n°1 n'est pas technique, c'est la liquidité.** Une marketplace de retours vide de trajets renverra les clients vers une recherche déserte. La stratégie de migration (§8) impose donc : fallback permanent vers la demande classique, amorçage de l'offre (pilote transporteurs AVANT ouverture du funnel client), et bascule du funnel derrière un interrupteur produit.

---

# 2. ANALYSE D'IMPACT PAR DIMENSION

| Dimension | Impact | Détail |
|---|---|---|
| **Vision produit** | 🔴 Inversée | La proposition de valeur primaire devient transporteur-centrée (« monétisez vos retours à vide ») avec un bénéfice client dérivé (« transport moins cher sur les trajets existants »). Le fret classique devient complémentaire. |
| **UX** | 🔴 Fort | Le parcours client démarre par une recherche de trajets (mode « horaires de train ») au lieu d'un formulaire de demande. Le parcours transporteur gagne un réflexe quotidien : « publier mon retour » après chaque mission. |
| **Navigation** | 🟠 Réordonnancement | Aucune entrée supprimée. Côté transporteur : « Mes trajets retour » monte en position 2-3 (il est aujourd'hui un onglet caché dans Mes Missions). Côté client : « Trouver un trajet » devient l'entrée principale, « Publier une annonce » passe en secondaire. Un seul système de navigation — pas de double marketplace. |
| **Architecture de l'information** | 🟠 Moyen | Le « trajet retour » devient un objet de premier rang avec sa page de détail dédiée (aujourd'hui rendu dans le gabarit « demande client », source de confusion relevée par l'audit — M4). Le vocabulaire est unifié : *Trajet* (offre de capacité, publiée par un transporteur) vs *Demande* (besoin de transport, publiée par un client). Le terme « enchères inversées » disparaît (déjà acté en D5). |
| **User flows** | 🔴 Fort | Nouveau flux pivot : Client cherche → trouve un trajet → envoie une **demande structurée** (D5 : marchandise, prix proposé, photos) → transporteur accepte/refuse/contre-propose → paiement sécurisé (D3) → exécution. Flux de repli : pas de trajet compatible → création de demande classique pré-remplie avec les critères de recherche. |
| **Règles métier** | 🟠 Moyen | Inchangé : commission net garanti (D1/D2), escrow strict (D3), plafond COD 300 TND, max 3 offres, visibilité inter-transporteurs. Nouveau : expiration automatique des trajets à la date de départ ; un trajet a une capacité réservable ; règles d'acceptation de demandes (une acceptation ferme la capacité ou la décrémente — à arbitrer, D11). |
| **Matching** | 🔴 Nouveau chantier | V1 : correspondance par gouvernorats (les deux sens) + fenêtre de date ±48h — les champs existent déjà (`pickup/dropoff_governorate`, `scheduled_time`). V2 : proximité haversine (fonction déjà implémentée dans `logistics/pricing.py`) + capacité structurée. Pas de ML au lancement. |
| **APIs backend** | 🟢 Extension | `JobPublicListView` filtre déjà par `is_return_trip` + gouvernorats + tri. À ajouter : endpoint de matching (`demande → trajets compatibles`), CRUD owner des trajets (édition/suppression — déjà planifié WS-F F2), modèle de demande structurée (D5), alertes corridor. Aucune rupture de contrat. |
| **Modèle de domaine** | 🟠 Additif | `TransportJob.is_return_trip` reste le support (DRY, pas de table parallèle). Ajouts : capacité structurée (`capacity_kg`, `capacity_m3` en complément du texte libre existant, rétro-compatible), modèle `ReturnTripRequest` (la demande structurée D5), lien trajet↔véhicule du profil (`TrustProfile.vehicle_*` existe déjà, non connecté). Le `book-return` actuel (réservation instantanée auto-acceptée) évolue vers demande→acceptation, en conservant le chemin instantané comme option transporteur (« réservation immédiate autorisée » — D11). |
| **Mobile** | ⚪ Différé | `mobile/` est un squelette Expo sans appels API (vérifié). Le pivot renforce sa pertinence future (le transporteur publie son retour depuis la route) mais n'en fait pas un prérequis. Classé Future. |
| **Web** | 🔴 Fort | Landing repositionnée (héros double : « Publiez votre retour » / « Trouvez un trajet »), funnel client inversé, page trajet dédiée, dashboard transporteur orienté remplissage des retours. |
| **Dashboard** | 🟠 Moyen | Transporteur : bloc « Mes trajets retour actifs » + « demandes reçues » en tête ; CTA « Publier mon retour » au niveau de « Parcourir les missions ». Client : « Trajets disponibles sur vos corridors ». Admin : liquidité par corridor. |
| **Notifications** | 🟠 Amplifié | Le chantier WS-E (déjà P0 — les notifications entrantes sont muettes) gagne deux événements pivot-critiques : « demande reçue sur votre trajet » (transporteur) et « nouveau trajet sur votre corridor » (client, sur abonnement). |
| **Recherche** | 🟠 Moyen | La recherche client de trajets existe (page dédiée). À enrichir : fenêtre de dates, capacité minimale, tri par date de départ, et surtout **intégration au funnel** (elle est aujourd'hui une page isolée, pas une étape du parcours). |
| **Moteur de recommandation** | 🟡 Nouveau, minimal | Pas de moteur au sens ML. V1 = requête de matching symétrique : à la création d'une demande → trajets compatibles ; à la publication d'un trajet → demandes classiques ouvertes compatibles (monétisation immédiate du retour). |
| **Analytics / KPIs** | 🟠 Révision | **NSM officielle (vision v1.0) : kilomètres de retour à vide transformés en kilomètres chargés** — impose de stocker `distance_km` par mission (haversine × 1,25, Sprint 3). KPI stratégiques rattachés aux 5 catégories officielles : Marketplace (retours publiés, missions créées, taux de matching, délai avant 1er matching, conversion mission→paiement), Liquidité (retours actifs/corridor, remplissage, couverture), Business (revenu/mission, commission moyenne — CAC/LTV hors produit, pilotés côté marketing), Qualité (litiges, annulations, NPS), **Impact (km à vide économisés, CO₂ évitées, revenus additionnels)**. `DICTIONNAIRE_KPI.md` v2. L'endpoint stats unique (B2, livré Sprint 2) reste la fondation. |

---

# 3. REVUE DU MODULE TRAJETS RETOUR (état réel vérifié dans le code)

## 3.1 Forces — ce qui existe et fonctionne
| Capacité | Où | Verdict |
|---|---|---|
| Création transporteur soignée (24 gouvernorats, 5 types de véhicules, capacité, prix indicatif, note, pédagogie) | `jobs/return-trip` + `ReturnTripCreateSerializer` | ✅ Réutilisable tel quel |
| Recherche client dédiée : filtres départ/arrivée 24 gouvernorats, tri, pagination | `frontend/app/(app)/jobs/return-trips/page.tsx` + `JobPublicListView` | ✅ Base du funnel — à intégrer au parcours |
| Réservation directe : prix proposé, COD≤300/digital, offre auto, escrow, conversation, notification transporteur | `backend/logistics/views/return_trips.py` (book-return) | ✅ Squelette transactionnel du pivot |
| Visibilité : les transporteurs ne voient pas les retours des concurrents | `JobPublicListView` | ✅ Règle métier saine |
| Modèle unifié `TransportJob.is_return_trip` (pas de duplication de domaine) | `logistics/models.py` | ✅ Conforme DRY/KISS — à conserver |
| Onglet « Trajets retour » dans Mes Missions + badge visuel dédié | `jobs/page.tsx` | ✅ |
| Seed de recette avec trajets retour (dont un expiré) | Sprint 1 | ✅ |

## 3.2 Manques — ce qui bloque le pivot (par gravité)
1. **Cycle de vie owner inexistant** : ni édition ni suppression d'un trajet publié ; consultation par son auteur en gabarit « demande client » avec 403 sur ses propres offres (audit C9/M4 — déjà spécifié en WS-F, jamais aussi critique qu'aujourd'hui).
2. **Réservation instantanée ≠ D5** : `book-return` crée une offre **auto-ACCEPTÉE** et passe le job `IN_PROGRESS` sans consentement du transporteur ni paiement sécurisé garanti (mêmes défauts que le flux classique pré-D3). Le pivot exige le cycle demande→acceptation/contre-proposition.
3. **Capacité en texte libre** (`available_capacity` CharField) : aucun matching quantitatif possible ; le véhicule structuré du profil (`TrustProfile.vehicle_*`) n'alimente pas le trajet.
4. **Pas d'expiration automatique** : un trajet dont la date est passée reste « Publié ».
5. **Recherche isolée du parcours** : la page existe mais aucun chemin n'y conduit naturellement, et la création de demande classique ne la propose jamais.
6. **Aucune alerte** : ni « demande reçue » fiable (notifications entrantes muettes — audit C7), ni « nouveau trajet sur mon corridor ».
7. **Pas de récurrence** : un transporteur qui fait Tunis→Sfax chaque mardi doit tout resaisir.
8. **Détail client d'un trajet** : le client voit lui aussi un gabarit de mission, avec le prix rendu « 120.00 - ? TND ».

## 3.3 Opportunités
- **Matching inversé à la publication** : proposer au transporteur les demandes classiques ouvertes compatibles avec le retour qu'il vient de publier — monétisation immédiate, différenciant fort (aucun concurrent local ne le fait).
- **Pré-remplissage du repli** : une recherche client infructueuse devient une demande classique pré-remplie en 1 clic (zéro friction, zéro perte de lead).
- **Corridors récurrents** : abonnement client à un corridor (« Sfax→Tunis, prévenez-moi ») = base du réseau et de la rétention.
- **Économie affichée** : « ce trajet retour vous coûte X % de moins que le prix moyen d'une demande classique » — argument de vente mesurable.

---

# 4. REVUE D'ARCHITECTURE PRODUIT

## 4.1 Ce qui ne change pas (préservé intégralement)
- **Domaine** : `TransportJob` unifié (flag `is_return_trip`), `Offer` avec triplet financier net garanti (Sprint 1), machine à états (complétée en D1'/D3), Trust/vérification, avis double-aveugle, litiges.
- **Couche financière** : D1/D2 (net garanti, taux servis par l'API), D3 (escrow strict — Sprint 2), D4 (portefeuille — Sprint 2). Le pivot consomme ces rails sans les modifier.
- **Transverse** : i18n FR/derja, design system, messagerie, conventions API/DRF, stratégie de test (APITestCase + cahier de recette), cible de déploiement Render, stack Next.js/Django.
- **Fret classique** : le workflow complet (publier une annonce → offres → acceptation) reste vivant, sans régression — il devient le repli recommandé, pas une relique.

## 4.2 Ce qui évolue (extension, pas remplacement)
- `book-return` → cycle **demande structurée** (modèle `ReturnTripRequest` : marchandise, poids estimé, photos, prix proposé, statut PENDING/ACCEPTED/REJECTED/COUNTERED/EXPIRED), l'acceptation créant l'Offer + le Booking (D3) sur les rails existants.
- `TransportJob` : ajouts additifs (capacité structurée optionnelle, expiration auto par tâche planifiée — le conteneur scheduler existe).
- Pages : détail trajet dédié (2 variantes : owner / client), funnel client, landing.
- Navigation et dashboards : réordonnancement (aucune suppression).

## 4.3 Nouvelles priorités
1. Cycle de vie complet des trajets (WS-F, promu de Sprint 4 → Sprint 3).
2. Demande structurée (D5, promue au rang de transaction centrale).
3. Matching v1 + funnel client inversé (nouveau — Sprint 4).
4. Alertes corridor + matching inversé (nouveau — Sprint 5).
5. KPI pivot (extension du dictionnaire — Sprints 2 et 5).

---

# 5. PARCOURS UTILISATEURS MIS À JOUR

## 5.1 Transporteur (personna : Mehdi, camionnette 2T, basé à Tunis)
1. Termine une livraison à Sfax → notification contextuelle : « Vous rentrez à vide ? Publiez votre retour Sfax→Tunis en 30 secondes » (véhicule et capacité pré-remplis depuis le profil).
2. Publie le trajet (date, capacité restante, prix indicatif) — ou réactive un trajet récurrent.
3. Reçoit des **demandes structurées** (notification + liste « Demandes reçues » sur le trajet) : marchandise, photos, prix proposé.
4. Accepte / refuse / contre-propose. L'acceptation déclenche le circuit D3 (booking, escrow ou COD explicite).
5. Exécute (jalons D6, preuve de livraison D7), est payé au portefeuille (D4), noté (double-aveugle).
6. En parallèle : le flux classique inchangé (parcourir les demandes publiées, faire des offres) — désormais présenté comme « compléter mon aller ».

## 5.2 Client (personna : Ahmed, envoie un frigo Tunis→Sousse)
1. Arrive sur « **Trouver un trajet** » : saisit départ, arrivée, fenêtre de dates.
2. **Cas A — trajets compatibles** : liste des retours (transporteur noté, véhicule, capacité, prix indicatif, économie estimée) → ouvre le détail → envoie une demande structurée → négociation éventuelle → paiement sécurisé → suivi → confirmation → avis.
3. **Cas B — aucun trajet** : écran de repli « Aucun trajet sur ce corridor pour ces dates » avec deux actions : (a) **créer une demande classique pré-remplie** (1 clic, le formulaire actuel), (b) **créer une alerte corridor** (« prévenez-moi si un trajet apparaît »).
4. Une demande classique publiée reste visible des transporteurs comme aujourd'hui — et est proposée aux transporteurs qui publient un retour compatible (matching inversé).

## 5.3 Administrateur
1. Dashboard enrichi : liquidité par corridor (trajets actifs vs demandes en attente), taux de remplissage, GMV retours vs classique, funnel conversion recherche→demande→réservation.
2. Modération inchangée (trust, litiges, vérifications) — s'applique aux deux flux.
3. Nouveaux leviers d'exploitation : identifier les corridors déséquilibrés (beaucoup de demandes, pas de trajets) pour le démarchage transporteurs ciblé.

---

# 6. PRIORISATION DES FONCTIONNALITÉS

**Core** = sans elle, le pivot n'existe pas · **High** = nécessaire avant ouverture large · **Secondary** = améliore sans conditionner · **Future** = post-pilote.

| Fonctionnalité | Classe | Justification |
|---|---|---|
| Rails financiers : portefeuille, verrou paiement→exécution, compteurs réconciliés (Sprint 2 actuel) | **Core** | La réservation directe de retours est une transaction — sans argent fiable, pas de marketplace, quel que soit le positionnement. Déjà planifié, inchangé. |
| Cycle de vie trajets retour : édition, suppression, expiration auto, écran owner dédié (WS-F F1/F2 étendu) | **Core** | Un inventaire non gérable pollue la recherche client — létal pour un produit dont la recherche EST la promesse. |
| Demande structurée D5 (remplace la réservation auto-acceptée) | **Core** | C'est la transaction centrale du pivot ; le consentement du transporteur et le circuit D3 en dépendent. |
| Notifications entrantes : demande reçue, demande acceptée/refusée, message (WS-E E1 recentré) | **Core** | Une négociation asynchrone sans notification ne converge jamais. Était déjà P0 (audit C7). |
| Funnel client inversé : recherche d'abord, repli pré-rempli | **Core** | C'est la matérialisation produit du pivot — sans lui, le pivot est un slogan. |
| Matching v1 (gouvernorats + fenêtre de date) au moment de la recherche et de la création de demande | **High** | Rend le funnel intelligent ; faisable avec les champs existants, sans dépendance externe. |
| Landing + navigation repositionnées | **High** | La promesse doit être visible en 5 secondes (l'audit notait déjà « Devenir transporteur » enfoui). |
| Capacité structurée + lien véhicule profil (WS-H H2 fusionné) | **High** | Condition du matching quantitatif et de la confiance client (« rentre-t-il dans le camion ? »). |
| Alertes corridor client + matching inversé à la publication | **High** | Résout le problème de liquidité à froid ; forte valeur différenciante. Livrable après le funnel. |
| KPI pivot (remplissage, corridors, économie) + dashboards | **High** | On ne pilote pas un pivot sans ses instruments. Extension de l'endpoint stats déjà spécifié. |
| Étapes de mission + preuve de livraison (WS-D D2'/D3') | **Secondary** | Nécessaire avant production (P1 d'origine) mais indépendant du pivot ; ordre inchangé. |
| Gestion documents / vérification enrichie (WS-H H1) | **Secondary** | Confiance transverse, pas spécifique au pivot. |
| Pièces jointes chat, i18n AR complète, dark mode, finitions (WS-I/WS-J) | **Secondary** | Qualité produit ; le chat sert la négociation mais fonctionne déjà en texte. |
| Trajets récurrents (« tous les mardis ») | **Future** | Fort potentiel rétention ; attendre la validation du modèle simple par le pilote. |
| Application mobile (Expo) | **Future** | Le squelette existe sans logique ; pertinence accrue par le pivot (publication depuis la route) mais le web responsive couvre le pilote. |
| Matching v2 (haversine, détours), recommandations avancées | **Future** | Optimisation prématurée tant que la liquidité par gouvernorat n'est pas prouvée. |
| Tarification dynamique / suggestions de prix par corridor | **Future** | Requiert un historique de transactions inexistant à ce jour. |
| Contre-offres sur flux classique (Manque 12 de l'audit) | **Future** | Confirmé post-pilote (inchangé) ; la négociation pivot passe par la demande structurée. |

**Rien ne devient obsolète.** Deux éléments sont *reformulés* : le vocabulaire « enchères inversées » (supprimé — déjà acté D5) et la réservation instantanée `book-return` (conservée comme **option** du transporteur « accepter les réservations immédiates », désactivée par défaut — voir D11).

---

# 7. ROADMAP RÉGÉNÉRÉE

## 7.1 Réévaluation sprint par sprint du plan en cours

| Sprint (plan initial) | Contenu | Verdict pivot |
|---|---|---|
| Sprint 0 — décisions, env, recette | Livré | ✅ Valide. D1–D4, D6–D10 inchangées ; D5 renforcée. 4 décisions nouvelles à arbitrer (D11–D14, §7.3). |
| Sprint 1 — commission, feedback offres, seed, KPI | **Livré et vérifié** | ✅ Valide à 100 % — fondation financière du pivot. |
| Sprint 2 — portefeuille, verrou paiement, stats unifiées | Planifié | ✅ **Maintenu tel quel** (Core). Seul ajout : l'endpoint stats intègre les KPI pivot (spéc. K13–K17). |
| Sprint 3 — notifications, erreurs traduites, états mission | Planifié | 🟠 **Recomposé** : notifications recentrées sur les événements pivot + WS-F promu ici (cycle de vie trajets + demande structurée). Les états de mission (D1') restent ; C3'/C4' (erreurs) restent. |
| Sprint 4 — WS-F trajets retour + filtres G1 | Planifié | 🟠 **Devient le sprint funnel** : WS-F ayant été avancé, la place est prise par le funnel client inversé + matching v1 + landing/navigation. Filtres G1 absorbés (la recherche de trajets EST le nouveau navigateur principal ; les filtres missions classiques suivent). |
| Sprint 5 — distance G2/G3/G4 + étapes D2' | Planifié | 🟠 Réordonné : alertes corridor + matching inversé + capacité structurée + KPI pivot ; G2 (distance/durée) absorbé dans l'affichage des trajets ; D2' glisse au Sprint 6. |
| Sprint 6 — POD, annulation, documents, audit zones | Planifié | ✅ Maintenu (Secondary consolidé) + D2' étapes mission. |
| Sprints 7-8 — i18n, dark, chat, contenus, volumétrie | 🔄 Sprint 7 en cours (20/07) | ✅ Maintenus ; Sprint 7 traite d'abord le reliquat S6 (D1' ✅, E3 ✅, WS-H ✅, L4 ⏳) avant WS-J/WS-I ; le contenu (aide, landing copy) est réécrit sous l'angle pivot. |
| S18 contre-audit + pilote | Planifié | 🟠 Le contre-audit rejoue l'audit d'origine **+ un nouveau bloc de recette pivot (REC-P)** ; le pilote devient corridor-centré (§8). |

## 7.2 Nouvelle roadmap (19 semaines, S = semaine depuis le 20/07/2026)

*(Chaque lot des Sprints 3+ est annoté **[P1…P6]** = question du « Principe Produit » officiel qu'il sert : P1 retours publiés · P2 matching · P3 remplissage · P4 temps de mise en relation · P5 confiance · P6 simplicité.)*

| Phase | Sprints | Contenu | Jalon de sortie |
|---|---|---|---|
| **Phase 1 — Argent & vérité** | Sprint 2 (S2-S3) — **✅ livré le 17/07** | WS-A A2 portefeuille · A3 verrou paiement (couvre AUSSI book-return) · WS-B B2 stats unifiées · B3 onboarding conditionnel | Porte 1 atteinte : 67/67 tests, recette REC-A2/A3/B1/B4 passée |
| **Phase 2 — Cœur du pivot** | Sprint 3 (S4-S5) — **✅ livré le 18/07** | WS-F étendu : panneau trajet owner, édition/suppression, expiration ✅ · `ReturnTripRequest` (D5, 8 % D13) + écrans demandes ✅ · E1 recentré (demande reçue/acceptée/refusée/contre-proposée, message reçu, offre refusée) ✅ · Instrumentation NSM `distance_km` ✅ · **Reliquat reporté → Sprint 6** : C3'/C4' sweep global erreurs, D1' états uniques, E3 polling complet | ✅ Recette E2E : demande → contre-proposition → acceptation → MATCHED à 8 % avec notifications ; distance stockée (294,5 km Sfax→Tunis) |
| | Sprint 4 (S6-S7) — **✅ livré le 18/07** | Funnel client inversé ✅ (recherche d'abord, repli pré-rempli 1-clic, alertes corridor **actives** — déclencheur tiré du Sprint 5) · matching v1 ✅ (recherche + bannière dans la création de demande) · landing + navigation repositionnées ✅ (flag `RETURN_TRIPS_FIRST`) | ✅ **Porte pivot atteinte** — recette REC-P4/P5 navigateur |
| | Sprint 5 (S8-S9) — **✅ livré le 18/07** | Matching inversé ✅ · gestion des alertes client ✅ · pré-remplissage véhicule H2 ✅ · KPI stratégiques ✅ (NSM, CO₂, revenus additionnels, remplissage, corridor A1 — `/api/admin/stats/` + dashboard admin) · G2 distance sur les cartes ✅ (repli centroïdes gouvernorats) · Reliquat K-M3/M4/M5, K-L2/L4 → Sprint 8 | ✅ **Boucle de liquidité complète ; la NSM est mesurable** — 10 tests + recette navigateur |
| **Phase 3 — Exécution pro** (ex-P1) | Sprint 6 (S10-S11) — **✅ livré le 18/07** | D2' timeline mission (JobEvent) ✅ · D3'/D7 preuve livraison PIN+photo ✅ · D4' annulations tracées → K7 réel ✅ · messages backend traduits ✅ · Reliquat H1 documents / L4 audit / D1' / E3 → Sprint 7 | ✅ Mission bout-en-bout avec POD (PIN) — 10 tests + recette navigateur |
| **Phase 4 — Finitions** | Sprint 7 (S12-S13) — **🔄 en cours (20/07)** | Reliquat S6 : D1' panneau post-livraison unique ✅ · E3 polling assaini (référence stable, immunisé StrictMode + dep `t`) ✅ · WS-H H1 expiration documents (champ `expires_at` + helpers serveur + badges + sélecteur, stockage local réutilisé) ✅ · L4 audit inscription/Konnect/litige E2E ⏳ · puis WS-J i18n AR complète (y compris nouveaux écrans pivot) + dark mode · WS-I messagerie (lien direct, PJ, horodatages) | Parcours pivot complet en AR |
| | Sprint 8 (S14-S15) — **🔄 en cours (20/07)** | L3 volumétrie 500 trajets ✅ (seed orienté pilote : 40 % trajets retour corridor A1 + `distance_km` pour la NSM ; pagination + perf validées ; bugs seed corrigés) · WS-K contenus réécrits pivot ✅ (centre d'aide `/help` bilingue FR+AR, par rôle client/transporteur, orienté trajets retour) · K3 « Mon activité » orienté remplissage ✅ (taux de remplissage + km à vide transformés dans la carte Performance) · **bug P1 corrigé** : matching trajets retour 500ait sur Postgres (`abs(interval)`) · J3 titres de pages ✅ (composant `DocumentTitle` centralisé, i18n) · J4 logo ✅ (déjà cohérent partout) | Produit cohérent, une seule identité |
| **Contre-audit & pilote** | S16-S17 — **1re passe 21/07 · 2e passe 22/07** | L5 1re passe : rejeu **sur PostgreSQL** (147 tests · 0 échec ; typecheck clean ; `abs(interval)` corrigé ; I1 username corrigé). Verdict conditionnel : 0 P0, 4 P1 (chantier financier K1/K2/L1/L2 masqué par SANDBOX). **2e passe 22/07 : les 4 P1 CLÔTURÉS** (K1 gateway.refund + K2 `RefundRequest` + L1 issue structurée `resolve_dispute`/`split_escrow` + câblage UI admin + L2 auto-release suspendue) → **169 tests · 0 échec** sur Postgres. REC-P navigateur repris (env débloqué) : parcours transporteur ✅ + UI admin litige ✅ + **flux litige→escrow exécuté en live sur Postgres** (REFUND_CLIENT job#3 + SPLIT job#11, vue client confirmée) ✅ + parcours client (funnel pivot Cas A/B) vérifié ✅ ; **reste seulement l'intégration paiement — D17 (décision D15, remplace Konnect), F1** — à cadrer avant la porte pilote (squelette `D17Gateway` en place). Rapports `CONTRE_AUDIT_L5_2026-07-21.md` | ≥ 75/100 ✅ ; **zéro P0/P1 côté code atteint (22/07)** ; reste REC-P client + Konnect réel avant pilote |
| | S18-S19 | **Pilote corridor** (§8, phase 3) | Critères §8 |

**Charge** : ~200 j/h restants du plan initial − ~24 j/h absorbés/reportés (G1 partiel, G2 partiel, K3 reformulé) + ~38 j/h nouveaux (funnel 10, matching v1 6, ReturnTripRequest 8, alertes corridor 6, landing/nav 4, KPI pivot 4) + **~6 j/h vision v1.1** (instrumentation `distance_km` 2, agrégats NSM/Impact + facteur CO₂ 4) ≈ **+20 j/h nets**, soit ~+1 semaine avec la même équipe. La réserve de 20 % du plan initial reste applicable.

## 7.3 Nouvelles décisions (arbitrées le 17/07/2026)

| # | Décision | Arbitrage |
|---|---|---|
| D11 | Réservation instantanée des trajets | **Option par trajet, désactivée par défaut** — l'instantané devient une demande auto-acceptée par consentement préalable du transporteur |
| D12 | Capacité d'un trajet | **Unitaire** au pilote (une réservation acceptée ferme le trajet) ; décrémentable = Future |
| D13 | Taux de commission des trajets retour | **8 % incitatif** (amorçage de l'offre — Principe n°4 liquidité), révisable post-pilote ; entrée `RETURN_TRIP` dans le barème D2 |
| D14 | Alerte corridor | **Clients d'abord** ; transporteurs couverts par le matching inversé (Sprint 5) |

---

# 8. STRATÉGIE DE MIGRATION

**Principe : le pivot est un réordonnancement de la surface, pas une migration de données.** Aucune donnée à transformer (le modèle unifié y pourvoit), aucun contrat d'API rompu, le flux classique jamais interrompu.

**Phase A — Fondations invisibles (Sprints 2-3).** Tout se construit derrière les écrans existants : rails financiers, cycle de vie des trajets, demande structurée, notifications. L'utilisateur ne voit encore aucun changement de positionnement. Le `book-return` actuel reste actif jusqu'à la livraison de la demande structurée, puis devient l'option D11-b (une bascule de comportement, pas une suppression de code).

**Phase B — Bascule de surface (Sprint 4), derrière un interrupteur produit.** Le funnel inversé, la landing et la navigation sont livrés derrière un flag de configuration (`RETURN_TRIPS_FIRST`) activable par environnement : recette d'abord, production ensuite, retour arrière en une variable si le funnel décime la conversion. Les URL existantes restent valides (redirections douces, pas de 404).

**Phase C — Amorçage de l'offre avant la demande (S16+), sur le corridor A1 (objectif à 3 ans de la vision).** Séquence du pilote : (1) recruter 20-25 transporteurs opérant sur l'axe **A1 : Tunis – Sousse – Sfax – Gabès** (toutes paires orientées entre ces 4 gouvernorats, l'aller-retour Tunis↔Sfax étant le sous-corridor le plus dense) et les faire publier leurs retours réels pendant 2 semaines — objectif : ≥ 40 trajets actifs en permanence sur l'axe ; (2) seulement ensuite, ouvrir le funnel client sur ces gouvernorats ; (3) élargir corridor par corridor (Nabeul, Bizerte, Kairouan…). Critères de succès : taux de remplissage ≥ 25 % ; délai médian publication→première demande < 24 h ; **≥ 5 000 km à vide transformés pendant le pilote (première mesure de la NSM)** ; zéro réclamation financière ; NPS transporteur ≥ 4/5.

**Garde-fous de cohérence produit** (exigence « un seul produit ») : une seule barre de navigation par rôle ; « Trouver un trajet » et « Publier une demande » sont deux étapes du même funnel, jamais deux marketplaces ; un seul modèle de conversation, de paiement, d'avis et de litige pour les deux flux ; un lexique unique documenté (Trajet/Demande) appliqué par l'UX writer sur FR et derja.

**Gouvernance documentaire** : ce document devient la référence produit ; `DOSSIER_DECISIONS_SPRINT0.md` reçoit D11–D14 ; `DICTIONNAIRE_KPI.md` passe en v2 ; `RECETTE_PARCOURS_TRANSPORTEUR.md` reçoit le bloc REC-P (parcours pivot des deux rôles) ; le plan de remédiation initial reste la référence des lots inchangés (WS-A/B/D/H/I/J/K/L).

---

# 9. ÉVALUATION DES RISQUES

| Risque | Prob. | Impact | Mitigation |
|---|---|---|---|
| **Business — liquidité à froid** : recherche client vide → funnel contre-productif | Élevée | Critique | Amorçage offre avant demande (§8-C) ; repli 1-clic omniprésent ; alertes corridor pour capter la demande non servie ; ouverture corridor par corridor |
| **Business — cannibalisation** : les retours (moins chers) érodent la GMV du fret classique | Moyenne | Moyen | C'est le modèle assumé : volume contre marge ; D13 pilote le taux ; mesurer GMV par flux dès le Sprint 2 (KPI pivot) |
| **UX — funnel plus long pour le client pressé** (recherche imposée avant publication) | Moyenne | Élevé | Le repli « publier directement » reste accessible à chaque étape ; mesurer l'abandon par étape ; flag de retour arrière |
| **UX — double concept Trajet/Demande mal compris** | Moyenne | Moyen | Lexique unique, badges visuels distincts (déjà amorcés : badge violet), onboarding 30 s par rôle, FAQ dédiée |
| **Technique — `TransportJob` à double usage se complexifie** (champs à sens variable selon `is_return_trip`) | Moyenne | Moyen | Rester additif ; encapsuler les différences dans des serializers dédiés (existants) et des managers de requête nommés (`TransportJob.return_trips`, `.freight_requests`) plutôt que des if dispersés ; interdire tout champ « réutilisé avec un autre sens » |
| **Technique — matching v1 trop grossier** (gouvernorat = maille large) | Moyenne | Moyen | Assumer la maille au pilote (les corridors tunisiens sont inter-gouvernorats) ; haversine déjà disponible pour v2 ; mesurer le taux de pertinence perçue |
| **Technique — charge notifications/alertes sur polling** | Faible | Moyen | E3 assainit le polling (Sprint 3) ; alertes corridor calculées à la publication (événementiel côté serveur), pas par scrutation client |
| **Migration — régression du flux classique client** pendant la bascule | Moyenne | Élevé | Recette client minimale (REC-L2) à chaque porte ; flag `RETURN_TRIPS_FIRST` ; aucune suppression d'URL |
| **Migration — dette du `book-return` auto-accepté** si conservé en parallèle de D5 | Moyenne | Moyen | D11-b : un seul chemin de création de transaction (la demande), l'instantané n'étant qu'une demande auto-acceptée par consentement préalable du transporteur — pas deux logiques |
| **Projet — dérive de périmètre** (le pivot invite à tout réinventer) | Élevée | Élevé | Ce document borne le périmètre : Core/High seulement avant pilote ; toute idée nouvelle passe par le registre de décisions |

---

# 10. RECOMMANDATION FINALE

**L'implémentation actuelle est alignée avec la nouvelle vision — le pivot est un changement de hiérarchie, pas de fondations.**

Trois faits l'établissent : (1) le module trajets retour possède déjà ses trois piliers (publication, recherche client filtrée, transaction avec paiement/conversation/notifications) — il souffre d'inachèvement, pas d'inadéquation ; (2) le travail livré (Sprint 1) et le travail planifié en Phase 1 (Sprint 2) sont précisément les rails dont une marketplace de réservation directe a le plus besoin ; (3) la décision D5 (demande structurée), arbitrée avant le pivot, est exactement le mécanisme transactionnel que le pivot réclame.

**Plan d'exécution optimal :**
1. **Ne pas interrompre le Sprint 2** (portefeuille, verrou paiement, stats). Tout pivot marketplace sans argent fiable échoue ; et le verrou D3 corrige aussi le `book-return`.
2. **Arbitrer D11–D14 pendant le Sprint 2** (atelier d'une demi-journée) — ce sont les seules inconnues produit bloquantes.
3. **Exécuter la Phase 2 pivot (Sprints 3-5)** : cycle de vie des trajets + demande structurée + notifications, puis funnel inversé derrière flag, puis boucle de liquidité (alertes + matching inversé).
4. **Basculer la surface derrière `RETURN_TRIPS_FIRST`** et amorcer l'offre avant d'exposer la demande (pilote corridor).
5. **Conserver les Phases 3-4** (exécution pro, finitions) dans l'ordre existant — elles servent les deux flux indifféremment.

Coût du pivot : **+14 j/h nets et +1 semaine** sur le calendrier initial — un prix marginal pour un repositionnement complet, rendu possible par la réutilisation d'environ 70 % de l'existant. Le risque dominant est commercial (liquidité), pas technique : la réponse est dans la séquence de lancement (offre d'abord, corridor par corridor), pas dans le code.

*Prochaine étape opérationnelle : lancement du Sprint 2 (inchangé) + atelier D11–D14. Aucun code de pivot avant la clôture de la Porte 1.*
