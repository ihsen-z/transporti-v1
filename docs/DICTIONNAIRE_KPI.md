# DICTIONNAIRE DES KPI — TRANSPORTI
## Transporti V1 · Sprint 1 (WS-B B1) + KPI stratégiques (vision v1.0)

**Version :** 2.0 — 17 juillet 2026 (v1.0 : 14 juillet 2026)
**Décisions sources :** D9 (`docs/DOSSIER_DECISIONS_SPRINT0.md`) · `docs/VISION_PRODUIT_FONDATRICE.md` §9-10 (NSM et catégories officielles)
**Règle d'or :** chaque chiffre affiché provient d'UNE définition et d'UNE source serveur. Interdiction de recalculer côté frontend ce que le backend sait déjà. Tout écran qui affiche un de ces KPI doit consommer l'endpoint indiqué (cible Sprint 2 : endpoint unique `GET /api/transporter/stats/`).

## Convention monétaire
- Montants stockés sur `Offer` : `price_net` (net transporteur, saisi par lui — D1 net garanti), `commission_amount` (= net × taux, D2), `total_price` (= net + commission, payé par le client).
- Affichage : exclusivement via `formatTND` (`frontend/lib/format.ts`) — jamais de littéral `TND` concaténé.

## Définitions

| # | KPI | Définition (formule) | Source serveur | Écrans consommateurs |
|---|---|---|---|---|
| K1 | **Missions disponibles** | Nombre de `TransportJob` `status=PUBLISHED`, `is_return_trip=False`, `owner ≠ transporteur courant`, **strictement la même requête que la liste « Trouver une mission » sans filtre utilisateur** | endpoint stats (S2) — même queryset que `GET /api/jobs/browse` | Dashboard (« Missions disponibles »), bannière « Trouvez de nouvelles missions » |
| K2 | **Offres actives** | Offres du transporteur avec `status=PENDING` non expirées (`valid_until > now`) **+** `status=ACCEPTED` dont la mission n'est pas `COMPLETED/CANCELLED`. Les EXPIRED/REJECTED/WITHDRAWN n'entrent **jamais** dans ce compte | endpoint stats (S2) ; en attendant : `GET /api/offers/my/?status=…` (compteur `count`) | Dashboard (« Offres actives »), Mes offres (KPI « OFFRES ACTIVES ») |
| K3 | **Limite d'offres en attente** | Offres `status=PENDING` uniquement (règle métier : max 3) | `GET /api/offers/my/?status=PENDING` → `count` | Formulaire d'offre (« X/3 offres actives ») |
| K4 | **Gains totaux** | Somme des `price_net` des offres `ACCEPTED` du transporteur dont la mission est `COMPLETED` **et** dont l'escrow est `RELEASED` (= argent réellement acquis) | endpoint stats (S2) / ledger (D4, lot A2) | Dashboard (« Gains totaux »), Mes Missions (« GAINS TOTAUX »), page Portefeuille |
| K5 | **Gains potentiels** | Somme des `price_net` des offres `PENDING` non expirées | endpoint stats (S2) | Mes offres (« GAINS POTENTIELS ») |
| K6 | **Missions terminées** | Nombre de missions `COMPLETED` où le transporteur est l'auteur de l'offre `ACCEPTED` | endpoint stats (S2) | Dashboard, profil public, Mes Missions |
| K7 | **Taux de complétion** | `COMPLETED / (COMPLETED + annulées par le transporteur)` ; si dénominateur = 0 → « — » (jamais « 100 % » par défaut) | endpoint stats (S2) | Dashboard (« Taux de complétion »), profil |
| K8 | **Note moyenne** | Moyenne des `Review.rating` ciblant le transporteur, arrondie à 1 décimale ; si 0 avis → « — » | `GET /api/reviews/user/<id>/` (agrégat serveur) | Dashboard, profil, cartes d'offre côté client |
| K9 | **Complétude du profil** | % de champs remplis parmi : photo de profil, photo véhicule, type de véhicule, capacité, description. Distinct de K7 (les deux étaient confondus dans l'audit) | endpoint profil | Profil (« Complétude du profil ») |
| K10 | **Solde disponible** | `Σ escrows RELEASED (net transporteur)` − `Σ retraits payés` − `Σ compensations COD` (ledger D4) | module Portefeuille (lot A2, S2) | Page Portefeuille |
| K11 | **En attente (escrow)** | `Σ price_net` des missions livrées dont l'escrow est encore `HELD` | module Portefeuille | Page Portefeuille |
| K12 | **Temps de réponse** | Médiane du délai entre publication d'une mission dans les zones du transporteur et sa première offre, sur 90 jours ; si < 3 données → « — » | endpoint stats (S2) | Profil |

## Anti-patterns interdits (constatés dans l'audit, à ne jamais réintroduire)
1. Compter « toutes les offres » et l'appeler « actives » (audit : KPI 4 vs onglets 1+2+1).
2. Afficher un compteur de missions différent du contenu réel de la liste (audit : « 27 » vs 4).
3. Deux définitions de « taux de complétion » sur deux écrans (audit : 50 % vs 100.00 %).
4. Un taux de commission codé en dur côté frontend ou admin (audit : 12 % / 15 % / 10 %).
5. Un KPI monétaire calculé en additionnant des champs hétérogènes (net vs total).

## Traçabilité
- REC-B1, REC-B2, REC-B3, REC-B5 (`docs/RECETTE_PARCOURS_TRANSPORTEUR.md`) valident K1, K2/K3, K4/K6/K7, périmètres TOTAL/Toutes.
- L'endpoint stats unique (`GET /api/transporter/stats/`) a été **livré au Sprint 2** (WS-B B2) ; les K1–K11 y sont implémentés (`backend/logistics/stats.py`, `payments/services.get_wallet_summary`).

---

# KPI STRATÉGIQUES (v2 — vision fondatrice v1.0)

**Prérequis de données (Sprint 3) :** champ additif `TransportJob.distance_km` = haversine(pickup, dropoff) × 1,25 (coefficient routier, T4), calculé et stocké à la création de toute mission ou trajet retour. Facteur d'émission paramétrable `CO2_KG_PER_KM` par type de véhicule (défaut recommandé : 0,25 kg CO₂/km camionnette, 0,6 kg CO₂/km camion — à valider métier). Une mission est « issue d'un retour » si son offre acceptée provient d'une demande sur un trajet `is_return_trip=True`.

## ⭐ North Star Metric

| # | KPI | Définition (formule) | Source | Livraison |
|---|---|---|---|---|
| **K-NSM** | **Kilomètres à vide transformés** | Σ `distance_km` des missions **issues d'un trajet retour**, `COMPLETED` et payées (escrow libéré ou COD confirmé livré), sur la période | agrégat serveur (admin/analytics) | Sprint 5 |

## Marketplace

| # | KPI | Définition | Livraison |
|---|---|---|---|
| K-M1 | Retours publiés | Nombre de `TransportJob(is_return_trip=True)` créés sur la période | Sprint 5 |
| K-M2 | Missions créées | Demandes classiques + demandes structurées acceptées, sur la période | Sprint 5 |
| K-M3 | Taux de matching | Demandes structurées acceptées / demandes envoyées ; et demandes clients servies par un retour / total demandes | Sprint 5 |
| K-M4 | Délai avant 1er matching | Médiane (création du trajet → première demande reçue) | Sprint 5 |
| K-M5 | Conversion mission → paiement | Missions `MATCHED` → escrow HELD ou COD confirmé / missions MATCHED | Sprint 5 |

## Liquidité

| # | KPI | Définition | Livraison |
|---|---|---|---|
| K-L1 | Retours actifs par corridor | Trajets `PUBLISHED` non expirés, groupés par paire orientée (gouvernorat départ → arrivée), corridor A1 en tête | Sprint 5 |
| K-L2 | Clients actifs par corridor | Clients ayant cherché/demandé sur la paire dans les 30 j | Sprint 5 |
| K-L3 | Taux de remplissage des retours | Trajets réservés (demande acceptée) / trajets publiés non expirés | Sprint 5 |
| K-L4 | Couverture géographique | Paires de gouvernorats avec ≥ 1 trajet actif / paires demandées | Sprint 8 |

## Business

| # | KPI | Définition | Livraison |
|---|---|---|---|
| K-B1 | Revenu moyen par mission | Σ `commission_amount` des missions payées / nombre de missions payées | Sprint 5 |
| K-B2 | Commission moyenne (taux effectif) | Σ commission / Σ total_price, ventilé retours (8 % — D13) vs classique (12/15 %) | Sprint 5 |
| K-B3 | CAC / LTV / ratio | **Hors produit** — pilotés côté acquisition/finance ; le produit fournit les exports (missions et revenus par utilisateur) | Post-pilote |

## Qualité

| # | KPI | Définition | Livraison |
|---|---|---|---|
| K-Q1 | Taux de litiges | Disputes ouvertes / missions payées | Sprint 5 (donnée déjà en base) |
| K-Q2 | Taux d'annulation | Annulations (client + transporteur, tracées à partir de D4'/Sprint 6) / missions MATCHED | Sprint 6 |
| K-Q3 | NPS / satisfaction | Enquêtes pilote (hors produit au lancement) ; proxy produit : note moyenne des avis | Pilote |
| K-Q4 | Temps de résolution litiges | Médiane (ouverture → décision) | Sprint 6 |

