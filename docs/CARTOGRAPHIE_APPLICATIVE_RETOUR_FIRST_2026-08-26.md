# CARTOGRAPHIE APPLICATIVE & ARCHITECTURE DE L'INFORMATION — « RETOUR FIRST »

**Date** : 26/08/2026 · **Auteur** : Product Owner · **Périmètre** : application web (`frontend/`), profils **Client expéditeur** et **Transporteur**
**Sources** : `docs/VISION_PRODUIT_FONDATRICE.md`, `docs/PIVOT_STRATEGIQUE_TRAJETS_RETOUR_2026-07-14.md` §5–§6, `docs/AUDIT_WEB_DESIGN_UX_USERSTORIES_2026-08-26.md`
**Livrable visuel associé** : maquettes fil de fer (voir Artifact « Cartographie Retour First »)

---

## 1. Les cinq principes d'architecture de l'information

Ces principes tranchent tous les arbitrages de la cartographie. Ils sont dérivés de la signature stratégique — *« la plateforme qui transforme chaque retour à vide en opportunité de revenu »* — et de la North Star Metric — *km de retour à vide transformés en km chargés*.

**IA-1 — L'inventaire précède l'annonce.** Le client cherche **dans un stock existant** avant de créer de la demande. « Trouver un trajet » est donc la racine du parcours client, pas une rubrique. La publication d'une demande classique est un **repli**, jamais l'entrée.

**IA-2 — Le retour se publie en 30 secondes, depuis là où l'on est.** Pour le transporteur, l'action « publier mon retour » doit être atteignable en **un geste depuis n'importe quel écran**, et surtout depuis la fin de mission. C'est une action globale persistante, pas une page enfouie dans un menu.

**IA-3 — Jamais de cul-de-sac.** Tout écran vide propose deux sorties nommées. Zéro résultat de recherche n'est pas une erreur, c'est un point de bifurcation (demande pré-remplie / alerte corridor). Ce principe est déjà correctement appliqué et doit être généralisé.

**IA-4 — Une seule boîte de réception par rôle.** Les demandes reçues, offres, messages et notifications convergent vers un **hub d'attente d'action** unique par profil. Un transporteur ne doit pas visiter trois écrans pour savoir ce qui l'attend.

**IA-5 — La valeur se chiffre à l'écran.** Économie estimée pour le client, revenu et km à vide valorisés pour le transporteur : la promesse doit être **lisible en chiffres** sur les écrans de décision, pas seulement dans le discours marketing.

### Modèle de navigation retenu

| Profil | Navigation primaire (4 entrées max) | Action globale flottante | Secondaire (menu) |
|---|---|---|---|
| **Client** | Trouver un trajet · Mes expéditions · Messages · Compte | *(aucune)* | Alertes corridor, Portefeuille, Avis, Litiges, Aide, Paramètres |
| **Transporteur** | Mes retours · Demandes reçues · Missions · Portefeuille | **Publier un retour** | Compléter mon aller, Réputation, Clients fidèles, Documents, Litiges, Aide, Paramètres |

**Écart avec l'existant** : `components/navigation/AppSidebar.tsx` expose aujourd'hui 8 à 10 entrées de rang égal côté transporteur, sans action globale prioritaire, et « Publier un retour » y est une entrée de liste parmi d'autres (`AppSidebar.tsx:72`). C'est contraire à IA-2.

Notation de statut employée dans toute la suite :
**✅ existe** · **✳️ existe, à faire évoluer** · **➕ à créer**

---

## 2. Zone publique et transverse (avant authentification)

