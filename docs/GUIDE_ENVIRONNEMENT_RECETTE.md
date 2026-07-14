# GUIDE — ENVIRONNEMENT DE RECETTE DE RÉFÉRENCE
## Transporti V1 · Sprint 0

**Version :** 1.0 — 14 juillet 2026
**Objectif (§1.3 du plan) :** un environnement unique, reproductible, réinitialisable en < 10 minutes, pour rejouer les scénarios du cahier de recette (`docs/RECETTE_PARCOURS_TRANSPORTEUR.md`).

---

## 1. Constat de départ (pourquoi ce guide existe)

Pendant l'audit du 13–14 juillet 2026, deux backends ont coexisté à l'insu du testeur :
- le conteneur Docker `transporti_backend` (Postgres, port 8000) — mort en cours d'audit (exit 137) ;
- un `runserver` Django local (sqlite `backend/db.sqlite3`, 127.0.0.1:8000) qui a pris le relais silencieusement.

Cause structurelle : `docker-compose.yml` publie `8000:8000` et le runserver local vise le même port — le premier démarré gagne, l'autre échoue ou l'on se retrouve avec deux bases divergentes selon l'ordre de démarrage. Les données (utilisateurs, missions) diffèrent entre les deux bases, rendant toute recette non fiable.

## 2. Décision d'environnement (à valider — recommandation)

| Option | Description | Avantages | Inconvénients |
|---|---|---|---|
| **A. Docker complet (recommandé)** | `docker compose up` : Postgres + backend (runserver dans le compose actuel, daphne en prod) + frontend + scheduler | Identique à la cible Render (Dockerfile/daphne), Postgres comme en prod, seed automatisable (`RUN_SEED=true` déjà prévu) | Exige Docker Desktop démarré ; runserver dans compose ≠ daphne du Dockerfile (écart à corriger) |
| B. Local (venv + sqlite + npm) | `backend/venv` + `manage.py runserver` + `npm --prefix frontend run dev` | Léger, rapide | sqlite ≠ prod, pas de scheduler, divergences déjà constatées |

**Recommandation : Option A**, avec deux correctifs au compose (à faire en tout début de Sprint 1, tâche d'environnement, pas de logique produit) :
1. Aligner la commande du service backend sur l'entrypoint/daphne du Dockerfile (aujourd'hui le compose court-circuite l'entrypoint avec un `runserver`).
2. Documenter l'interdiction du runserver local quand la stack Docker tourne (ou re-mapper le port local en 8001 pour le debug).

## 3. Procédures (Option A)

### 3.1 Démarrage
```
# Prérequis : Docker Desktop démarré ; aucun serveur local sur 8000/3000
cd <racine du projet>
docker compose up -d
# Attendre le healthcheck db + démarrage backend (migrate auto)
```
Vérifications : `docker ps` → 4 services Up · `http://localhost:8000/api/schema/` répond · `http://localhost:3000` répond.

### 3.2 Seed de recette
Le compose définit déjà `RUN_SEED=true`. Pour re-seeder manuellement :
```
docker exec transporti_backend python manage.py seed_test_data
```
**Comptes standard du seed :**
| Compte | Rôle | Mot de passe |
|---|---|---|
| mehdi.khelifi@test.transporti.tn | TRANSPORTER (vérifié) | Test@123! |
| sami.gharbi@test.transporti.tn | TRANSPORTER (en attente) | Test@123! |
| ahmed.trabelsi@test.transporti.tn | CLIENT | Test@123! |
| leila.benamor@test.transporti.tn | CLIENT (vérifiée) | Test@123! |
| fatma.rejeb@admin.transporti.tn | MODERATOR | Admin@123! |
| karim.bouzid@admin.transporti.tn | ADMIN | Admin@123! |

### 3.3 Reset complet (< 10 min)
```
docker compose down -v        # supprime aussi le volume Postgres (pgdata)
docker compose up -d          # migrate + seed automatiques
```

### 3.4 Hygiène anti-divergence
- ❌ Ne jamais lancer `backend/venv/Scripts/python manage.py runserver` pendant que la stack Docker tourne.
- ✅ Avant toute campagne de recette : `docker ps` (4 services Up) puis `netstat -ano | findstr :8000` → un SEUL listener.
- ✅ Consigner dans le registre de recette : date, `git rev-parse HEAD`, environnement (A/B).

## 4. Écarts du seed à combler (backlog Sprint 1 — tâche « seed d'audit »)

État vérifié du `seed_test_data` actuel : 6 utilisateurs, 4 jobs (COMPLETED, IN_PROGRESS, PUBLISHED, DISPUTED), 3 offres (2 acceptées + 1 en attente, toutes du même transporteur), 2 escrows, 2 lignes de commission, 1 litige.

**Manques identifiés pour rejouer le cahier de recette :**

| Manque | Scénarios bloqués |
|---|---|
| Aucun trajet retour (`is_return_trip=True`) | REC-F1→F5 |
| Aucune conversation/message seedés | REC-E1, REC-I1→I3 |
| Aucune notification seedée | REC-E* (états non vides) |
| Statuts jobs absents : DRAFT, MATCHED, CANCELLED | REC-B1, REC-D4 |
| Offres REJECTED / EXPIRED / WITHDRAWN absentes | REC-B2, REC-C3 |
| Offres concurrentes sur un même job absentes | REC-E2 (acceptation qui rejette les autres) |
| Escrow REFUNDED / DISPUTED, paiement COD absents | REC-A2, REC-A3 |
| TrustProfile UNVERIFIED/REJECTED + documents + champs véhicule vides | REC-B4, REC-H1, REC-H2 |
| Volumétrie (200+ missions) | REC-L1 |

Le seed enrichi devra être **idempotent** et couvrir chaque ligne ci-dessus (extension de `seed_test_data` ou commande dédiée `seed_recette`).

## 5. Registre des environnements

| Date | Env | Commit | Base | Seed | Utilisé pour |
|---|---|---|---|---|---|
| 13–14/07/2026 | Hybride non maîtrisé (Docker mort + runserver local sqlite) | fd14d58 | sqlite | seed partiel | Audit initial |
| (à compléter) | | | | | |