## Impact

| # | KPI | Définition | Livraison |
|---|---|---|---|
| K-I1 | Km à vide économisés | = K-NSM (même mesure, communication grand public) | Sprint 5 |
| K-I2 | CO₂ évité (tonnes) | Σ (`distance_km` × facteur CO₂ du véhicule) / 1000, sur les missions K-NSM | Sprint 5 |
| K-I3 | Revenus additionnels transporteurs | Σ `price_net` des missions issues de retours, payées | Sprint 5 |

## Règles v2
1. La NSM et les KPI stratégiques sont des **agrégats plateforme** (dashboard admin/analytics) ; les K1–K11 restent les KPI **utilisateur** (dashboard transporteur). Aucun KPI utilisateur ne change en v2.
2. Toute nouvelle fonctionnalité doit déclarer, avant développement, lequel de ces indicateurs elle améliore (Principe Produit n°5 — porte de gouvernance du registre de décisions).
3. `distance_km` est calculé une seule fois côté serveur à la création ; jamais recalculé côté client (même règle que la commission).

**Implémentation (18/07/2026, Sprint 5)** : les KPI stratégiques sont servis par `GET /api/admin/stats/` (clé `pivot` : `nsmKmTransformed`, `co2SavedKg`, `extraTransporterRevenue`, `tripsActive/Booked`, `fillRatePct`, `corridorA1[]`) et affichés sur le dashboard admin (section « Pivot — Retours à vide »). Distance : coordonnées précises → haversine × 1,25 ; repli **centroïdes de gouvernorats** (`logistics/pricing.py:GOVERNORATE_CENTROIDS`) pour les trajets saisis par corridor. Facteur CO₂ : `CO2_KG_PER_KM` (env, défaut 0,35). Taux de matching / délai 1er matching / conversion → instrumentation Sprint 8 (horodatage des transitions requis).