| # | Écran | Route | Statut | Rôle dans le parcours |
|---|---|---|---|---|
| P1 | Accueil — promesse retour à vide | `/` | ✳️ | Doit porter la barre de recherche de trajet **au-dessus de la ligne de flottaison** (IA-1), et une seconde entrée « Je suis transporteur, je rentre à vide » |
| P2 | Comment ça marche (2 colonnes : client / transporteur) | `/comment-ca-marche` | ➕ | Absent ; les deux promesses doivent être racontées séparément |
| P3 | Confiance & sécurité (escrow, vérification, litiges) | `/confiance` | ➕ | Lève l'objection n°1 du persona client (« manque de confiance », Vision §7) |
| P4 | Devenir transporteur (acquisition) | `/devenir-transporteur` | ➕ | Le pivot notait déjà cette entrée comme « enfouie » |
| P5 | Aide / FAQ | `/help` | ✅ | — |
| P6 | CGU · Confidentialité | `/terms` · `/privacy` | ✅ | — |
| P7 | Inscription · Connexion · Mot de passe oublié · Réinitialisation | `/register` `/login` `/forgot-password` `/reset-password` | ✅ | — |
| P8 | Choix du rôle | `/select-role` | ✅ | À enrichir plus tard d'un troisième choix « Entreprise » (hors MVP, Vision §8) |
| P9 | Accès refusé | `/access-denied` | ✅ | — |

---

## 3. Cartographie — profil CLIENT EXPÉDITEUR

### 3.0 Onboarding client

| # | Écran | Route | Statut |
|---|---|---|---|
| C0.1 | Onboarding minimal (nom, téléphone, ville de départ habituelle) | modal sur `/recherche` | ✳️ (`components/onboarding/OnboardingWizard.tsx` existe mais est monté sur `/dashboard`) |

> **Décision PO** : pas de dashboard client. Un expéditeur occasionnel n'a rien à piloter — il a un besoin ponctuel. Son écran d'accueil **est** la recherche. `/dashboard` reste réservé au transporteur.

### 3.1 Bloc 1 — TROUVER UN TRAJET *(racine du parcours, IA-1)*

