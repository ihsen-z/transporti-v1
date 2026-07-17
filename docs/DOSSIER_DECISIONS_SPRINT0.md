# DOSSIER DE DÉCISIONS MÉTIER & TECHNIQUES — SPRINT 0
## Transporti V1 · Remédiation parcours transporteur

**Version :** 1.0 — 14 juillet 2026
**Références :** Audit (`AUDIT_PARCOURS_TRANSPORTEUR_2026-07-14.md`) · Plan (`PLAN_EXECUTION_REMEDIATION_TRANSPORTEUR_2026-07-14.md`)
**Méthode :** chaque décision est documentée avec (a) l'état réel du code vérifié pendant le Sprint 0, (b) les options, (c) une recommandation motivée, (d) un champ « DÉCISION » à figer.

---

## D1 — MODÈLE DE COMMISSION : que signifie le prix saisi par le transporteur ?

**État réel constaté (code) :**
- Le backend définit les taux dans `backend/transporti_core/settings.py:379-387` : `TRANSPORT: 12 %`, `MOVING: 15 %`, `DEFAULT: 12 %`. Calcul unique dans `backend/payments/services.py:28-56` : commission **déduite** du prix total (`net = total × (1 − taux)`).
- Le frontend (`frontend/components/offers/OfferForm.tsx:50-105`) duplique les taux en dur et applique la formule **inverse** : commission **ajoutée** au net saisi (`total = net × (1 + taux)`), puis envoie le total au backend.
- Résultat : le net saisi subit deux fois le taux → `net_final = net_saisi × (1 − taux²)` = 147,84 pour 150 saisis. **C'est le bug C1 de l'audit, expliqué.**
- Le modèle `Offer` stocke proprement les trois montants (`price_net`, `commission_amount`, `total_price`, `backend/logistics/models.py:100-158`) — la base de données est saine, seule la convention diverge.
- Aggravant : l'admin affiche un **troisième taux fictif de 10 %** codé en dur (`frontend/components/admin/RevenueChart.tsx:85`, `admin/payments/page.tsx:371`).

**Options :**
- **A (recommandée) — Net garanti :** le transporteur saisit ce qu'il touche ; le client paie `net + commission`. C'est la promesse actuelle du formulaire (« ce que vous gagnez ») et le modèle mental du transporteur. Le backend doit accepter le net comme entrée (ou le front envoyer le net, le back calculant total = net × (1+taux)).
- **B — Prix client saisi :** le transporteur saisit le prix payé par le client, le net affiché = déduction. Aligné sur le backend actuel, mais casse la promesse UX.

**DÉCISION D1 : ✅ Option A — Net garanti** (arbitré le 14/07/2026). Le prix saisi par le transporteur est son net contractuel ; le client paie `net × (1 + taux)`. Conséquence d'implémentation : l'API d'offre accepte le net comme entrée et calcule commission/total côté serveur ; le front n'applique plus aucune formule.

## D2 — TAUX PAR TYPE DE SERVICE

**État réel :** 12 % Transport / 15 % Déménagement existent déjà et sont volontaires (dictionnaire dédié). L'incohérence de l'audit (12 vs 15 %) venait d'écrans qui n'affichent pas le type de service associé au taux.

**Recommandation :** conserver les deux taux, mais (1) afficher systématiquement « Commission x % (service Y) », (2) supprimer le 10 % fantaisiste de l'admin, (3) servir les taux au frontend via l'API (fin de la duplication en dur).

**DÉCISION D2 :** ⬜

## D3 — RÈGLE PAIEMENT → EXÉCUTION

