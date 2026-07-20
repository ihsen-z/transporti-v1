# BACKLOG VIVANT — TRANSPORTI V1
**Mis à jour :** 20 juillet 2026 · **Références :** roadmap = `PIVOT_STRATEGIQUE_TRAJETS_RETOUR_2026-07-14.md` §7.2 · décisions = `DOSSIER_DECISIONS_SPRINT0.md` · vision = `VISION_PRODUIT_FONDATRICE.md`

Chaque lot est annoté du Principe Produit officiel qu'il sert (P1 retours publiés · P2 matching · P3 remplissage · P4 temps de mise en relation · P5 confiance · P6 simplicité · NSM).

## ✅ Livré

| Sprint | Contenu | Preuve |
|---|---|---|
| 0 — Cadrage (14/07) | Décisions D1–D10 + T1–T5 · cahier de recette (45 scénarios) · guide environnement | Docs signés |
| 1 — Commission & feedback (14/07) | Net garanti D1 (fin du 150→147,84) · fix 405 · carte « Votre offre » · validation prix · formatTND/i18n OfferStatusCard · admin sans 10 % fictif · seed enrichi · compose daphne | 18 tests + recette REC-A1/A4/A5/C1/C2/C3 |
| 2 — Argent & vérité (17/07) | Verrou D3 (MATCHED + Booking, initiate/verify/webhook → IN_PROGRESS, confirm-start COD) · refund_escrow · portefeuille D4 (/wallet + retraits + admin) · stats canoniques B2 (K1–K11, un endpoint) · onboarding conditionnel B3 · D11–D14 arbitrées | 67 tests + recette REC-A2/A3/B1/B4 |
| 3 — Cœur du pivot (18/07) | Demande structurée D5 (modèle + 6 endpoints + UI client/owner) · 8 % retours D13 · instant_booking D11 · cycle de vie trajets C9 (édition/suppression/expiration, fin du 403) · notifications entrantes E1 (message reçu, demande ×4, offre refusée, fix préférences push) · NSM distance_km | 84 tests + recette E2E navigateur |

| 4 — Funnel client inversé (18/07) | Flag `RETURN_TRIPS_FIRST` (bascule en 1 variable) · matching v1 (`/api/return-trips/match/`, gouvernorats + fenêtre ±48h) · `CorridorAlert` + endpoints + **déclencheur actif à la publication** (tiré du Sprint 5) · funnel : recherche d'abord, état vide → demande pré-remplie 1-clic + alerte, bannière suggestion dans /jobs/new · landing héros double (signatures vision) · sidebar/dashboard client réordonnés · i18n FR+derja | 8 tests corridors + recette REC-P4/P5 navigateur (landing pivot, alerte créée + notifiée, bannière matching) |

