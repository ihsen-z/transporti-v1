# AUDIT L4 — ZONES NON COUVERTES

## Transporti V1 · Reliquat Sprint 6 → traité Sprint 7

**Date :** 20 juillet 2026 · **Type :** audit read-only (aucun code modifié)
**Périmètre :** trois zones jamais recettées de bout en bout — (1) inscription transporteur, (2) intégration Konnect réelle, (3) litige de bout en bout.
**Méthode :** lecture ciblée du code (graphe graphify + fichiers), pas de test navigateur (zones partiellement non déployables : Konnect en SANDBOX, pas de compte réel).

**Légende sévérité :** **P0** = bloque le lancement · **P1** = à corriger avant le pilote · **P2** = à corriger / surveiller.

---

## Synthèse

| # | Zone | Sévérité | Titre |
|---|---|---|---|
| K1 | Konnect | **P1** | `refund_escrow` ne rembourse pas réellement (DB seule, pas d'appel passerelle) |
| K2 | Konnect | **P1** | Aucun suivi back-office du remboursement manuel Konnect |
| K3 | Konnect | P2 | Konnect réel non configuré + `check_status` incomplet (à valider en preprod) |
| L1 | Litige | **P1** | Résolution = note libre, sans issue financière structurée |
| L2 | Litige | **P1** | Après résolution, l'escrow se libère par défaut vers le transporteur |
| I1 | Inscription | **P1** | `username` dérivé de l'email → collision → 500 à l'inscription |
| I2 | Inscription | P2 | Aucune vérification email/téléphone (compte actif immédiatement) |

**Points sains confirmés :** webhook Konnect signé HMAC-SHA256 et vérifié (`PaymentWebhookView` → `verify_webhook_signature`) ; cycle de vie litige complet (create/investigate/resolve/reject) avec RBAC MODERATOR/ADMIN, verrou/déverrou de conversation, notifications et tests de transitions ; libération d'escrow **bloquée** tant qu'un litige est OPEN/INVESTIGATING ; inscription validant rôle, unicité email/téléphone, robustesse mot de passe, et auto-création du `TrustProfile` transporteur.

---

## Zone 1 — Inscription transporteur

**État :** `UserRegistrationSerializer` (`backend/users/serializers.py:9`) gère CLIENT et TRANSPORTER, valide l'unicité email/téléphone et le mot de passe, crée le `TrustProfile` pour les transporteurs. `RegisterView` (`backend/users/views.py:32`) est en `AllowAny`. Le flux frontend existe (`register.tsx`).

### I1 — `username` dérivé de l'email → collision → 500 (P1)
`backend/users/serializers.py:63` : `validated_data['username'] = validated_data['email'].split('@')[0]`. Le modèle hérite du `username` **unique** d'`AbstractUser`. Deux emails de même partie locale (`ahmed@a.tn` et `ahmed@b.tn`) produisent le même `username` → `IntegrityError` non gérée → **500 à l'inscription** du second utilisateur.
- **Repro :** inscrire `ahmed@gmail.com` puis `ahmed@yahoo.fr`.
- **Reco :** générer un username unique (suffixe incrémental ou aléatoire), ou détacher l'authentification du `username` (email = identifiant), ou intercepter l'`IntegrityError` en message clair.

### I2 — Pas de vérification email/téléphone (P2)
Le compte est actif immédiatement, sans confirmation email ni OTP SMS. Acceptable au pilote (volume faible, corridor contrôlé), mais à tracer : risque de faux comptes / fautes de frappe sur l'email de contact.
- **Reco :** confirmation email légère avant publication/offre, ou au minimum un rappel « vérifiez votre email ». SMS OTP post-pilote (Twilio non câblé, cf. T2).

---

## Zone 2 — Intégration Konnect réelle

**État :** `KonnectGateway` (`backend/payments/gateway.py:126`) implémente réellement `init_payment` et `check_status` (appels HTTP à l'API Konnect, montants en millimes, formulaire de checkout). La fabrique `get_payment_gateway()` renvoie SANDBOX par défaut, KONNECT si `PAYMENT_GATEWAY='KONNECT'`. Le webhook est signé et vérifié (HMAC-SHA256).

### K1 — `refund_escrow` ne rembourse pas réellement (P1)
`backend/payments/services.py:91` : `refund_escrow` bascule l'`EscrowTransaction` HELD/INITIATED → REFUNDED **en base**, journalise et notifie le client — mais **n'appelle jamais `gateway.refund()`**. En SANDBOX, invisible (aucun argent réel). En Konnect réel, le client voit « remboursé » alors que les fonds séquestrés côté Konnect **ne sont pas restitués**.
- **Chemin d'appel :** annulation transporteur (`backend/logistics/views/jobs.py:378`).
- **Reco :** soit appeler la passerelle et gérer l'échec (Konnect renvoie False, cf. K2), soit distinguer explicitement « remboursement enregistré » de « remboursement exécuté » et créer une tâche de remboursement manuel (cf. K2).

### K2 — Aucun suivi back-office du remboursement manuel (P1)
`KonnectGateway.refund()` (`gateway.py:256`) renvoie **toujours False** (« manual processing via dashboard ») — cohérent avec D4 (remboursements Konnect manuels). Mais contrairement aux **retraits** (`WithdrawalRequest`, workflow REQUESTED→PROCESSING→PAID), **aucun objet ne trace les remboursements clients à exécuter à la main**. Un remboursement dû peut être oublié.
- **Reco :** modéliser une file de remboursements (statuts + montant + réf. Konnect), alimentée par `refund_escrow`, traitée en back-office comme les retraits.

### K3 — Konnect réel non configuré + `check_status` à valider (P2)
`PAYMENT_GATEWAY` par défaut SANDBOX ; `KONNECT_API_KEY`/`KONNECT_WALLET_ID` vides (avertissement au démarrage). `check_status` ne mappe que `completed/pending/failed` — les autres états Konnect retombent silencieusement sur `pending`.
- **Reco :** avant le pilote, configurer les clés preprod, passer `PAYMENT_GATEWAY=KONNECT`, et **recetter un paiement réel de bout en bout** (init → redirection → webhook → escrow HELD → activation) ; couvrir les états Konnect additionnels.

---

## Zone 3 — Litige de bout en bout

**État :** app `support`. Endpoints : création client (`disputes/`), liste « mes litiges », et côté admin liste/détail/investigate/resolve/reject (`backend/support/urls.py`). RBAC MODERATOR/ADMIN, transitions contrôlées (OPEN→INVESTIGATING→RESOLVED/REJECTED), tests de cycle de vie présents. La libération d'escrow est **bloquée** tant qu'un litige est actif (`backend/payments/services.py:364`). Déverrouillage de la conversation + notification à la résolution.

### L1 — Résolution sans issue financière structurée (P1)
`resolve_dispute` (`backend/support/services.py:162`) n'accepte qu'un texte `resolution_notes` : il change le statut, journalise, déverrouille le chat, notifie — **sans aucune décision d'argent** (rembourser le client vs libérer le transporteur). Le verdict et le mouvement de fonds sont totalement découplés.
- **Reco :** ajouter une issue structurée à la résolution (`REFUND_CLIENT` / `RELEASE_TRANSPORTER` / `SPLIT`) qui déclenche l'action escrow correspondante dans la même transaction.

### L2 — Après résolution, libération par défaut vers le transporteur (P1)
Le blocage de libération ne porte que sur les statuts OPEN/INVESTIGATING. Dès qu'un litige passe RESOLVED, l'escrow redevient libérable et le flux normal (confirmation client **ou auto-release 48 h**) **verse au transporteur**. Un litige tranché en faveur du client (marchandise endommagée, no-show) n'entraîne **aucun remboursement automatique** ; sans action manuelle immédiate, l'auto-release 48 h paie quand même le transporteur.
- **Reco :** lier la résolution à l'action escrow (L1) ; tant qu'aucune issue « release » explicite n'est prononcée, suspendre l'auto-release sur les jobs ayant eu un litige.

### L3 — Dépendance à K1/K2
Même si L1/L2 étaient corrigés, un remboursement décidé en faveur du client resterait non exécuté côté Konnect (K1) et non suivi (K2). Les trois findings se corrigent ensemble.

---

## Recommandation de priorisation

1. **Avant tout encaissement réel (P1 groupés) :** traiter K1+K2+L1+L2 comme un seul chantier « issue de litige → mouvement escrow → remboursement Konnect suivi ». C'est le trou financier le plus sérieux ; il est masqué par le mode SANDBOX.
2. **Avant l'ouverture des inscriptions (P1) :** corriger I1 (collision username), trivial et bloquant à froid.
3. **Pré-pilote (P2) :** configurer + recetter Konnect preprod (K3) ; décider de la vérification email (I2).

*Aucune de ces zones n'est un P0 tant que la plateforme tourne en SANDBOX ; toutes deviennent P0/P1 dès l'activation de Konnect réel.*