| # | Écran | Route | Statut | Contenu clé |
|---|---|---|---|---|
| C1.1 | **Recherche de trajet** | `/recherche` | ✳️ (aujourd'hui `/jobs/return-trips`) | Départ, arrivée, fenêtre de dates, type et volume de marchandise. Route à renommer : l'URL doit dire la promesse |
| C1.2 | **Résultats — trajets compatibles** | `/recherche` (état) | ✳️ | Liste + carte. Par carte : transporteur noté, véhicule, capacité restante, prix indicatif, **économie estimée** (IA-5, aujourd'hui absente), fenêtre de date, badge de compatibilité |
| C1.3 | **Repli — aucun trajet sur ce corridor** | `/recherche` (état vide) | ✅ | Deux sorties : demande classique pré-remplie · alerte corridor (`return-trips/page.tsx:418-430`) |
| C1.4 | **Détail d'un trajet retour** | `/trajets/[id]` | ✳️ (aujourd'hui `/jobs/[id]`) | Itinéraire cartographié, véhicule et photos, profil et avis du transporteur, badges de confiance, capacité, conditions |
| C1.5 | **Envoyer une demande structurée** | `/trajets/[id]/demande` | ✳️ (logique aujourd'hui noyée dans `jobs/[id]/page.tsx`, 1 470 l.) | Marchandise, photos, dimensions/poids, adresses précises, créneau, prix proposé, message |
| C1.6 | **Publier une demande classique** *(repli)* | `/demandes/nouvelle` | ✳️ (aujourd'hui `/jobs/new`, 701 l.) | Pré-rempli depuis la recherche ayant échoué |
| C1.7 | **Mes alertes corridor** | `/alertes` | ➕ | Lister, désactiver, supprimer. L'API `/api/corridor-alerts/:id` existe, l'écran de gestion non |

### 3.2 Bloc 2 — MES EXPÉDITIONS *(boîte de réception client, IA-4)*

| # | Écran | Route | Statut | Contenu clé |
|---|---|---|---|---|
| C2.1 | **Mes expéditions** — onglets *En attente de réponse · Négociation · À payer · En cours · Terminées* | `/expeditions` | ✳️ (aujourd'hui `/jobs`, 763 l., sans segmentation par attente d'action) | Le tri primaire est **« qui doit agir maintenant »**, pas la date |
| C2.2 | **Détail d'une expédition** | `/expeditions/[id]` | ✳️ | Fil d'événements, participants, documents, actions contextuelles |
| C2.3 | **Négociation / contre-offre reçue** | `/expeditions/[id]` (panneau) | ✅ | `accept-counter/`, `respond/` déjà câblés |
| C2.4 | **Annuler mon expédition** | `/expeditions/[id]` (dialogue) | ✳️ | Doit appeler `jobs/:id/client-cancel/` (aujourd'hui non câblé) et afficher les **conséquences chiffrées** avant confirmation |

### 3.3 Bloc 3 — RÉSERVER & PAYER

| # | Écran | Route | Statut | Contenu clé |
|---|---|---|---|---|
| C3.1 | Récapitulatif de réservation | `/reservation/[id]` | ✅ (`/booking/[jobId]`) | Prix, commission, ce qui est protégé |
| C3.2 | Choix du moyen de paiement | `/reservation/[id]` (étape) | ✅ | Escrow vs paiement à la livraison, explicité |
| C3.3 | Confirmation & prochaines étapes | `/reservation/[id]/confirmation` | ✳️ | Doit annoncer clairement la suite (« le transporteur vient chercher le… ») |

### 3.4 Bloc 4 — SUIVRE

| # | Écran | Route | Statut | Contenu clé |
|---|---|---|---|---|
| C4.1 | Suivi de mission (jalons + carte) | `/expeditions/[id]` (onglet) | ✅ | `JobTimeline.tsx`, `RouteMap.tsx` |
| C4.2 | Preuve de livraison reçue | `/expeditions/[id]` (onglet) | ✅ | `PostDeliveryPanel.tsx` |
| C4.3 | Confirmer la réception → libération de l'escrow | `/expeditions/[id]` (action) | ✅ | `payments/confirm-completion/` |
| C4.4 | Noter le transporteur (double-aveugle) | `/expeditions/[id]/avis` | ✅ | `ReviewForm.tsx` |

### 3.5 Bloc 5 — ARGENT, CONFIANCE, SUPPORT

| # | Écran | Route | Statut | Justification |
|---|---|---|---|---|
| C5.1 | **Portefeuille client** — paiements, remboursements, reçus | `/portefeuille` | ➕ | Le client paie et peut être remboursé (chantier K1/K2/L1/L2 livré le 22/07), mais `/wallet` est **absent de sa navigation** (`AppSidebar.tsx:68-74`) |
| C5.2 | **Mes avis donnés** | `/avis` | ➕ | `/api/reviews/my/` livré, aucun écran |
| C5.3 | **Transporteurs favoris** | `/favoris` | ➕ | `/api/favorites/` livré, aucun écran. Rétention client et fidélisation transporteur (Vision §8) |
| C5.4 | Litiges — ouvrir et suivre | `/litiges` | ✅ | `/disputes`, 655 l. |
| C5.5 | Messagerie — liste et conversation | `/messages`, `/messages/[id]` | ✅ | — |
| C5.6 | Notifications | `/notifications` | ✅ | — |
| C5.7 | Profil public d'un transporteur | `/transporteur/[id]` | ✅ | — |
| C5.8 | Compte — profil, sécurité, langue, préférences de notification | `/compte` | ✳️ | `/settings`, 706 l. : à scinder en onglets |
| C5.9 | **Carnet d'adresses** (départs et destinations fréquents) | `/compte/adresses` | ➕ | Réduit la friction de la recherche répétée |

---

## 4. Cartographie — profil TRANSPORTEUR

### 4.0 Onboarding transporteur (KYC progressif)

| # | Écran | Route | Statut | Contenu clé |
|---|---|---|---|---|
| T0.1 | Étape 1 — identité et zone d'activité | `/inscription-transporteur/identite` | ➕ | Le KYC actuel est un écran unique (`/verification`) atteint après coup |
| T0.2 | Étape 2 — **véhicule et capacité structurée** | `/inscription-transporteur/vehicule` | ✳️ | Conditionne T1.2 (pré-remplissage) et le matching quantitatif |
| T0.3 | Étape 3 — documents (permis, carte grise, assurance) | `/inscription-transporteur/documents` | ✅ | `VerificationUpload.tsx` |
| T0.4 | Étape 4 — **corridors habituels** | `/inscription-transporteur/corridors` | ➕ | Alimente le matching inversé et le démarchage admin (pivot §5.3) |
| T0.5 | Statut de vérification (en attente / validé / refusé) | `/documents` | ✅ | `/verification` |

> **Décision PO** : le transporteur doit pouvoir **publier un retour avant** d'être entièrement vérifié, avec son trajet marqué « en cours de vérification ». Bloquer la publication derrière un KYC complet tue l'amorçage de l'inventaire — donc la promesse client.

### 4.1 Bloc 1 — MES RETOURS *(hub transporteur, IA-2)*

| # | Écran | Route | Statut | Contenu clé |
|---|---|---|---|---|
| T1.1 | **Tableau de bord « Mes retours »** | `/dashboard` | ✳️ (663 l., orienté missions et non retours) | En haut : **bandeau d'amorce** « Vous rentrez à vide ? » quand une mission vient d'être livrée. Puis : retours actifs et leurs demandes en attente, revenus du mois, **km à vide valorisés** (IA-5) |
| T1.2 | **Publier un retour** — formulaire court | `/retours/nouveau` | ✳️ (aujourd'hui `/jobs/return-trip`, 562 l.) | Départ, arrivée, date, capacité restante, prix indicatif. **Véhicule et capacité pré-remplis depuis le profil** — condition explicite des « 30 secondes » (pivot §5.1), non démontrée aujourd'hui |
| T1.3 | **Mes trajets publiés** (inventaire) | `/retours` | ➕ | Éditer, prolonger, dupliquer, dépublier, expiration automatique visible. Le pivot classe ce cycle de vie en **Core** : « un inventaire non gérable pollue la recherche client » |
| T1.4 | **Détail d'un retour + demandes reçues** | `/retours/[id]` | ✅ | `TripRequestsPanel.tsx` (382 l.) |
| T1.5 | Trajets récurrents | `/retours/recurrents` | ➕ *(Future, hors MVP)* | Assumé hors périmètre |

### 4.2 Bloc 2 — DEMANDES REÇUES *(boîte de réception transporteur, IA-4)*

| # | Écran | Route | Statut | Contenu clé |
|---|---|---|---|---|
| T2.1 | **Demandes reçues — toutes trajets confondus** | `/demandes-recues` | ➕ | Aujourd'hui les demandes ne sont visibles que **trajet par trajet** (T1.4). Violation directe d'IA-4 : le transporteur ne peut pas savoir d'un coup d'œil ce qui l'attend |
| T2.2 | Détail d'une demande | `/demandes-recues/[id]` | ✅ | Marchandise, photos, prix proposé, profil client |
| T2.3 | Accepter · Refuser · **Contre-proposer** | `/demandes-recues/[id]` (actions) | ✅ | `respond/`, `accept-counter/` |

### 4.3 Bloc 3 — COMPLÉTER MON ALLER *(flux classique, secondaire)*

| # | Écran | Route | Statut | Contenu clé |
|---|---|---|---|---|
| T3.1 | Parcourir les demandes publiées | `/demandes` | ✅ | `/jobs/browse`. À repositionner en **secondaire** : le pivot le nomme « compléter mon aller » |
| T3.2 | Détail d'une demande + faire une offre | `/demandes/[id]` | ✅ | `OfferForm.tsx` |
| T3.3 | Mes offres envoyées | `/mes-offres` | ✅ | `/offers` |
| T3.4 | **Contre-proposer sur une offre classique** | `/mes-offres/[id]` | ➕ *(Future assumé)* | `/api/offers/:id/counter/` livré, jamais appelé |

### 4.4 Bloc 4 — MISSIONS

| # | Écran | Route | Statut | Contenu clé |
|---|---|---|---|---|
| T4.1 | **Mes missions** — onglets *À venir · En cours · Terminées* | `/missions` | ✳️ (aujourd'hui mélangé dans `/jobs`) | — |
| T4.2 | Exécution — jalons et preuve de livraison | `/missions/[id]` | ✅ | `MissionStepper.tsx`, `PostDeliveryPanel.tsx` |
| T4.3 | Annuler une mission (motif obligatoire) | `/missions/[id]` (dialogue) | ✅ | `transporter-cancel/` |
| T4.4 | **Fin de mission → amorce de retour** | `/missions/[id]` (état final) | ➕ | **Écran pivot le plus important à créer.** À la complétion : « Vous rentrez de Sfax ? Publiez votre retour en 30 s », véhicule pré-rempli, corridor inversé pré-rempli |

### 4.5 Bloc 5 — ARGENT & RÉPUTATION

| # | Écran | Route | Statut | Contenu clé |
|---|---|---|---|---|
| T5.1 | Portefeuille — solde, escrow, retraits | `/portefeuille` | ✅ | `/wallet` + `wallet/withdrawals/` |
| T5.2 | Historique des paiements et commissions | `/portefeuille/historique` | ✳️ | À distinguer du solde |
| T5.3 | **Réputation** — mes avis reçus, badges, taux de réponse | `/reputation` | ➕ | `/api/reviews/my/` livré, aucun écran. « Réputation numérique » est une promesse explicite (Vision §7) |
| T5.4 | **Performance retours** — taux de remplissage, km à vide valorisés, revenu par corridor | `/performance` | ➕ | IA-5. `/api/metrics/dashboard/` livré, **jamais appelé** |
| T5.5 | **Clients fidèles** | `/clients` | ➕ | `/api/favorites/` livré. Besoin persona explicite : « fidéliser sa clientèle » (Vision §8) |
| T5.6 | Mon profil public (vue client) | `/transporteur/[moi]` | ✅ | — |
| T5.7 | Litiges · Messages · Notifications · Compte | idem client | ✅ | Zone partagée |

---

## 5. Delta — écrans à créer, par priorité

| Ordre | Écran | Profil | Pourquoi maintenant |
|---|---|---|---|
| 1 | **T4.4 Fin de mission → amorce de retour** | Transporteur | Sans lui, l'inventaire de retours ne s'alimente que volontairement. C'est le moteur direct de la North Star Metric et le seul écran qui manque au parcours pivot §5.1 étape 1 |
| 2 | **T1.3 Mes trajets publiés** (inventaire) | Transporteur | Classé **Core** par le pivot ; un inventaire ingérable pollue la recherche client, donc la promesse |
| 3 | **T2.1 Demandes reçues, tous trajets** | Transporteur | IA-4. Aujourd'hui aucune vue consolidée des demandes en attente |
| 4 | **C1.2 « Économie estimée »** dans les résultats | Client | IA-5. Argument de conversion du funnel, absent de l'UI |
| 5 | **T5.4 Performance retours** | Transporteur | Rend visible au transporteur ce que la plateforme lui rapporte ; instrument du pilote corridor A1 |
| 6 | **C1.7 Mes alertes corridor** | Client | API livrée, alertes créables mais non gérables |
| 7 | **C5.1 Portefeuille client** | Client | Remboursements livrés mais invisibles |
| 8 | **P4 Devenir transporteur** · **P3 Confiance** | Public | Acquisition transporteur et levée d'objection client |
| 9 | **T5.3 Réputation** · **C5.2 Mes avis** | Les deux | Promesse Vision §7, API livrée |
| 10 | **T5.5 Clients fidèles** · **C5.3 Favoris** | Les deux | Rétention ; API livrée |
| 11 | T0.1 / T0.4 Onboarding transporteur par étapes | Transporteur | Améliore la conversion d'inscription ; non bloquant |
| 12 | P2 Comment ça marche · C5.9 Carnet d'adresses | Les deux | Confort |

**Bilan** : **14 écrans à créer**, **17 à faire évoluer**, **24 déjà conformes**. Aucun écran existant n'est à jeter — la cartographie est une **réorganisation et un complément**, pas une refonte.

---

## 6. Parcours critiques à prototyper en priorité

Trois parcours doivent être prototypés cliquables avant développement, parce que ce sont eux qui portent le pivot.

**Parcours A — Le retour à vide capté (transporteur, 4 écrans)**
`T4.2 mission livrée` → `T4.4 amorce « vous rentrez à vide ? »` → `T1.2 publier un retour (pré-rempli)` → `T1.3 mon retour est en ligne`
*Objectif mesurable à valider en prototype* : moins de 30 secondes, moins de 4 saisies manuelles.

**Parcours B — La recherche qui ne finit jamais dans le vide (client, 5 écrans)**
`C1.1 recherche` → `C1.2 résultats avec économie estimée` → `C1.4 détail trajet` → `C1.5 demande structurée` → `C3.1 paiement`
avec la branche `C1.3 repli` → `C1.6 demande classique pré-remplie` **ou** `C1.7 alerte corridor`.
*Objectif* : aucune impasse, et la promesse d'économie visible avant le clic sur le détail.

**Parcours C — La négociation qui converge (les deux profils, 6 écrans)**
`C1.5 demande envoyée` → notification → `T2.1 demandes reçues` → `T2.3 contre-proposition` → notification → `C2.3 acceptation client` → `C3.1 paiement`.
*Objectif* : à chaque étape, le destinataire sait qu'il doit agir et ce qu'il doit décider.

---

## 7. Plan de maquettage

**Étape 1 — Fil de fer basse fidélité** *(livré avec ce document, voir Artifact)*
Cadrage gris, aucune couleur de marque, zones nommées. Objectif : valider la hiérarchie de l'information et l'emplacement des actions, pas l'esthétique. Huit écrans : les cinq du parcours A et B, plus T2.1, T5.4 et C1.3.

**Étape 2 — Prototype cliquable**
Les trois parcours du §6 enchaînés, sur les fils de fer. Testé sur 5 transporteurs et 5 clients du corridor A1. Critère de sortie du parcours A : les 30 secondes tenues sans aide.

**Étape 3 — Maquettes haute fidélité**
Application des tokens du design system existant (`frontend/tailwind.config.ts`), **après** résolution de l'écart P0 de l'audit : le branchement des tokens (`var(--…)` absent de la configuration Tailwind), qui conditionne le mode sombre. Le RTL, lui, est déjà en place et n'impose aucune attente — mais chaque nouvel écran doit être maquetté dans ses deux directions.

**Étape 4 — Contribution au design system**
Chaque écran nouveau alimente `design-system/` avec ses composants. Trois composants sont à créer et à documenter : **bandeau d'amorce de retour** (T4.4), **carte de trajet avec économie estimée** (C1.2), **carte de demande reçue actionnable** (T2.1).

---

## 8. Points d'arbitrage à valider

| # | Question | Recommandation PO |
|---|---|---|
| Q1 | Le client garde-t-il un `/dashboard` ? | **Non.** Sa racine est la recherche. Un expéditeur occasionnel n'a rien à piloter. |
| Q2 | Publier un retour est-il conditionné à un KYC complet ? | **Non.** Publication autorisée avec mention « en cours de vérification ». Bloquer tue l'amorçage de l'inventaire. |
| Q3 | Faut-il renommer les routes (`/jobs/return-trips` → `/recherche`) ? | **Oui**, en une passe unique avec redirections. L'URL fait partie de l'architecture de l'information et « jobs » ne dit rien à personne. |
| Q4 | « Compléter mon aller » reste-t-il en navigation primaire transporteur ? | **Non**, secondaire. Le primaire porte le retour. Le flux classique reste intégralement accessible. |
| Q5 | Une navigation unifiée ou deux navigations distinctes par rôle ? | **Deux**, avec un socle partagé (messages, notifications, compte, aide). Les deux métiers n'ont pas la même racine. |