*(Table déplacée dans « ✅ Livré » ci-dessus — porte de sortie atteinte : un client sans trajet compatible publie une demande pré-remplie en 1 clic et s'abonne au corridor.)*

## ✅ Sprint 5 — Boucle de liquidité (livré le 18/07)

Matching inversé ✅ (publication d'un trajet → demandes classiques ouvertes du corridor renvoyées et affichées sur l'écran de succès — « votre retour est déjà monétisable ») · gestion des alertes client ✅ (liste + suppression sous les filtres) · pré-remplissage véhicule H2 ✅ (profil → formulaire trajet, validé en navigateur) · KPI stratégiques ✅ (`GET /api/admin/stats/` clé `pivot` : NSM km transformés, CO₂ évité paramétrable, revenus additionnels, remplissage, liquidité corridor A1 ; tuiles dashboard admin FR/AR) · distance sur les cartes ✅ (« ≈ 295 km », **repli centroïdes de gouvernorats** pour les trajets saisis par corridor + backfill) · **Preuves : 10 tests corridors + suites complètes OK + recette navigateur.**
**Reliquat S5 → Sprint 8 :** K-M3/M4/M5 (taux de matching, délai 1er matching, conversion) — nécessitent l'horodatage des transitions ; K-L2/K-L4.

## ✅ Sprint 6 — Exécution pro (livré 18/07)

Timeline mission D2'/D6 ✅ (`JobEvent` : ARRIVED_PICKUP → LOADED → DELIVERED, séquence forcée, visible 2 parties) · preuve livraison D7 ✅ (`Booking.delivery_pin` 4 chiffres, généré création, visible client-payeur seul ; `/complete/` exige PIN + photo optionnelle) · annulations tracées D4' ✅ (`JobEvent` CANCELLED_BY_* → K7 réel : `completion_rate` = COMPLETED/(COMPLETED+annulées transporteur)) · messages backend traduits FR (offres, publish, cancel) · **Preuves : 10 tests execution + 104/104 suites + recette navigateur** (chaîne étapes, PIN faux rejeté, PIN bon → Terminée).
**Reliquat → Sprint 7 :** D1' états uniques post-livraison, E3 polling assaini, WS-H H1 documents, L4 audit inscription/Konnect/litige E2E.

## 🔄 Sprint 7 — Finitions P1 + reliquats (en cours, 20/07)

**Reliquat S6 traité :**
- **D1' états uniques post-livraison ✅** — composant `PostDeliveryPanel` : un seul panneau selon l'état réel (confirmé → succès vert unique ; non confirmé → action ambre « confirmez pour libérer »). Fin de la contradiction « action requise » + « paiement libéré » affichés ensemble. Vérifié navigateur (job confirmé vs non confirmé).
- **E3 polling assaini ✅** — pollers messages (inbox + fil) réécrits sur référence stable : l'intervalle est créé une fois, immunisé au churn de callback (dépendance i18n `t`) et au double-montage StrictMode (cleanup symétrique, sans fuite). « Double pollers » AppHeader/BottomNav déjà consolidés en `NotificationContext` (S6). Typecheck clean, cadence stable vérifiée.
- **WS-H H1 documents ✅** — expiration des documents transporteur : champ `VerificationDocument.expires_at` + helpers serveur `is_expired`/`expires_soon` (seuil 30 j, migration `trust.0010`), validation d'upload (permis/assurance/carte grise exigent une date future ; CIN/selfie non), exposition serializer, UI : sélecteur de date à l'upload pour les seuls types expirants + badges (expiré rouge / bientôt ambre / valable gris) calculés serveur (règle d'or n°2). Stockage : réutilisation de l'upload local existant (pas d'attente S3/T3). **8 tests WS-H + suite backend 150 verts.** Vérifié navigateur (badges + sélecteur).
- **L4 audit inscription/Konnect/litige E2E ✅** — rapport `AUDIT_L4_ZONES_NON_COUVERTES_2026-07-20.md`. 7 findings (5 P1, 2 P2). Trou financier majeur masqué par le SANDBOX : `refund_escrow` ne rembourse qu'en base sans appeler la passerelle (K1), aucun suivi back-office du remboursement manuel Konnect (K2), résolution de litige sans issue financière structurée (L1) et libération par défaut vers le transporteur après résolution (L2) — à traiter comme un seul chantier avant tout Konnect réel. Inscription : collision `username` dérivé de l'email → 500 (I1). **Zones saines** : webhook Konnect signé HMAC, cycle de vie litige + RBAC + tests, blocage libération pendant litige actif.

**Reliquat S5 → Sprint 8 :** K-M3/M4/M5 (taux matching, délai 1er matching, conversion — horodatage transitions) · K-L2/L4.

## 📋 Sprint 7 (suite) + Sprint 8 — Finitions

i18n AR complète (+ nouveaux écrans pivot) · dark mode · messagerie (lien direct mission→conversation, pièces jointes — nécessite T3 stockage S3, horodatages 24h) · contenus pivot (aide transporteur ET client, FAQ) · « Mon activité » orienté remplissage · titres de pages, logo, finitions J3/J4 · volumétrie 500 trajets.

## 🎯 Contre-audit (S16-S17) puis pilote corridor A1 (S18-S19)

Rejeu audit complet + bloc REC-P · cible ≥ 75/100, zéro P0/P1 · amorçage offre : 20-25 transporteurs corridor A1, ≥ 40 trajets actifs, puis ouverture clients ; critères : remplissage ≥ 25 %, délai < 24 h, **≥ 5 000 km NSM**, zéro réclamation financière.

## 🧊 Future (post-pilote, décisions requises)

Capacité décrémentable (D12-b) · alertes corridor transporteurs (D14-b) · contre-offres flux classique · trajets récurrents · mobile Expo · matching v2 (haversine/détours) · tarification par corridor · PWA/offline · payouts automatisés (D4) · WebSocket (T1).

## ⚠️ Dettes & rappels
- Solde négatif affiché en vert sur /wallet (Phase 4).
- `docker compose up -d --force-recreate` requis pour appliquer l'alignement daphne.
- Warnings drf-spectacular sur les APIView (préexistants, non bloquants).
- **Graphe graphify régénéré le 20/07** (repo entier : 4 074 nœuds) ; `.agents/` exclu via `.graphifyignore` (évite la pollution ~26 k nœuds des skills).
- **Lint frontend cassé dans l'environnement** : module `@eslint-community/regexpp` manquant sous `node_modules` → `next lint` échoue au chargement du plugin `@typescript-eslint`. Refaire `npm ci`. Le typecheck (`tsc --noEmit`) reste vert.