**État réel constaté :**
- `OfferAcceptView` (`backend/logistics/views/offers.py:75-194`) passe le job à `IN_PROGRESS` **avant** de tenter l'escrow ; l'escrow n'est créé que si `payment_method == 'DIGITAL'` et toute exception est **avalée** (job en cours sans escrow). C'est l'explication du bug C3.
- Le modèle `Booking` (contrat prix/taux/mode de paiement) n'est **jamais créé en production** (uniquement dans les tests) → `POST /api/payments/initiate/` répond toujours « No booking found » : **le paiement digital ne peut pas démarrer aujourd'hui**.
- La fonction `refund_escrow` appelée à l'annulation transporteur **n'existe pas** (`jobs.py:296`, import avalé).
- Le statut `MATCHED` existe dans le modèle mais n'est jamais utilisé — il est disponible pour porter l'état « acceptée, en attente de paiement ».
- La libération après confirmation client existe et fonctionne (`confirm-completion`, auto-release 48 h).

**Options :**
- **A (recommandée) — Escrow strict :** acceptation d'offre → `MATCHED` (+ création du `Booking`) ; passage `IN_PROGRESS` uniquement quand l'escrow est `HELD` (digital) ou quand le COD a été explicitement affiché et accepté par le transporteur. Créer `refund_escrow`.
- **B — COD par défaut :** démarrage sans escrow autorisé, statut « paiement à la livraison » affiché — plus simple, mais l'escrow reste une promesse marketing non tenue pour le digital.
- **C — Digital uniquement :** supprimer le COD (fort impact marché tunisien, déconseillé au lancement).

**DÉCISION D3 : ✅ Option A — Escrow strict** (arbitré le 14/07/2026). Acceptation → `MATCHED` + création du `Booking` ; `IN_PROGRESS` seulement après escrow `HELD` (digital) ou acceptation explicite du COD par le transporteur. Implémentations induites : création systématique du `Booking`, fonction `refund_escrow`, fin des exceptions avalées.

## D4 — MODÈLE DE RETRAIT DES GAINS

**État réel constaté :** aucun modèle `Wallet`/`Payout` n'existe. La « libération » de l'escrow est un changement de statut sans mouvement de fonds modélisé. Konnect est réellement intégré pour l'encaissement (mais en mode SANDBOX, clé vide) ; les remboursements Konnect sont manuels par design (`gateway.py:256-263`). La seule comptabilité transporteur existante est la dette de commission COD (`CommissionLedger`).

**Options :**
- **A (recommandée) — Ledger + retrait manuel :** Phase 1 : un livre de compte transporteur (crédits = escrows libérés, débits = retraits + compensation des dettes COD), demande de retrait par virement traitée en back-office avec statuts suivis. Automatisation (payout Konnect/virements API) post-pilote.
- **B — Payout automatisé dès la Phase 1 :** dépendance forte au prestataire, risque de retard sur tout le lot WS-A.
- **C — Compensation seule :** les gains digitaux compensent les dettes COD, retraits différés — insuffisant pour des transporteurs majoritairement digitaux.

**DÉCISION D4 : ✅ Option A — Ledger + retrait manuel** (arbitré le 14/07/2026). Phase 1 : livre de compte transporteur (crédits = escrows libérés ; débits = retraits, compensations COD), demande de retrait par virement traitée en back-office avec statuts (demandé → traité → payé). Automatisation des payouts réévaluée post-pilote.

## D5 — MODÈLE PRODUIT DU TRAJET RETOUR

**État réel constaté :**
- Le trajet retour réutilise `TransportJob` (`is_return_trip=True`), capacité en **texte libre** (`available_capacity`, CharField 255), prix = mêmes champs de fourchette budget que les missions clients. Aucun lien avec le véhicule structuré du profil (`TrustProfile.vehicle_*`).
- Le 403 de l'audit : `JobOffersView` est restreinte au rôle CLIENT (`offers.py:22`) — le transporteur propriétaire est rejeté par principe.
- **Aucun endpoint** d'édition (réservée aux jobs DRAFT des CLIENTs) ni de suppression (aucun DELETE dans `logistics/urls.py`).
- Il existe un flux d'acceptation de « booking retour » (`return_trips.py`) avec notification — la brique côté client existe partiellement.

