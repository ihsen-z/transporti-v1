# PLAN D'EXÉCUTION — REMÉDIATION DU PARCOURS TRANSPORTEUR
## Transporti V1 (plateforme web)

**Date :** 14 juillet 2026
**Document source :** `docs/AUDIT_PARCOURS_TRANSPORTEUR_2026-07-14.md`
**Nature :** Plan de travail (aucun développement dans ce document — cadrage, séquencement, critères d'acceptation)
**Objectif :** Passer d'un verdict **NO-GO (48/100)** à un **GO production** vérifiable, en corrigeant 100 % des constats de l'audit.

---

# 0. PRINCIPES DIRECTEURS

1. **L'argent d'abord.** Aucun lot ne passe devant la fiabilité financière : c'est la cause n°1 du NO-GO.
2. **Une seule source de vérité par chiffre.** Tout compteur affiché doit provenir d'un endpoint unique et documenté ; interdiction de recalculer côté front ce que le back sait déjà.
3. **Aucune action silencieuse.** Toute mutation (création, retrait, livraison…) produit un feedback visible : succès, erreur traduite, ou état de blocage expliqué.
4. **Le transporteur est un utilisateur de premier rang.** Chaque libellé, FAQ, paramètre et notification est relu « avec la casquette transporteur ».
5. **Chaque correction est fermée par un test d'acceptation** rejouant le scénario exact de l'audit (même écran, même donnée, même parcours).

---

# 1. GOUVERNANCE, ÉQUIPE ET CADENCE

## 1.1 Équipe type recommandée

| Rôle | Charge | Responsabilités dans ce plan |
|---|---|---|
| Product Owner / Chef de projet | 100 % | Arbitrages métier (commission, workflow paiement), backlog, recette |
| Développeur backend Django | 2 × 100 % | API paiements, notifications, cohérence des compteurs, workflow |
| Développeur frontend Next.js | 2 × 100 % | Feedback UI, écrans paiements, i18n, design system |
| QA / Testeur | 100 % | Cahiers de recette par lot, rejeu des scénarios d'audit, non-régression |
| UX writer / traducteur (FR + derja) | 50 % | Libellés transporteur, messages d'erreur, FAQ, arabe complet |
| DevOps (ponctuel) | 20 % | Environnement de recette stable (fin du flou Docker/local constaté en audit) |

## 1.2 Cadence

- **Sprints de 2 semaines**, démo de fin de sprint rejouant les scénarios d'audit corrigés.
- **Comité Go/No-Go** à la fin de chaque phase (voir §6).
- **Gel des nouvelles fonctionnalités** tant que la Phase 1 (P0) n'est pas recettée.

## 1.3 Prérequis d'environnement (Sprint 0)

Constat d'audit : le port 8000 était servi par un Django local pendant que le conteneur Docker était mort (exit 137), avec deux bases de données divergentes (sqlite vs Postgres).

- [ ] Décider de l'environnement de référence unique pour la recette (recommandé : stack Docker complète, base Postgres).
- [ ] Script de seed unique et documenté (comptes transporteur/client, missions à tous les statuts, offres, conversations, notifications) pour rendre chaque scénario d'audit rejouable.
- [ ] Procédure de reset de l'environnement de recette en 1 commande.
- **Critère de sortie :** un testeur peut recréer l'état exact de l'audit en < 10 minutes.

---

# 2. DÉCISIONS MÉTIER PRÉALABLES (SPRINT 0 — BLOQUANTES)

Ces décisions conditionnent les lots. À trancher par le métier AVANT tout développement, en atelier(s) dédié(s) avec compte rendu écrit.

| # | Décision à prendre | Options identifiées | Impacte |
|---|---|---|---|
| D1 | **Formule de commission unique** : le prix saisi par le transporteur est-il NET (client paie prix+commission) ou BRUT (commission déduite) ? | A. Net garanti (recommandé : c'est la promesse actuelle du formulaire) · B. Brut affiché | C1, WS-A |
| D2 | **Taux de commission par type de service** : 12 % transport / 15 % déménagement est-il voulu ? Où est-il contractualisé et affiché ? | Taux unique · Taux par service (à afficher explicitement) | C1, WS-A |
| D3 | **Règle paiement→exécution** : une mission peut-elle passer « En cours » sans paiement sécurisé ? | A. Blocage strict (escrow obligatoire avant démarrage — recommandé) · B. Cash à la livraison autorisé avec statut explicite | C3, WS-A |
| D4 | **Modèle de retrait des gains** : virement bancaire ? D17/e-dinar ? Konnect payout ? Délai ? Montant minimum ? | À définir avec le prestataire de paiement | C2, WS-A |
| D5 | **Cycle de vie du trajet retour** : qui contacte qui ? Le client fait-il une « offre » ou une simple prise de contact ? Enchères inversées : on garde ou on retire le concept ? | À trancher — l'audit montre que le modèle actuel est incohérent | C9/M4, WS-C |
| D6 | **Étapes de mission** : quelles étapes intermédiaires (proposé : Assignée → Arrivé au chargement → Chargé/En route → Livrée → Confirmée) et lesquelles exigent une preuve ? | Minimum viable : « Chargé » + POD à la livraison | WS-D |
| D7 | **Preuve de livraison** : photo ? code PIN client ? signature ? combinaison ? | Recommandé Tunisie : photo + code PIN à 4 chiffres | WS-D |
| D8 | **Politique de contact** : à quel moment les coordonnées client/transporteur deviennent visibles ? (l'audit note une règle appliquée mais jamais énoncée) | Rédiger la règle et l'afficher dans l'aide | WS-F |
| D9 | **Définition contractuelle des KPI** : que signifie exactement « offre active », « gain total », « taux de complétion », « missions dans votre zone » ? | Dictionnaire de données à rédiger (voir WS-B) | C8/M1, WS-B |
| D10 | **Langues au lancement** : FR + derja complète ? L'anglais reste-t-il « coming soon » ? | Recommandé : FR + AR complets, retirer la mention EN | M10, WS-E |

**Livrable du Sprint 0 :** « Dossier de décisions métier » signé (1 page par décision : choix, justification, impact écrans, impact API).

---

# 3. LOTS DE TRAVAIL (WORKSTREAMS)

Chaque lot liste : constats d'audit couverts → tâches → critères d'acceptation (CA) rejouant l'audit → dépendances → estimation (jours-homme, j/h).

---

## WS-A — FIABILITÉ FINANCIÈRE (P0) — *le cœur du NO-GO*

**Couvre :** C1, C2, C3, M3, mineurs formats monétaires · Manques n°1, 13.

### A1. Unification de la commission (C1) — est. 8 j/h
- Implémenter la décision D1/D2 comme **calcul unique côté backend**, exposé par l'API (le front ne calcule plus jamais une commission).
- Auditer les 4 écrans affichant de l'argent (formulaire d'offre, Mes offres, Mes Missions, Réservation) et les faire consommer le même objet financier : `{prix_client, taux_commission, montant_commission, net_transporteur}`.
- Afficher le taux applicable et sa base (« 12 % du prix client, service Transport ») au moment de la saisie ET dans le récapitulatif.
- **CA-A1 :** rejouer le scénario d'audit : saisir 150 TND net sur la mission #38 → « Mes offres » affiche exactement le même net (150,00 TND), la réservation affiche le même taux que le formulaire. Zéro écart au centime entre les 4 écrans.

### A2. Module Paiements / Portefeuille transporteur (C2) — est. 25 j/h
- Spécifier (PO + UX) une page `/wallet` avec 4 blocs : **Solde disponible / En attente (escrow) / Historique des transactions / Demande de retrait**.
- Historique : chaque ligne = mission, date, prix client, commission, net, statut (en escrow, libéré, retiré), export CSV.
- Retrait : formulaire selon D4 (RIB ou compte D17…), statuts (demandé → traité → payé), délais annoncés.
- Récapitulatif mensuel des commissions (base future de facturation).
- Ajouter l'entrée **« Portefeuille » dans la sidebar** (position haute, voir WS-G).
- **CA-A2 :** `/wallet` accessible depuis le menu ; après le scénario « mission livrée + confirmée », le net apparaît en « En attente » puis « Disponible » ; une demande de retrait aboutit à un statut suivi ; plus aucun 404 sur /wallet et /payments.

### A3. Verrou paiement → exécution (C3) — est. 10 j/h
- Implémenter D3 : une mission ne peut passer « En cours » que si la réservation a un mode de paiement défini et (si digital) un escrow constitué.
- Si cash autorisé (option D3-B) : statut « Paiement à la livraison (espèces) » affiché sans ambiguïté au transporteur AVANT acceptation.
- Écran réservation : supprimer l'état « Mode de paiement en attente » pour toute mission active ; remplacer par l'état réel.
- **CA-A3 :** impossible de reproduire l'anomalie d'audit (mission #2 en cours avec paiement « en attente ») ; tenter de démarrer une mission sans paiement → blocage avec message explicite.

### A4. Validation des prix (M3) — est. 3 j/h
- Règles de saisie : prix > 0, min/max plausibles, cohérence avec le budget client (avertissement si hors fourchette, pas nécessairement blocage).
- Messages d'erreur inline sous le champ, en FR et AR.
- **CA-A4 :** saisir −50 → erreur visible immédiate, bouton d'envoi inactif, aucun « −56,00 TND » affichable.

### A5. Format monétaire unique (mineur) — est. 2 j/h
- Norme d'affichage unique (recommandé : `1 234,500 TND` ou millimes selon usage local — à fixer avec D9) appliquée par un formateur partagé ; interdiction des littéraux « TND » concaténés (cf. travail i18n déjà amorcé dans le repo).
- **CA-A5 :** revue de tous les écrans : un seul format, séparateur unique, partout.

**Dépendances :** D1–D4 signées. A2 dépend de A1 (le portefeuille affiche des montants issus du calcul unifié).

---

## WS-B — COHÉRENCE DES DONNÉES ET COMPTEURS (P0)

**Couvre :** C8, M1, M2, incohérences 4, 6 · lié au « 27 vs 4 ».

### B1. Dictionnaire des KPI (D9) — est. 3 j/h (produit)
- Rédiger la définition de chaque indicateur affiché : missions disponibles, offres actives, gains totaux, missions terminées, taux de complétion, note moyenne, temps de réponse, complétude profil.
- Pour chacun : formule, périmètre, endpoint source, écrans consommateurs.
- **Livrable :** tableau de référence versionné dans `docs/`.

### B2. Endpoint unique de statistiques transporteur — est. 8 j/h
- Un endpoint « stats transporteur » sert TOUS les compteurs (dashboard, profil, Mes offres, Mes Missions) selon B1.
- « Missions disponibles » = exactement ce que la liste `/jobs/browse` retournera avec les mêmes filtres par défaut (même requête serveur) — fin du 27 vs 4.
- « Offres actives » = en attente + acceptées non terminées (selon B1), mis à jour après retrait.
- **CA-B2 :** rejeu audit : le chiffre du dashboard = le nombre de cartes de la liste, à l'instant T ; retirer une offre décrémente le KPI ; profil et dashboard affichent le même nombre de missions terminées ; « Toutes (3) » = « TOTAL 3 ».

### B3. Bannière d'onboarding conditionnelle (M2) — est. 3 j/h
- La bannière « Vérifiez votre identité » ne s'affiche que si `verification_status ≠ vérifié` ; le « Passer » est mémorisé (par étape) côté serveur.
- Les 3 étapes de l'onboarding reflètent l'état réel (étape validée = cochée).
- **CA-B3 :** compte vérifié → aucune bannière, à chaque session ; compte non vérifié → bannière avec la bonne étape.

**Dépendances :** B1 avant B2. Aucune dépendance externe.

---

## WS-C — FEEDBACK UTILISATEUR & CYCLE DE VIE DES OFFRES (P0)

**Couvre :** C4, C5, C6, M11 · incohérence métier 5 (partie offre).

### C1'. Réparation de l'endpoint « offres en attente » (C6) — est. 2 j/h
- Corriger le `GET /api/offers/?status=PENDING` (405 systématique) ou faire pointer le front vers l'endpoint fonctionnel (`/api/offers/my/`) — décision technique à l'étude de conception du lot.
- **CA-C1' :** l'appel de la page détail mission répond 200 ; plus aucun 405 dans la console sur le parcours complet d'audit.

### C2'. État « offre déjà soumise » sur le détail mission (C5/C6) — est. 5 j/h
- Si le transporteur a une offre sur la mission : le formulaire est remplacé par une carte « Votre offre : 150 TND — En attente » avec actions (Retirer / Voir mes offres).
- Après soumission réussie : transition visible vers cette carte + toast de confirmation persistant ≥ 4 s + le stepper passe à « Offres reçues ».
- **CA-C2' :** rejeu audit : soumettre une offre → confirmation visible ; revenir sur la page → l'offre existante est affichée, pas de formulaire vide.

### C3'. Gestion des erreurs traduite et systématique (C4) — est. 6 j/h
- Inventaire de tous les appels de mutation du parcours transporteur (offre, retrait, trajet retour, livraison, avis, message, litige) ; pour chacun : toast/inline d'erreur en FR + AR.
- Traduction des messages backend (fin des « You already submitted… ») via un catalogue de codes d'erreur → libellés.
- Bannière d'erreur honnête : distinguer « problème de droits » (403), « donnée invalide » (400), « service indisponible » (5xx) — fin du « Vérifiez votre connexion internet » mensonger.
- **CA-C3' :** rejeu audit : re-soumettre une offre en double → message clair en français à l'écran ; couper le backend → message « service indisponible », pas « connexion internet ».

### C4'. Validation silencieuse des formulaires (M11) — est. 4 j/h
- Standard de validation commun : champs requis marqués, erreurs inline au submit, focus sur le premier champ en erreur, bouton désactivé pendant l'envoi.
- Appliquer à : formulaire d'offre, trajet retour, avis, litige, paramètres.
- **CA-C4' :** rejeu audit : « Publier le trajet retour » à vide → erreurs visibles sous chaque champ requis.

**Dépendances :** C2' dépend de C1'. Le catalogue d'erreurs (C3') sert aussi WS-D et WS-E.

---

## WS-D — EXÉCUTION DE MISSION & WORKFLOW MÉTIER (P0/P1)

**Couvre :** C3 (volet workflow), M7 · Manques n°3, 7 · incohérences 3, 7.

### D1'. États de mission cohérents (M7) — est. 5 j/h
- Machine à états unique exposée par l'API ; le front affiche UN état et UN seul par mission (fin du « Terminée + En attente de confirmation + effectué avec succès »).
- Statuts transporteur après livraison : « Livrée — en attente de confirmation client » → « Confirmée — paiement en cours de libération » → « Clôturée ».
- **CA-D1' :** rejeu audit : marquer livré → un seul panneau d'état, cohérent avec le stepper et le header.

### D2'. Étapes intermédiaires (D6) — est. 8 j/h
- Ajout des jalons décidés en D6 (minimum : « Chargé / En route ») avec horodatage, visibles par le client.
- Chaque jalon = bouton d'action unique au bon moment (le transporteur sait toujours quoi faire ensuite — exigence Phase 8 de l'audit).
- **CA-D2' :** une mission en cours affiche le prochain jalon attendu ; le client voit l'historique horodaté.

### D3'. Preuve de livraison (D7) — est. 10 j/h
- Implémentation du choix D7 (recommandé photo + code PIN) au moment de « Marquer comme livré ».
- La confirmation client devient : saisie du code par le transporteur OU validation photo par le client — à spécifier dans D7.
- **CA-D3' :** impossible de clôturer une livraison sans preuve ; la preuve est visible dans le détail mission et en cas de litige.

### D4'. Annulation encadrée — est. 3 j/h
- « Annuler la mission » : motifs obligatoires, rappel des conséquences (impact score de confiance), confirmation double.
- **CA-D4' :** l'annulation demande un motif et affiche l'impact avant confirmation.

**Dépendances :** D1' avant D2'/D3'. D3' alimente le module litiges (WS-F).

---

## WS-E — NOTIFICATIONS & TEMPS RÉEL (P0)

**Couvre :** C7 · Manque n°2 · observations performances (polling dupliqué).

### E1. Notifications entrantes serveur (C7) — est. 10 j/h
- Déclencheurs à implémenter/réparer côté backend : **message reçu, offre acceptée, offre refusée, mission annulée par le client, nouvelle mission publiée dans les gouvernorats choisis, paiement libéré, confirmation client**.
- Chaque déclencheur alimente : cloche (in-app), page /notifications, et canaux externes selon les préférences (email, SMS, push — selon la disponibilité technique, à cadrer au Sprint 0).
- **CA-E1 :** rejeu audit : un client envoie un message via l'application → la cloche du transporteur s'incrémente sans action de sa part ; l'événement figure dans /notifications.

### E2. Préférences de notifications côté transporteur — est. 4 j/h
- Remplacer les types « client » (« quand un transporteur soumet une offre ») par les types transporteur : nouvelles missions par gouvernorat(s), messages, statut des offres, paiements.
- Sélecteur de gouvernorats d'alerte (la « zone » promise par le dashboard devient réelle — lien avec B2).
- **CA-E2 :** l'écran Paramètres > Notifications ne contient plus aucun libellé orienté client pour un compte transporteur.

### E3. Assainissement du temps réel — est. 5 j/h
- Étude courte (0,5 j) : activer le WebSocket annoncé dans la stack OU assumer un polling propre.
- Éliminer les requêtes dupliquées observées (chaque GET partait en double) ; définir des intervalles raisonnables.
- **CA-E3 :** sur le parcours d'audit complet, plus aucune requête réseau en double ; réception d'un message < 5 s.

**Dépendances :** E1 avant E2 (les préférences filtrent des événements qui doivent exister). E1 dépend du choix push/SMS du Sprint 0.

---

## WS-F — TRAJETS RETOUR : CYCLE DE VIE COMPLET (P0/P1)

**Couvre :** C9, M4 · Manque n°4 · incohérence 5.

### F1. Modèle produit du trajet retour (D5) — est. 4 j/h (produit + UX)
- Spécifier l'écran de consultation DÉDIÉ (et non le gabarit mission client) : itinéraire, date, véhicule, capacité, prix indicatif, note, statut (Publié / Expiré / Réservé), demandes reçues.
- Spécifier le canal de contact client → transporteur (message direct ? demande structurée ?) selon D5.
- **Livrable :** maquettes + spécification du flux.

### F2. Édition / suppression / expiration (C9) — est. 8 j/h
- Boutons Modifier / Supprimer (avec confirmation) sur ses propres trajets retour ; expiration automatique après la date du trajet.
- Correction du 403 sur la consultation de ses propres annonces.
- **CA-F2 :** rejeu audit : publier un trajet retour → l'ouvrir → voir véhicule/capacité affichés, modifier la date, puis le supprimer. Aucun 403, aucun « vérifiez votre connexion ».

### F3. Visibilité côté client (validation du concept) — est. 3 j/h (test produit)
- Vérifier par la recette côté compte client que les trajets retour sont réellement trouvables et contactables (l'audit n'a pas pu le confirmer).
- **CA-F3 :** scénario bout-en-bout : client trouve le trajet retour de Mehdi, le contacte, le transporteur reçoit la notification (dépend E1).

**Dépendances :** D5 signée ; F2 après F1 ; F3 après E1.

---

## WS-G — RECHERCHE DE MISSIONS & AIDE À LA DÉCISION (P1)

**Couvre :** M5, M6, M8 · Manques n°5, 6 · Phase 4/5 de l'audit.

### G1. Filtres complets — est. 6 j/h
- 24 gouvernorats (réutiliser la liste du formulaire trajet retour), filtre **destination**, filtre date, fourchette de budget, type de service ; recherche texte (même composant que Mes Missions).
- Persistance des filtres (le transporteur retrouve ses critères à chaque session).
- **CA-G1 :** un transporteur de Sfax peut lister « missions vers Sfax » ; les 24 gouvernorats sont présents dans les deux sens.

### G2. Distance et durée estimées (M6) — est. 8 j/h
- Calcul de distance/durée (à partir des coordonnées GPS déjà présentes) affiché sur la carte mission ET le détail : « ≈ 270 km · ≈ 3 h 15 ».
- Prix rapporté au km affiché à titre indicatif dans le formulaire d'offre (« votre offre ≈ 0,55 TND/km »).
- Décision technique au cadrage : service de routing (OSRM/Google/local) — coût à valider.
- **CA-G2 :** rejeu audit : le détail de la mission #38 affiche distance et durée ; le « Estimation trajet : Tunis → Sfax » vide a disparu.

### G3. Complétude des données mission (M8) — est. 5 j/h (surtout côté client)
- Rendre poids/volume/photos obligatoires ou assumés : si absents, afficher « Non renseigné par le client » (jamais « - kg »).
- Encourager côté formulaire client la saisie (hors périmètre transporteur mais nécessaire à sa décision — à planifier avec l'équipe client).
- **CA-G3 :** plus aucun « - kg / - m³ » ; les photos client, quand elles existent, sont visibles sur le détail mission.

### G4. Vocabulaire transporteur (CTA) — est. 2 j/h
- « Voir l'offre » → « Voir la mission » ; « Récapitulatif de votre demande » → « Récapitulatif de la demande client » ; « répondre aux offres » → « proposer vos services » ; revue complète des libellés du parcours (avec l'UX writer).
- **CA-G4 :** relecture croisée : aucun écran transporteur ne parle au lecteur comme à un client.

**Dépendances :** G2 nécessite le choix du service de calcul d'itinéraire (Sprint 0, volet technique).

---

## WS-H — PROFIL, VÉRIFICATION & DOCUMENTS (P1)

**Couvre :** M2 (volet vérification), constats 3.12/3.13 · Manques n°9, 10.

### H1. Page Vérification complète — est. 8 j/h
- Liste des documents (CIN, permis, patente, assurance, carte grise) avec statut (validé / en attente / expiré / manquant), dates d'expiration, re-dépôt.
- Rappels automatiques avant expiration (dépend E1).
- **CA-H1 :** un compte vérifié voit ses documents et leurs échéances ; un document expiré déclenche une alerte et un état visible.

### H2. Profil véhicule structuré — est. 6 j/h
- Fiche véhicule (type, capacité kg/m³, photo, immatriculation) unique, réutilisée par : profil public, formulaire d'offre (pré-rempli), trajet retour.
- La complétude de profil (10 % constaté) intègre ces éléments et le pourcentage est cohérent avec le « taux de complétion » (B1 tranche les définitions).
- **CA-H2 :** renseigner le véhicule une fois → il apparaît sur le profil public et pré-remplit le trajet retour.

### H3. Ancienneté et statistiques exactes du profil — est. 2 j/h
- Le profil consomme l'endpoint stats unique (B2) : missions terminées, temps de réponse réels.
- **CA-H3 :** profil et dashboard strictement identiques sur les mêmes indicateurs.

---

## WS-I — MESSAGERIE (P1/P2)

**Couvre :** constats 3.10 · Manque n°8 · mineurs (AM/PM, message système anglais).

### I1. Lien direct mission → conversation — est. 2 j/h
- Le bouton « Messages » d'une carte mission ouvre LA conversation de la mission.
- **CA-I1 :** rejeu audit : depuis Mes Missions, un clic ouvre la bonne conversation.

### I2. Pièces jointes — est. 8 j/h
- Envoi de photos/documents (limites de taille et formats à fixer), aperçu, stockage sécurisé (cadrage technique au Sprint 0 : stockage média).
- **CA-I2 :** envoyer une photo de colis depuis le chat, la voir côté client.

### I3. Localisation des horodatages et messages système — est. 2 j/h
- Heures au format 24 h locale ; messages système traduits (« Statut : livrée » au lieu de « Status changed to completed »), en FR et AR.
- **CA-I3 :** aucun AM/PM ni message anglais dans la conversation.

**Dépendances :** I2 dépend du choix de stockage média (Sprint 0).

---

## WS-J — i18n, DESIGN & FINITIONS (P2)

**Couvre :** M9, M10 · mineurs (logo, titres d'onglets, GPS bruts, dates sans année, « 120.00 - ? TND », page détail d'offre).

### J1. Arabe complet + cohérence des réglages — est. 8 j/h
- Finir la traduction derja des écrans partiellement traduits (bannière onboarding, settings, contenus mixtes constatés).
- Aligner Paramètres > Langue avec la réalité : retirer « (Bientôt) » pour l'arabe, statuer sur l'anglais (D10) ; le commutateur d'entête et les Paramètres pilotent le même état.
- **CA-J1 :** en mode arabe, le parcours d'audit complet ne montre aucun texte français résiduel ; les deux commandes de langue sont synchronisées.

### J2. Réparation du mode sombre (M9) — est. 5 j/h
- Passe complète des écrans transporteur en dark : fonds, cartes, zones vides (le « bloc noir » constaté), contrastes AA.
- **CA-J2 :** capture avant/après de chaque écran du parcours en sombre, aucune zone illisible.

### J3. Micro-finitions visuelles — est. 5 j/h
- Logo : rendre le « T » lisible (« ransporti » constaté).
- `<title>` par page (« Mes offres — Transporti »).
- Dates avec année quand ambiguë ; suppression des GPS bruts au profit d'un lien/carte ; « 120.00 - ? TND » → « À partir de 120 TND » ; harmonisation « Budget non spécifié ».
- **CA-J3 :** revue visuelle croisée sur la check-list des mineurs de l'audit (§12) : 100 % traités ou explicitement reportés.

### J4. Page détail d'offre — est. 3 j/h
- « Voir » depuis Mes offres ouvre une vue de l'offre (montants, message, historique de statut, mission liée) au lieu de rediriger vers la mission.
- **CA-J4 :** le transporteur peut consulter son offre sans repasser par la mission.

---

## WS-K — CONTENUS & ACCOMPAGNEMENT TRANSPORTEUR (P2/P3)

**Couvre :** constats 3.14/3.17, incohérence 8 · Manques n°11, 13 (volet contenu), landing.

### K1. Centre d'aide transporteur — est. 4 j/h (contenu)
- Rédiger (UX writer + PO) : « Comment faire une bonne offre », « Comment est calculée la commission » (sortie directe de D1/D2), « Comment être payé », « Trajets retour mode d'emploi », « Règle de partage des coordonnées » (D8), « Litiges côté transporteur ».
- **CA-K1 :** la FAQ contient au moins autant d'entrées transporteur que client.

### K2. Landing : présence transporteur — est. 3 j/h
- Section dédiée transporteur visible sans scroll complet (proposition de valeur : revenus, trajets retour, paiement sécurisé) + CTA « Devenir transporteur » dans le header.
- **CA-K2 :** un transporteur qui arrive sur la home identifie son parcours en < 5 secondes (test utilisateur rapide).

### K3. Statistiques d'activité (développer son activité) — est. 8 j/h
- Onglet « Mon activité » : revenus par mois, missions par gouvernorat, taux d'acceptation des offres, note moyenne dans le temps (source : endpoint B2 étendu).
- **CA-K3 :** le transporteur répond seul aux questions « combien ai-je gagné ce mois-ci ? » et « quelle part de mes offres est acceptée ? ».

### K4. Navigation : hiérarchie du menu — est. 2 j/h
- Réordonner la sidebar selon la fréquence métier : Tableau de bord, **Trouver une mission**, **Mes offres**, **Mes Missions**, **Portefeuille**, Messages, Trajets retour, Notifications, Profil, Litiges, Aide, Paramètres. « Vérification » n'apparaît que si pertinent.
- **CA-K4 :** les 4 entrées les plus utilisées sont dans le premier tiers du menu.

---

## WS-L — QUALITÉ, RECETTE & NON-RÉGRESSION (transverse)

- **L1. Cahier de recette « parcours transporteur »** : transcrire les 20 phases de l'audit en scénarios rejouables (données du seed Sprint 0). Est. 5 j/h (QA).
- **L2. Rejeu systématique** : chaque lot clos = rejeu du/des scénarios d'audit liés + captures archivées. Est. continu.
- **L3. Tests de volumétrie** : liste de missions avec 200+ éléments (pagination, tri, performances perçues — non éprouvé dans l'audit). Est. 3 j/h.
- **L4. Couverture des zones non auditées** : inscription transporteur, flux Konnect client, litige bout-en-bout — à auditer pendant la Phase 2 pour ne pas découvrir de nouveaux P0 tardivement. Est. 5 j/h.
- **L5. Contre-audit final** : rejouer l'intégralité de l'audit d'origine, re-scorer les 9 dimensions, publier le rapport de re-audit. Critère : ≥ 75/100 et zéro P0/P1 ouvert. Est. 4 j/h.

---

# 4. SÉQUENCEMENT ET CALENDRIER INDICATIF

Hypothèse : équipe §1.1, démarrage S1 = semaine du 20 juillet 2026. Charge totale estimée ≈ **200 j/h** (hors imprévus, +20 % de réserve recommandée).

## Sprint 0 — Cadrage (1 semaine, S1)
- Décisions D1→D10 (ateliers métier), dossier signé.
- Environnement de recette + seed (§1.3).
- Choix techniques : routing (G2), stockage média (I2), canal push/SMS (E1), WebSocket vs polling (E3).
- Cahier de recette L1 démarré.

## Phase 1 — « Argent, vérité, feedback » (P0) — Sprints 1 à 3 (6 semaines, S2–S7)
| Sprint | Contenu | Jalon de sortie |
|---|---|---|
| Sprint 1 | WS-A A1+A4+A5 · WS-C C1'+C2' · WS-B B1 | La commission est unique ; une offre a un cycle de vie visible |
| Sprint 2 | WS-A A2 (portefeuille) + A3 (verrou paiement) · WS-B B2+B3 | /wallet en recette ; compteurs réconciliés ; onboarding conditionnel |
| Sprint 3 | WS-E E1+E2+E3 · WS-C C3'+C4' · WS-D D1' | Notifications entrantes actives ; zéro action silencieuse ; états de mission uniques |
- **Comité Go/No-Go n°1 (fin S7) :** rejeu des scénarios C1→C9 de l'audit → 9/9 fermés, sinon la phase se prolonge.

## Phase 2 — « Décider et exécuter comme un pro » (P1) — Sprints 4 à 6 (6 semaines, S8–S13)
| Sprint | Contenu |
|---|---|
| Sprint 4 | WS-F F1+F2+F3 (trajets retour complets) · WS-G G1 (filtres) |
| Sprint 5 | WS-G G2+G3+G4 (distance, données, vocabulaire) · WS-D D2' (étapes mission) |
| Sprint 6 | WS-D D3'+D4' (preuve de livraison, annulation) · WS-H H1+H2+H3 (documents, véhicule) · WS-L L4 (audit des zones non couvertes) |
- **Comité Go/No-Go n°2 (fin S13) :** M1→M11 fermés ; scénario bout-en-bout « mission avec POD + paiement libéré au portefeuille » démontré.

## Phase 3 — « Finition et adoption » (P2/P3) — Sprints 7 à 8 (4 semaines, S14–S17)
| Sprint | Contenu |
|---|---|
| Sprint 7 | WS-J J1+J2 (arabe complet, dark mode) · WS-I I1+I2+I3 (messagerie) |
| Sprint 8 | WS-J J3+J4 · WS-K K1→K4 (contenus, landing, activité, menu) · WS-L L3 (volumétrie) |

## Contre-audit et lancement — Semaine S18
- WS-L L5 : rejeu intégral de l'audit, re-scoring, rapport.
- **Comité Go/No-Go final :** score ≥ 75/100, zéro P0/P1, recette signée → déploiement pilote.
- Recommandation : **pilote fermé** avec 20–50 transporteurs réels (2 semaines) avant ouverture large ; boucle de retours hebdomadaire.

---

# 5. MATRICE DE TRAÇABILITÉ AUDIT → PLAN

| Constat audit | Lot / tâche | Phase |
|---|---|---|
| C1 Commission incohérente | WS-A A1 (+D1/D2) | 1 |
| C2 Aucun module paiements | WS-A A2 (+D4) | 1 |
| C3 Mission sans paiement sécurisé | WS-A A3 (+D3) | 1 |
| C4 Échec d'offre silencieux | WS-C C3' | 1 |
| C5 Succès d'offre sans confirmation | WS-C C2' | 1 |
| C6 Endpoint offres 405 | WS-C C1' | 1 |
| C7 Notifications entrantes muettes | WS-E E1 | 1 |
| C8 Compteur missions mensonger | WS-B B2 | 1 |
| C9 Trajet retour figé (ni édition ni suppression, 403) | WS-F F2 | 2 |
| M1 Statistiques contradictoires | WS-B B1+B2, WS-H H3 | 1 |
| M2 Bannière vérification permanente | WS-B B3 | 1 |
| M3 Prix négatif accepté | WS-A A4 | 1 |
| M4 Trajet retour rendu « mission client » | WS-F F1 (+D5) | 2 |
| M5 Filtres 8/24 gouvernorats | WS-G G1 | 2 |
| M6 Pas de distance/durée | WS-G G2 | 2 |
| M7 Triple état après livraison | WS-D D1' | 1 |
| M8 Poids/volume vides, pas de photos | WS-G G3 | 2 |
| M9 Dark mode cassé | WS-J J2 | 3 |
| M10 i18n incohérente | WS-J J1 (+D10) | 3 |
| M11 Validation silencieuse | WS-C C4' | 1 |
| Mineurs : logo, titres, AM/PM, formats, GPS, « ? TND », détail d'offre, messages système EN | WS-J J3+J4, WS-I I3, WS-A A5 | 3 |
| Manque 1 : portefeuille/retraits/factures | WS-A A2 | 1 |
| Manque 2 : alertes par zone | WS-E E1+E2 | 1 |
| Manque 3 : preuve de livraison | WS-D D3' (+D7) | 2 |
| Manque 4 : édition trajets retour | WS-F F2 | 2 |
| Manque 5 : distance/carte | WS-G G2 | 2 |
| Manque 6 : filtres complets | WS-G G1 | 2 |
| Manque 7 : étapes de mission | WS-D D2' (+D6) | 2 |
| Manque 8 : pièces jointes chat | WS-I I2 | 3 |
| Manque 9 : gestion documents | WS-H H1 | 2 |
| Manque 10 : profil véhicule | WS-H H2 | 2 |
| Manque 11 : statistiques de revenus | WS-K K3 | 3 |
| Manque 12 : contre-offres / négociation | **Hors périmètre de remédiation** — à instruire comme évolution produit après le pilote (dépend D5) | Post-pilote |
| Manque 13 : contrat de commission affiché | WS-A A1 + WS-K K1 | 1/3 |
| Manque 14 : PWA / offline | **Reporté** — à réévaluer avec la stratégie mobile (l'app React Native existante étant hors périmètre de cet audit) | Post-pilote |
| Incohérence 8 : règle de partage des coordonnées | WS-K K1 (+D8) | 3 |
| Navigation : hiérarchie du menu, entrée Portefeuille | WS-K K4, WS-A A2 | 1/3 |
| Performances : requêtes dupliquées, polling | WS-E E3 | 1 |
| Volumétrie non éprouvée | WS-L L3 | 3 |
| Zones non auditées (inscription, Konnect, litige complet) | WS-L L4 | 2 |

*(Tous les constats de l'audit sont couverts ; deux items sont explicitement reportés avec justification.)*

---

# 6. CRITÈRES GO/NO-GO ET INDICATEURS DE SUIVI

## 6.1 Portes de phase
- **Porte 1 (fin Phase 1) :** les 9 bugs critiques C1–C9 sont fermés par rejeu du scénario d'audit exact ; aucun nouvel écart financier au centime sur les 4 écrans monétaires.
- **Porte 2 (fin Phase 2) :** M1–M11 fermés ; démonstration bout-en-bout : mission trouvée par filtre destination → offre avec net garanti → exécution avec jalons → POD → confirmation → net crédité au portefeuille → notification à chaque étape.
- **Porte finale :** contre-audit L5 ≥ 75/100 ; zéro P0/P1 ouvert ; pilote fermé validé (satisfaction transporteurs ≥ 4/5, zéro réclamation financière).

## 6.2 Indicateurs de suivi hebdomadaires
- Nombre de constats d'audit fermés / total (burn-down de la matrice §5).
- Taux d'actions avec feedback visible (audité par échantillonnage QA) — cible 100 %.
- Écart maximal constaté entre deux affichages du même chiffre — cible 0.
- Temps de réception d'une notification entrante — cible < 5 s in-app.

## 6.3 Risques et parades

| Risque | Probabilité | Impact | Parade |
|---|---|---|---|
| Décisions métier D1–D5 tardives | Moyenne | Bloque la Phase 1 | Ateliers en semaine 1, décideur unique nommé, options par défaut recommandées dans ce plan |
| Intégration retraits (D4) dépendante d'un prestataire externe | Moyenne | Retarde A2 | Découpler : livrer solde+historique d'abord, retrait en « demande manuelle traitée back-office » en attendant l'automatisation |
| Le chantier notifications révèle une dette temps réel plus large | Moyenne | Étend E1/E3 | Étude technique au Sprint 0 ; fallback polling propre accepté pour le pilote |
| Régressions côté parcours client | Moyenne | Nouveaux bugs | Cahier de recette client minimal joué à chaque porte de phase |
| Divergence environnement dev/recette (constatée pendant l'audit) | Élevée | Résultats de recette non fiables | §1.3 traité en Sprint 0, bloquant |
| Sous-estimation (200 j/h serrés) | Moyenne | Glissement calendrier | Réserve +20 % ; périmètre P2/P3 sacrifiable avant le pilote, jamais P0/P1 |

---

# 7. RÉSUMÉ EXÉCUTIF DU PLAN

- **Durée totale : ~18 semaines** (1 sem. cadrage + 6 sem. P0 + 6 sem. P1 + 4 sem. P2/P3 + 1 sem. contre-audit), suivie d'un pilote fermé de 2 semaines.
- **Charge estimée : ~200 j/h** (+20 % de réserve) avec l'équipe décrite en §1.1.
- **3 phases, 3 portes de sortie mesurables**, chaque correction fermée par le rejeu du scénario d'audit qui l'a révélée.
- **10 décisions métier bloquantes** à trancher la première semaine — la plus structurante étant la définition contractuelle de la commission (D1/D2) et la règle paiement→exécution (D3).
- **Fil rouge :** rendre chaque dinar affiché exact, chaque action bavarde, chaque chiffre unique — puis seulement, polir.
