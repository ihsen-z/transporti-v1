# BACKLOG VIVANT — TRANSPORTI V1
**Mis à jour :** 22 juillet 2026 · **Références :** roadmap = `PIVOT_STRATEGIQUE_TRAJETS_RETOUR_2026-07-14.md` §7.2 · décisions = `DOSSIER_DECISIONS_SPRINT0.md` · vision = `VISION_PRODUIT_FONDATRICE.md`

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

**WS-J i18n AR — vérifiée ✅ (dark mode différé).** Cadrage : l'i18n AR est déjà ≈100 % (37/37 namespaces en parité imposée par le typecheck, 1600 valeurs traduites, 9 latines résiduelles toutes légitimes — locale/dir, chiffres stats, placeholder). Passe de vérification RTL/AR en navigateur (page vérification WS-H + recherche trajets retour en derja, `dir=rtl`). **Bug AR corrigé** : 4 composants (`JobFeedCard`, `JobCard`, `JobPreview`, `OfferCard`) formataient les dates avec la locale `date-fns` **française codée en dur** → dates françaises même en AR. Remplacé par les helpers `formatDate`/`formatDateTime`/`formatTimeAgo` de `lib/format` (localisés via `getCurrentLocale`). Vérifié : dates en arabe (« 18 جويلية », « الثلاثاء، 21 جويلية »). Typecheck clean. **Dark mode : différé (décision 20/07)** — l'app principale `(app)` n'a aucun style `dark:` (seul l'admin est stylé) ; le `ThemeToggle` de la sidebar bascule la classe sans effet visible (trompeur). Chantier ~40+ écrans reporté ; le toggle trompeur reste tel quel (à décider).

**Reliquat S5 → Sprint 8 :** K-M3/M4/M5 (taux matching, délai 1er matching, conversion — horodatage transitions) · K-L2/L4.

## ✅ Sprint 8 — Contenus pivot + volumétrie (livré 20-21/07)

*Tous les livrables planifiés traités : L3 volumétrie ✅ · WS-K contenus ✅ · K3 remplissage ✅ · J3 titres ✅ · J4 logo ✅ (rien à corriger). Bonus : bug P1 Postgres du matching trajets retour corrigé. Reliquat vérif : rendu live de J3 (Docker Desktop a crashé en fin de session). Prochaine porte = contre-audit L5 (S16-S17).*