**Options :**
- **A (recommandée) — Contact direct :** le client contacte le transporteur via la messagerie depuis l'annonce ; le transporteur transforme l'échange en mission au prix convenu. Simple, colle à l'usage tunisien (négociation conversationnelle).
- **B — Demande structurée :** le client envoie une demande chiffrée (marchandise, prix) que le transporteur accepte/refuse — plus traçable, un peu plus de développement.
- **C — Statu quo enchères inversées :** le client « fait une offre » sur le trajet — c'est le modèle actuel jugé incohérent par l'audit.

**DÉCISION D5 : ✅ Option B — Demande structurée** (arbitré le 14/07/2026). Le client envoie depuis l'annonce de trajet retour une **demande chiffrée** (description de la marchandise, prix proposé, éventuellement photos) ; le transporteur accepte, refuse ou contre-propose ; l'acceptation crée la mission au prix convenu et déclenche le circuit paiement (D3). Conséquences : écran de consultation dédié avec liste des demandes reçues (WS-F F1), notifications « demande reçue / acceptée » (WS-E E1), suppression du vocabulaire « enchères inversées ».

## D6 — ÉTAPES DE MISSION

**État réel :** statuts existants `DRAFT, PUBLISHED, MATCHED (inutilisé), IN_PROGRESS, COMPLETED, CANCELLED, DISPUTED` ; transitions codées dans les vues, pas de FSM formelle, pas de timeline d'événements.

**Recommandation (défaut) :** ne pas multiplier les statuts ; ajouter une **timeline d'événements horodatés** sur la mission (arrivé au chargement, chargé/en route, livré) + utiliser `MATCHED` pour « acceptée, en attente de paiement » (cohérent avec D3-A). Jalons minimum Phase 2 : « Chargé/En route » et « Livré (avec preuve) ».

**DÉCISION D6 :** ⬜ *(défaut recommandé sauf objection)*

## D7 — PREUVE DE LIVRAISON (POD)

**État réel :** l'upload photo existe déjà (`POST /api/upload/photo/`, compression, stockage `default_storage`) ; `TransportJob.photos` est une liste d'URLs — la brique technique est présente.

