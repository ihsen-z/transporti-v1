# DICTIONNAIRE DES KPI — PARCOURS TRANSPORTEUR
## Transporti V1 · Sprint 1 (WS-B B1)

**Version :** 1.0 — 14 juillet 2026
**Décision source :** D9 (`docs/DOSSIER_DECISIONS_SPRINT0.md`)
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
- L'endpoint stats unique est livré au Sprint 2 (WS-B B2) ; ce document en est la spécification.