- **L3 volumétrie 500 trajets ✅** — `seed_test_data --jobs N` enrichi en jeu de données **orienté pilote** : ~40 % de trajets retour sur le corridor A1 (Tunis–Sousse–Sfax–Gabès, répartition équilibrée ~50/gouvernorat) + ~60 % de demandes classiques, chacun avec `distance_km` estimé (centroïdes) pour que la NSM soit mesurable à l'échelle. Vérifié `--clear --jobs 500` : **509 jobs, 202 trajets retour, 500 avec distance_km, 42 230 km NSM potentiels** ; `/api/jobs/public/` paginé (20/page, count 502, ~0,23 s) ; `/api/admin/stats/` 200 en ~0,32 s. **Bugs seed corrigés** : (a) `clear_test_data` ne supprimait pas `Booking`/`Review`/`WithdrawalRequest` (FK PROTECT) → purge en échec ; (b) sortie console emoji sous Windows cp1252 → lancer avec `PYTHONUTF8=1`. *Note : la NSM « réalisée » reste 0 (volumétrie = offre publiée, pas de bookings) ; un lot de trajets retour COMPLETED serait nécessaire pour peupler la NSM transformée.*
- **WS-K contenus pivot ✅** — Centre d'aide (`/help`) réécrit orienté pivot, **bilingue FR+AR** (namespace i18n `help`, clés plates → parité fr/ar imposée par le typecheck) et **par rôle** (onglets « Je suis client » / « Je suis transporteur », défaut selon le rôle connecté). Contenu : côté client — trajets retour (c'est quoi, repli alerte+demande pré-remplie), demande D5 + règle coordonnées D8, escrow D3 + litige ; côté transporteur — publier ses retours (NSM/revenus), commission 8 % D13, vérification + expiration documents WS-H, gains + retrait manuel D4. Fin de la FAQ générique pré-pivot codée en dur. Typecheck clean. **Vérifié live** (stack Docker rebuild le 20/07) : `/help` en FR **et AR** (`dir=rtl`), onglets rôle fonctionnels, accordéon avec contenu exact (commission 8 % D13 + net garanti D1), console propre.
- **K3 « Mon activité » orienté remplissage ✅** — nouvelles métriques pivot dans `get_transporter_stats` (source unique K12) : trajets retour publiés/remplis, **taux de remplissage** (`fill_rate`), **km à vide transformés** (`km_transformed` = distance des trajets retour livrés = contribution NSM perso). Exposées via `/api/auth/dashboard/` et affichées dans la carte Performance du dashboard transporteur (barre remplissage violette + détail « X/Y trajets retour remplis · Z km à vide transformés »), FR+AR (RTL), interpolation OK, état vide honnête (« — », 0/0). Typecheck clean ; suite logistics 92 tests OK ; vérifié live (FR + AR).
- **🐛 Bug P1 Postgres corrigé (pré-existant, hors S8)** — le matching des trajets retour (`GET /api/return-trips/match/` avec fenêtre date) triait par `Abs(interval)`, inexistant sous PostgreSQL (`function abs(interval) does not exist`) → **500 sur la DB de prod** (passait en SQLite, d'où non détecté). **Cœur du pivot cassé en prod.** Corrigé `corridors.py` : `Greatest(Δ, -Δ)` = |Δ|, cross-DB. Vérifié : corridors 10/10, endpoint match 200 live, suite logistics 92 OK.
- **J3 titres de pages ✅** — composant client centralisé `DocumentTitle` monté dans `(app)/layout.tsx` : mappe le chemin → libellé `t.nav.*` (FR/AR) et pose `document.title = "<page> | Transporti"` (le layout racine définissait déjà le template `%s | Transporti`, jamais alimenté car les pages sont « use client »). Un seul fichier, pas de sweep. Typecheck clean. *Vérif rendu live non rejouée : Docker Desktop a crashé en fin de session (engine down) — changement trivial, à confirmer au prochain démarrage.*
- **J4 logo ✅ (rien à corriger)** — le logo `TransportiLogo` est déjà appliqué de façon cohérente sur toutes les surfaces via des variantes dédiées (AuthLogo, HeaderLogo, FooterLogo, AdminSidebarLogo, AppHeader). Aucun défaut actionnable identifié.

## 📋 Reste Sprint 7/8 + Future proche

dark mode app principale (~40+ écrans, ThemeProvider dans `(app)` + variantes `dark:` ; masquer le `ThemeToggle` trompeur en attendant) · messagerie WS-I (lien direct mission→conversation, pièces jointes — nécessite T3 stockage S3, horodatages 24h).

## 🔄 Contre-audit L5 (1re passe, 21/07) — VERDICT CONDITIONNEL

Rapport : `CONTRE_AUDIT_L5_2026-07-21.md`. Rejeu **sur PostgreSQL** (iso-prod) : **147 tests · 0 échec**, typecheck frontend clean, flux pivot opérationnels.
- **Corrigé pendant le contre-audit** : P1 matching trajets retour cassé sur Postgres (`abs(interval)` → 500, invisible en SQLite) ; P2 test-infra (429 throttle-cache bleed sur les tests d'inscription).
- **I1 corrigé pendant le contre-audit** : collision `username` à l'inscription (username unique suffixé + test) → users 21/21.
- **Porte « zéro P0/P1 » (1re passe) NON franchie** : 0 P0, **4 P1 ouverts** = chantier financier remboursement/litige (K1/K2/L1/L2, masqué par SANDBOX). Chip créé. → **CLÔTURÉS le 22/07** (voir section dédiée ci-dessous).
- **Reste avant pilote** : ~~fermer les 4 P1~~ ✅ · recette navigateur REC-P complète (env débloqué le 22/07) ✅ · re-rejeu suite Postgres ✅ (169 verts) · **intégration D17** (F1, décision D15 — remplace Konnect) reportée/à cadrer.
- **Verdict 1re passe : vert fonctionnel (≫ 75/100), conditionnel — 4 P1 à clôturer avant paiement réel.** → **2e passe (22/07) : 4 P1 clôturés, porte zéro P0/P1 franchie côté code.** Le paiement réel se fera via **D17 (D15)**, pas Konnect.

## ✅ Chantier financier remboursement/litige (K1/K2/L1/L2) — livré le 22/07

Les 4 P1 du contre-audit L5 traités **en un seul bloc** « issue de litige structurée → mouvement escrow → remboursement passerelle + suivi back-office ». Le trou était masqué par le mode SANDBOX (aucun argent réel ne bougeait). **Preuves : suite backend complète 169 tests · 0 échec sur PostgreSQL (147 + 22 nouveaux) ; typecheck front 0 erreur ; vérif navigateur admin live.** Commits `feat(finance)` (backend) + `feat(admin)` (front L1).

- **K1 — `refund_escrow` rembourse réellement ✅** : après bascule escrow REFUNDED, appelle désormais `gateway.refund()` (helper `_execute_refund`) au lieu de ne toucher que la base. SANDBOX → exécuté auto ; KONNECT (renvoie False by design) → mis en file manuelle.
- **K2 — file de remboursements back-office ✅** : nouveau modèle `RefundRequest` (statuts REQUESTED→PROCESSING→PAID/REJECTED, patron `WithdrawalRequest`), champs `beneficiary`/`beneficiary_type` (CLIENT/TRANSPORTER), `escrow`, `gateway_reference`, `auto_executed`. Admin Django `RefundRequestAdmin` (actions marquer en cours / payé / rejeté). Migration `payments/0007`.
- **L1 — résolution de litige à issue financière structurée ✅** : `resolve_dispute` prend `resolution_outcome` (NONE / REFUND_CLIENT / RELEASE_TRANSPORTER / SPLIT) + `refund_amount`, déclenchant le mouvement escrow **dans la même transaction** (`refund_escrow` / `release_escrow_on_completion` / nouveau `split_escrow`). Échec d'un garde escrow → `ValidationError` → rollback total. Champ `Dispute.resolution_outcome` (migration `support/0005`). **Câblé côté produit** : `admin.ts` + modal admin `disputes/page.tsx` (sélecteur d'issue + champ montant conditionnel SPLIT + avertissement « mouvement d'argent réel »).
- **L2 — auto-release 48h suspendue après litige pro-client ✅** : `get_escrow_eligible_for_auto_release` exclut désormais les jobs dont un litige RESOLVED n'a pas l'issue **explicite** RELEASE_TRANSPORTER (REFUND_CLIENT / SPLIT / NONE bloquent ; REJECTED = plainte rejetée → autorise), en plus des OPEN/INVESTIGATING déjà couverts.
- **Décision SPLIT (Phase-1, documentée dans le code)** : escrow → REFUNDED (le transporteur n'est jamais payé auto du montant plein), part client + part transporteur mises en 2 `RefundRequest` manuels.

## 🔄 Recette navigateur REC-P (reprise le 22/07)

**Dette env levée** : le blocage n'était pas un bug code mais des conteneurs down/crash-loop (frontend `Exited 137` = OOM) + fenêtre de chauffe ~30 s où `:8000` renvoie 000 avant que daphne soit prêt. Stack chaud → login navigateur bout-en-bout OK (`OPTIONS`+`POST /api/auth/login/` → 200, redirect dashboard).
- **Parcours transporteur ✅** (Mehdi vérifié) : dashboard, feed missions (15 résultats, dates lib/format), wallet (KPI serveur au millime), litiges — tout vert, 0 erreur console.
- **UI admin litige (L1) ✅ live** : modal « Résoudre » affiche le sélecteur 4 issues + champ montant conditionnel SPLIT ; API Live.
- **Flux litige→escrow exécuté en live sur PostgreSQL (22/07) ✅** : **REFUND_CLIENT** (litige#6/job#3) → escrow REFUNDED + RefundRequest client 100 PAID (passerelle) + notif + **vue client confirmée** ; **SPLIT** (litige#7/job#11, 120/80) → escrow REFUNDED + 2 RefundRequest (client 120 PAID, transporteur 80 REQUESTED). K1/K2/L1 prouvés côté données réelles (pas seulement DB de test).
- **Parcours client (REC-P4) ✅ vérifié le 22/07** (client ramzi) : dashboard + funnel pivot ; recherche trajets retour Cas A (résultats) et Cas B (corridor vide → demande pré-remplie + alerte corridor D14) ; console propre.
- **Reste REC-P** : **intégration D17** (F1, décision D15 — D17 remplace Konnect pour cette version) — dernier item avant la porte pilote. Squelette `D17Gateway` en place (branché sur `PAYMENT_GATEWAY='D17'`, méthodes `NotImplementedError`) ; approche API vs manuel à cadrer. Garder SANDBOX en dev.
- **Concern env** : frontend OOM récurrent (`Exited 137`) → prévoir `docker compose up -d` + ~30 s de chauffe avant toute recette ; surveiller la limite mémoire du conteneur frontend.

## 🎯 Pilote corridor A1 (S18-S19)

Amorçage offre : 20-25 transporteurs corridor A1, ≥ 40 trajets actifs, puis ouverture clients ; critères : remplissage ≥ 25 %, délai < 24 h, **≥ 5 000 km NSM**, zéro réclamation financière.

## 🧊 Future (post-pilote, décisions requises)

Capacité décrémentable (D12-b) · alertes corridor transporteurs (D14-b) · contre-offres flux classique · trajets récurrents · mobile Expo · matching v2 (haversine/détours) · tarification par corridor · PWA/offline · payouts automatisés (D4) · WebSocket (T1).

## ⚠️ Dettes & rappels
- Solde négatif affiché en vert sur /wallet (Phase 4).
- `docker compose up -d --force-recreate` requis pour appliquer l'alignement daphne.
- Warnings drf-spectacular sur les APIView (préexistants, non bloquants).
- **Graphe graphify régénéré le 22/07** (`graphify update . --force`, repo entier) ; `.agents/` exclu via `.graphifyignore`. Nouveaux symboles du chantier financier indexés (`RefundRequest`, `split_escrow`, `_execute_refund`).
- **Lint frontend cassé dans l'environnement** : module `@eslint-community/regexpp` manquant sous `node_modules` → `next lint` échoue au chargement du plugin `@typescript-eslint`. Refaire `npm ci`. Le typecheck (`tsc --noEmit`) reste vert.
- **Docker Desktop (Windows) — HMR ne se déclenche pas sur les bind-mounts** : les éditions de source faites *après* le démarrage d'un conteneur `npm run dev` / Django ne sont pas rechargées (inotify non propagé via le montage). Pour vérifier une édition : `docker restart transporti_frontend` (ou `_backend`) — le serveur relit la source montée au démarrage. À garder en tête pour toute recette en environnement Docker.
- **SQLite ≠ PostgreSQL en test** : la recette locale historique tournait sur SQLite (104/104 verts) mais masquait des bugs Postgres-only (ex. `abs(interval)`, corrigé le 21/07). Recommandation : lancer la suite sur Postgres (`docker exec transporti_backend python manage.py test`) avant chaque porte.