**Recommandation (défaut) :** photo obligatoire + **code PIN à 4 chiffres** détenu par le client (affiché côté client à l'acceptation), saisi par le transporteur à la livraison. La confirmation client devient quasi instantanée et le litige s'appuie sur la photo.

**DÉCISION D7 :** ⬜ *(défaut recommandé sauf objection)*

## D8 — RÈGLE DE PARTAGE DES COORDONNÉES

**État réel :** le chat révèle téléphone + email après assignation ; la FAQ interdit le partage avant réservation ; la règle n'est écrite nulle part pour l'utilisateur.

**Recommandation (défaut) :** formaliser : « coordonnées mutuellement visibles dès que la mission est assignée et payée/sécurisée ; masquées avant ». Publier la règle dans l'aide (WS-K K1) et l'appliquer uniformément.

**DÉCISION D8 :** ⬜ *(défaut recommandé sauf objection)*

## D9 — DICTIONNAIRE DES KPI (extrait à valider)

| KPI | Définition proposée | Source unique |
|---|---|---|
| Missions disponibles | Missions PUBLISHED non expirées, hors trajets retour, **même requête que la liste browse** | endpoint stats (WS-B B2) |
| Offres actives | Offres PENDING + ACCEPTED dont la mission n'est pas terminée | idem |
| Gains totaux | Somme des `price_net` des missions COMPLETED confirmées (= escrow libéré) | idem |
| Missions terminées | Missions COMPLETED où le transporteur était assigné | idem |
| Taux de complétion | COMPLETED / (COMPLETED + annulées par le transporteur) | idem |
| Solde disponible | Escrows RELEASED − retraits − compensations COD | ledger (D4) |

**DÉCISION D9 :** ⬜ *(défaut recommandé sauf objection)*

## D10 — LANGUES AU LANCEMENT

**État réel :** FR complet ; derja AR largement présente mais partielle (bannière onboarding, settings encore FR) ; le sélecteur des Paramètres contredit le commutateur d'entête ; EN inexistant.

**Recommandation (défaut) :** lancement **FR + derja AR complètes** (WS-J J1) ; retirer toute mention « English (Coming soon) » ; synchroniser les deux commandes de langue.

**DÉCISION D10 :** ⬜ *(défaut recommandé sauf objection)*

---

# CHOIX TECHNIQUES (T1–T5)

## T1 — Temps réel : WebSocket ou polling propre ?
**État réel :** Django Channels **absent** (pas installé, ASGI standard) ; `realtime_api` est un endpoint staff de polling, pas du temps réel ; le frontend polle à 30 s (10 s dans un fil de discussion) via `setInterval`, sans React Query. Doublons causés par : StrictMode dev, deux pollers superposés sur `/api/notifications/my/`, dépendance i18n `t` qui recrée les intervalles.
**Recommandation :** Phase 1 = **polling assaini** (un seul poller par ressource, intervalle unifié, correction des dépendances d'effets) — suffisant pour le pilote avec réception < 10 s. Channels/WebSocket = chantier post-pilote. Le serveur prod est déjà daphne/ASGI, la porte reste ouverte.

## T2 — Canaux de notification
**État réel :** email réel mais backend console par défaut (SendGrid câblé, clé vide) ; push : tokens enregistrés mais livraison SANDBOX (log), mode PRODUCTION `NotImplementedError` ; SMS : Twilio dans le venv, **zéro code**. Préférences : stockées et modifiables, **jamais respectées** (import cassé fail-open dans `push_service.py:172`, email ne consulte jamais `email_enabled`).
**Recommandation :** pilote = **in-app (cloche) + email** (configurer SendGrid sur Render) ; respecter réellement les préférences ; retirer l'option SMS de l'UI tant qu'aucun envoi n'existe ; push mobile post-pilote (Firebase non configuré).

## T3 — Stockage média
**État réel :** bascule S3-compatible prête dans les settings mais **non activée** (aucune variable dans render.yaml) → fichiers sur disque **éphémère** Render : les photos (POD, pièces jointes, véhicules) seraient perdues à chaque déploiement.
**Recommandation :** activer un stockage S3-compatible (Cloudflare R2 ou Supabase Storage — coût quasi nul) **avant** tout lot qui produit des fichiers (D7 POD, WS-I pièces jointes, WS-H photos véhicule). Tâche d'infrastructure Sprint 1.

## T4 — Distance / durée
**État réel :** haversine déjà implémenté (`backend/logistics/pricing.py:34-54`) et utilisé par l'estimation de prix ; lat/lng présents sur les jobs.
**Recommandation :** Phase 2 = distance haversine × coefficient routier 1,25 + vitesse moyenne paramétrable pour la durée (zéro dépendance externe, zéro coût). Routing réel (OSRM auto-hébergé ou Google) post-pilote si besoin de précision.

## T5 — Environnement de recette de référence
**État réel :** cf. `GUIDE_ENVIRONNEMENT_RECETTE.md` — deux backends ont coexisté pendant l'audit (Docker Postgres mort + runserver sqlite local).
**Recommandation :** **Docker complet** (Postgres, `RUN_SEED=true`), aligner la commande compose sur l'entrypoint daphne, interdire le runserver local concurrent, enrichir le seed (trajets retour, conversations, notifications, statuts manquants, volumétrie).

---

# ANNEXE — ÉTAT DES LIEUX CONSOLIDÉ (issu de l'investigation Sprint 0)

## Bugs latents confirmés dans le code (au-delà de l'audit GUI)
1. `Booking` jamais créé en production → `payments/initiate` toujours en échec (« No booking found »).
2. `refund_escrow` inexistant mais importé (`jobs.py:296`) → remboursement d'annulation silencieusement impossible.
3. `notify_transporter_cancelled` inexistant mais importé (`jobs.py:317`) → notification d'annulation jamais émise.
4. `push_service.py:172` importe `NotificationPreference` du mauvais module → préférences push jamais appliquées (fail-open).
5. Aucune notification « message reçu » (`messaging/services.py:117` n'appelle jamais `notify()`) ni « mission publiée ».
6. `notify_offer_rejected`, `notify_dispute_*`, `notify_escrow_refunded/blocked` : définis, **aucun appelant**.
7. `GET /api/offers/` → 405 : `OfferForm.tsx:60-72` appelle une route qui n'accepte que POST ; le listing correct est `/api/offers/my/`.
8. Édition de job réservée aux CLIENTs sur statut DRAFT ; aucun DELETE ; `JobOffersView` réservée au rôle CLIENT → tout le cycle de vie « owner transporteur » est à construire (WS-F).
9. Admin : commission 10 % codée en dur (3 fichiers + i18n).
10. Messagerie : le modèle `Message` n'a aucun champ pièce jointe (WS-I I2 = migration nécessaire).

## Impacts sur le plan (précisions de périmètre, sans changement de calendrier)
- WS-A A3 inclut : création du `Booking` à l'acceptation + implémentation de `refund_escrow` (bugs 1-2).
- WS-E E1 inclut : correction des imports cassés (bugs 3-4) et le respect réel des préférences.
- WS-C C1' : le correctif est trivial (pointer le front vers `/api/offers/my/`) — confirmé.
- WS-F F2 : nécessite de nouvelles permissions « owner transporteur » (pas seulement un déblocage du 403).
- WS-G G2 : aucun service externe requis (haversine existant) — risque coût/routing levé.
- WS-I I2 : nécessite une évolution de modèle (champ attachment) + T3 activé au préalable.

## Registre des décisions

| # | Intitulé | Décision | Date | Décideur |
|---|---|---|---|---|
| D1 | Modèle de commission | **A — Net garanti** | 14/07/2026 | Métier (arbitrage explicite) |
| D2 | Taux par service | Défaut recommandé : 12 %/15 % conservés, affichés, servis par l'API | 14/07/2026 | Défaut — modifiable sur objection |
| D3 | Paiement → exécution | **A — Escrow strict** (MATCHED + Booking obligatoire) | 14/07/2026 | Métier (arbitrage explicite) |
| D4 | Retraits | **A — Ledger + retrait manuel back-office** | 14/07/2026 | Métier (arbitrage explicite) |
| D5 | Trajet retour | **B — Demande structurée** (accepte/refuse/contre-propose) | 14/07/2026 | Métier (arbitrage explicite) |
| D6 | Étapes de mission | Défaut recommandé : timeline d'événements + statut MATCHED réutilisé | 14/07/2026 | Défaut — modifiable sur objection |
| D7 | Preuve de livraison | Défaut recommandé : photo + code PIN client | 14/07/2026 | Défaut — modifiable sur objection |
| D8 | Partage coordonnées | Défaut recommandé : visibles dès mission assignée et sécurisée ; règle publiée | 14/07/2026 | Défaut — modifiable sur objection |
| D9 | Dictionnaire KPI | Défaut recommandé : tableau §D9, source unique via endpoint stats | 14/07/2026 | Défaut — modifiable sur objection |
| D10 | Langues | Défaut recommandé : FR + derja AR complètes ; mention EN retirée | 14/07/2026 | Défaut — modifiable sur objection |
| T1 | Temps réel | Polling assaini Phase 1 ; WebSocket post-pilote | 14/07/2026 | Défaut — modifiable sur objection |
| T2 | Canaux notification | In-app + email (SendGrid) ; SMS retiré de l'UI ; push post-pilote | 14/07/2026 | Défaut — modifiable sur objection |
| T3 | Stockage média | S3-compatible (R2/Supabase) activé avant tout lot produisant des fichiers | 14/07/2026 | Défaut — modifiable sur objection |
| T4 | Distance/durée | Haversine × 1,25 + vitesse paramétrable ; routing réel post-pilote | 14/07/2026 | Défaut — modifiable sur objection |
| T5 | Environnement recette | Docker complet Postgres, seed enrichi, runserver local interdit | 14/07/2026 | Défaut — modifiable sur objection |
| D11 | Réservation instantanée des trajets retour | **Option par trajet, désactivée par défaut** — l'instantané devient une demande auto-acceptée par consentement préalable du transporteur | 17/07/2026 | Métier (arbitrage explicite) |
| D12 | Capacité d'un trajet | **Unitaire** — une réservation acceptée ferme le trajet (retiré de la recherche) ; capacité décrémentable = Future | 17/07/2026 | Métier (arbitrage explicite) |
| D13 | Taux de commission des trajets retour | **8 % incitatif** (amorçage de l'offre, révisable post-pilote) — nouvelle entrée `RETURN_TRIP` dans `COMMISSION_RATES`, affichée comme les autres taux (D2) | 17/07/2026 | Métier (arbitrage explicite) |
| D14 | Alertes corridor | **Clients d'abord** au pilote ; transporteurs couverts par le matching inversé (Sprint 5) | 17/07/2026 | Métier (arbitrage explicite) |

**Impact D13 :** le taux 8 % s'applique aux missions issues d'un trajet retour (`is_return_trip=True`). Implémentation Sprint 3 (WS-F) : entrée de barème + résolution du taux par `is_return_trip` avant `job_type` ; les écrans affichent « Commission 8 % (trajet retour) ».

**Pivot stratégique (14/07/2026) :** le positionnement « Return Trips First » est documenté dans `docs/PIVOT_STRATEGIQUE_TRAJETS_RETOUR_2026-07-14.md`, qui régénère la roadmap (Sprints 3-5 recomposés) sans invalider D1–D10 ni les lots livrés.

**Vision fondatrice v1.0 (archivée le 17/07/2026 — `docs/VISION_PRODUIT_FONDATRICE.md`) :** document de référence supérieur. Elle fixe la North Star Metric (« kilomètres à vide transformés en kilomètres chargés »), le corridor prioritaire A1 (Tunis–Sousse–Sfax–Gabès) et la catégorie KPI Impact — intégrés en révision 1.1 du pivot et v2 du dictionnaire KPI.

## Porte de gouvernance — Principes Produit (vision §11, adoptée le 17/07/2026)

Avant tout développement d'une nouvelle fonctionnalité, répondre à la checklist officielle. La fonctionnalité :
1. augmente-t-elle le nombre de retours publiés ?
2. améliore-t-elle le matching ?
3. augmente-t-elle le taux de remplissage ?
4. réduit-elle le temps nécessaire pour trouver une mission ?
5. améliore-t-elle la confiance ?
6. simplifie-t-elle l'expérience utilisateur ?

**Si la réponse est non aux six questions, la fonctionnalité n'est pas développée.** La réponse est consignée dans le ticket (annotation [P1…P6], cf. roadmap pivot §7.2). Toute décision est également testée contre les principes de décision (vision §12) : valeur > volume, simplicité > complexité, confiance > croissance, rentabilité > métriques de vanité.

**Note D5 :** le choix « Demande structurée » (et non le contact chat simple) implique un petit surcroît de périmètre en Phase 2 (WS-F) : modèle de demande (marchandise, prix, statut), écrans « demandes reçues » côté transporteur et « ma demande » côté client, et 2 notifications dédiées. L'estimation WS-F passe de 15 à ~19 j/h — absorbable dans la réserve de 20 % sans toucher au calendrier.
