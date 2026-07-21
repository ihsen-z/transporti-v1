# CONTRE-AUDIT L5 — TRANSPORTI V1

## Rejeu de l'audit + recette pivot · re-scoring

**Date :** 21 juillet 2026 · **Base de données de recette :** PostgreSQL (stack Docker, iso-prod)
**Cible (roadmap pivot §7.2) :** ≥ 75/100, **zéro P0/P1**.
**Méthode :** (1) suite de tests automatisée complète sur PostgreSQL ; (2) typecheck frontend ; (3) vérification d'API des flux pivot ; (4) revue de l'état des findings de l'audit L4. La recette navigateur UX (REC-P) est partiellement reportée — l'injection de session dans le navigateur d'automatisation est instable dans cet environnement (le navigateur ne joint pas le backend Docker :8000). Les flux sont néanmoins couverts par la suite de tests.

---

## 1. Résultats objectifs

| Vérification | Résultat |
|---|---|
| Suite backend complète (PostgreSQL) | **147 tests · 0 échec · 0 erreur** (151 s) |
| Typecheck frontend (`tsc --noEmit`) | **Clean** |
| Endpoint matching trajets retour (`/api/return-trips/match/`, fenêtre date) | **200** (46 ms) — corrigé (cf. §2) |
| Inscription (`/api/auth/register/`) | **201** (testé live, email unique) |
| Pagination liste publique (`/api/jobs/public/`, 509 jobs) | 20/page, ~0,23 s |
| Stats admin pivot (`/api/admin/stats/`) | 200, ~0,32 s |

**Note SQLite vs PostgreSQL :** l'historique de recette tournait sur SQLite (verts) mais masquait des bugs Postgres-only. Ce contre-audit a été rejoué **sur PostgreSQL** (DB de prod) — d'où la découverte du bug §2.

---

## 2. Défauts trouvés ET corrigés pendant le contre-audit

- **P1 — matching trajets retour cassé sur PostgreSQL.** `/api/return-trips/match/` (avec fenêtre de date) triait par `Abs(interval)`, fonction inexistante sous PostgreSQL (`function abs(interval) does not exist`) → **HTTP 500 sur la DB de prod** ; le cœur du funnel pivot était donc inopérant en production (invisible en SQLite). **Corrigé** (`corridors.py` : `Greatest(Δ, -Δ)` = valeur absolue cross-DB). Vérifié : tests corridors 10/10, endpoint 200 live, suite complète 147/147.
- **P2 (test-infra) — 429 en cascade sur les tests d'inscription.** L'`AuthRateThrottle` conserve son historique dans le cache ; sans reset entre tests, la suite complète déclenchait des 429 (`test_register_*` en échec). **Corrigé** (`RegisterAPITests.setUp` vide le cache). L'inscription produit fonctionne (201 vérifié).

---

## 3. Findings de l'audit L4 encore OUVERTS (bloquants pilote réel)

Ces findings (cf. `AUDIT_L4_ZONES_NON_COUVERTES_2026-07-20.md`) restent à traiter avant tout encaissement réel. Ils sont **masqués par le mode SANDBOX** (aucun mouvement d'argent réel), d'où l'absence d'échec de test.

| # | Sévérité | Titre | État |
|---|---|---|---|
| K1 | **P1** | `refund_escrow` ne rembourse qu'en base, sans appeler la passerelle | Ouvert (chip créé) |
| K2 | **P1** | Aucun suivi back-office du remboursement manuel Konnect | Ouvert (chip créé) |
| L1 | **P1** | Résolution de litige sans issue financière structurée | Ouvert (chip créé) |
| L2 | **P1** | Après résolution, l'escrow se libère par défaut vers le transporteur | Ouvert (chip créé) |
| I1 | ~~P1~~ | `username` dérivé de l'email → collision → 500 à l'inscription | **✅ Corrigé le 21/07** (username unique suffixé + test `test_register_username_collision_resolved`, users 21/21) |

*(Le chantier financier K1+K2+L1+L2 est à traiter d'un bloc « issue de litige → mouvement escrow → remboursement suivi ». **I1 a été corrigé** pendant ce contre-audit → il reste **4 P1**.)*

---

## 4. Couverture pivot livrée (Sprints 7-8)

D1' panneau post-livraison · E3 polling assaini · WS-H expiration documents · L4 audit · WS-J i18n AR + fix dates · L3 volumétrie 500 (corridor A1 + NSM) · WS-K contenus/FAQ bilingues par rôle · K3 « Mon activité » orienté remplissage (taux de remplissage + km transformés) · J3 titres de pages · J4 logo (déjà cohérent). Tous vérifiés (live ou typecheck+tests selon disponibilité de l'environnement).

---

## 5. Score & verdict

**Santé fonctionnelle : élevée.** 147/147 tests sur PostgreSQL, typecheck clean, flux pivot opérationnels (matching corrigé), parcours des deux rôles couverts, i18n FR+AR complète, volumétrie pilote en place. Sur la grille fonctionnelle, le produit est **nettement au-dessus de 75/100**.

**Porte « zéro P0/P1 » : NON encore franchie.**
- **P0 : aucun.**
- **P1 : 4 ouverts** (après clôture d'I1 le 21/07) — le chantier financier remboursement/litige (K1/K2/L1/L2). Pré-existants, masqués par SANDBOX (aucun mouvement d'argent réel → non détectés par les tests).

**Recommandation :** le produit est prêt fonctionnellement pour le pilote, MAIS la porte L5 exige de **fermer les 4 P1 restants avant d'activer Konnect réel**. Séquence conseillée : (1) chantier financier K1+K2+L1+L2 (issue de litige structurée → mouvement escrow → remboursement passerelle + suivi back-office) ; (2) recette navigateur REC-P complète sur un environnement à session stable ; (3) re-rejeu de la suite sur PostgreSQL ; (4) go pilote corridor A1.

**Verdict : CONDITIONNEL — vert fonctionnel (≫ 75/100), 4 P1 (chantier financier) à clôturer avant le pilote à argent réel.**
