# AUDIT PROFESSIONNEL — PARCOURS TRANSPORTEUR
## Transporti V1 (plateforme web)

**Date :** 14 juillet 2026
**Auditeur :** Expert Produit Marketplace / Senior QA / UX / Consultant Transport & Logistique
**Compte testé :** `mehdi.khelifi@test.transporti.tn` (rôle TRANSPORTER, vérifié, 1 avis, 2 missions)
**Méthode :** Tests exclusivement via l'interface graphique (navigateur, viewport 1280×800 et 800px), observation des comportements réels. Aucune conclusion tirée du code source. Les codes HTTP cités proviennent de l'observation réseau du navigateur pendant l'utilisation normale.
**Périmètre :** Version web (dossier `frontend/`), conformément à la consigne d'exclure la version mobile.

---

## 1. RÉSUMÉ EXÉCUTIF

Transporti V1 présente un socle fonctionnel réel : le transporteur peut trouver des missions, soumettre des offres, suivre ses missions, discuter avec le client, publier des trajets retour et laisser des avis en double-aveugle. Plusieurs choix produit sont au-dessus du standard local (transparence de commission affichée dans le formulaire d'offre, avis mutuels masqués, score de confiance, localisation en derja tunisienne).

Mais l'application n'est **pas prête pour un déploiement auprès de transporteurs professionnels**, pour trois raisons rédhibitoires observées à l'écran :

1. **L'argent n'est pas fiable.** Le même chiffre change selon l'écran : un tarif saisi comme « net » de 150 TND devient un gain net de 148 TND dans « Mes offres » ; la commission est tantôt 12 %, tantôt 15 % ; les « gains totaux » valent 450,50 TND sur le tableau de bord et 68 TND sur « Mes Missions ». Aucun portefeuille, aucun historique de paiement, aucune fonction de retrait n'existe (`/wallet` et `/payments` → 404). Une mission a pu être exécutée et livrée alors que la réservation affichait « Mode de paiement en attente ».
2. **Le système ne parle pas au transporteur.** Soumission d'offre réussie : aucune confirmation visible, le formulaire vide réapparaît. Soumission en double : erreur 400 totalement silencieuse (message backend en anglais, jamais affiché). Message entrant d'un client : zéro notification. Erreur de chargement : « Vérifiez votre connexion internet » alors qu'il s'agit d'un refus d'autorisation (403).
3. **Les chiffres se contredisent partout.** « 27 missions disponibles » annoncées, 4 listées. « 3 offres actives » au dashboard, « 4 » sur Mes offres (dont une expirée et une retirée). « 0 missions terminées » sur le profil, « 2 » au dashboard. Bannière « Vérifiez votre identité — Étape 1/3 » affichée en permanence à un compte déjà « Vérifié ✓ ». Pour un professionnel dont c'est le revenu, cette dissonance détruit la confiance.

**Verdict : NO-GO en l'état** (score global : **48/100**). Le produit a une vraie colonne vertébrale et des idées différenciantes (trajets retour, avis double-aveugle), mais il faut corriger la couche financière, le feedback utilisateur et la cohérence des données avant toute mise en production.

---

## 2. ÉVALUATION GÉNÉRALE DU PARCOURS TRANSPORTEUR

| Question métier | Réponse observée |
|---|---|
| Trouver des missions ? | Partiellement — liste consultable mais filtres pauvres (8/24 gouvernorats, pas de destination, pas de rayon, pas de recherche texte), compteur mensonger (27 annoncées / 4 affichées) |
| Soumettre des offres ? | Oui, mais sans confirmation de succès ni message d'échec ; prix négatif accepté par le calculateur |
| Gérer ses trajets ? | Basique — actions présentes (livré, annuler, signaler) mais aucune étape intermédiaire (chargement, en route), pas de preuve de livraison |
| Discuter avec les clients ? | Oui — historique, accusés de lecture, réception ~8 s ; pas de pièces jointes, heures au format AM/PM |
| Recevoir ses paiements ? | **Non** — aucun portefeuille, aucun retrait, aucun historique financier |
| Gérer ses retours ? | À moitié — création soignée, mais consultation dégradée (rendu « mission client », 403 sur ses propres offres) et **ni modification ni suppression possibles** |
| Suivre son activité ? | Non fiable — statistiques contradictoires entre dashboard, profil et listes |
| Développer son activité ? | Embryonnaire — score de confiance et complétude de profil existent, mais pas d'historique de revenus, pas d'analytique, FAQ et paramètres orientés client |

**Première impression (Phase 1) — Note : 5/10.** La landing est claire, moderne et rassurante… pour un **client**. Le hero (« Envoyez vos colis »), le CTA principal (« Publier une annonce ») et les 3 étapes s'adressent à l'expéditeur ; « Devenir transporteur » n'apparaît qu'en toute fin de page. Un transporteur qui arrive sur le site ne se sent pas le bienvenu avant le dernier écran. Après connexion, en revanche, l'orientation est immédiate : « Bonjour, Mehdi 👋 — Trouvez des missions et développez votre activité », deux CTA pertinents (Parcourir les missions / Proposer un trajet retour). Le logo affiche « ransporti » (le pictogramme ne se lit pas comme un T) — détail, mais c'est la première chose que l'œil rencontre.

---

## 3. ANALYSE ÉCRAN PAR ÉCRAN

### 3.1 Tableau de bord (`/dashboard`)
- ✅ Accueil personnalisé, 4 KPI, bloc Performance, missions récentes, CTA clairs.
- ❌ Bannière d'onboarding « ÉTAPE 1/3 — Vérifiez votre identité » affichée alors que le bloc Performance du même écran dit « Statut vérification : Vérifié ✓ ». Elle réapparaît à chaque session.
- ❌ « 27 missions disponibles dans votre zone » : la liste n'en affiche que 4. Le compteur reflète toutes les missions publiées de la base (28 constatées), pas celles réellement proposées — et « votre zone » n'existe pas (aucune zone n'est définissable).
- ❌ « Gains totaux : 450,50 TND » incompatible avec « Mes Missions : Gains totaux 68 TND » et avec le profil (« 0 missions terminées »).
- ❌ « Taux de complétion 50 % » passé à 100 % après une livraison — le profil affichait déjà « 100.00 % » avant.

### 3.2 Trouver une mission (`/jobs/browse`)
- ✅ Cartes lisibles : type, urgence, budget, adresses, date de ramassage, nombre d'offres. Tri (récentes / prix ↑↓). Filtre type de service + gouvernorat de départ fonctionnel (testé : Tunis → 3 résultats).
- ❌ Filtre gouvernorat limité à **8 gouvernorats sur 24** (le formulaire trajet retour, lui, en propose 24).
- ❌ Pas de filtre destination — pourtant vital pour un transporteur qui cherche du fret de retour.
- ❌ Pas de recherche texte, pas de filtre date/prix/poids, pas de rayon, pas de carte, pas de pagination visible.
- ❌ Poids et volume affichés « - kg » / « - m³ » sur toutes les cartes.
- ❌ CTA « **Voir l'offre** » sur une carte de mission : le transporteur ne voit pas une offre, il consulte une demande. Vocabulaire inversé.

### 3.3 Détail de mission (`/jobs/38`)
- ✅ Stepper de statut (Publiée → Offres reçues → Assignée → En cours → Livrée). Budget client affiché. Règle métier explicitée (« Au-delà de 300 TND, seul le paiement digital sera proposé »). Panneau Confiance & Sécurité.
- ❌ Intitulé « **Récapitulatif de votre demande** » : c'est la copie de l'écran client, non adaptée au lecteur transporteur.
- ❌ **Aucune distance en km, aucune durée estimée** : « Estimation trajet : Tunis → Sfax » n'apporte rien. Impossible de calculer un coût au km — c'est LE critère de décision d'un transporteur.
- ❌ Pas de carte, pas de photos, poids/volume vides, pas de date d'arrivée.
- ❌ Client réduit à un nom + avatar : pas d'ancienneté, pas de note, pas d'historique — asymétrique avec la vérification exigée du transporteur.

### 3.4 Formulaire d'offre (intégré au détail)
- ✅ Concept excellent : « Votre tarif net (ce que vous gagnez) », commission 12 % ajoutée, prix total client calculé en direct.
- ❌ **Prix négatif accepté** : saisie de −50 → « Commission −6,00 TND, Prix total −56,00 TND » affichés sans broncher ; clic sur Envoyer : rien ne se passe, aucun message.
- ❌ **Succès silencieux** : après envoi réussi (201 observé), la page remonte en haut et **le même formulaire vide réapparaît**, comme si rien ne s'était passé. Aucun état « Votre offre a été envoyée ».
- ❌ **Échec silencieux** : renvoyer une offre → 400 (« You already submitted an offer for this job », en anglais) — l'écran n'affiche **rien**. Cause observable : l'appel de vérification des offres existantes échoue systématiquement (405 Method Not Allowed), donc la page ignore que le transporteur a déjà une offre en cours.

### 3.5 Mes offres (`/offers`)
- ✅ Le meilleur écran de l'app : onglets par statut avec compteurs, cartes complètes (trajet, client, message, prix/commission/gain), expiration (« Expire dans 71h »), actions contextuelles (Voir / Retirer / Contacter), rafraîchissement en direct après retrait.
- ❌ **KPI « OFFRES ACTIVES : 4 »** alors que les onglets révèlent 1 en attente + 2 acceptées + 1 expirée ; après retrait de l'offre en attente, le KPI reste à 4. Il compte tout, y compris expirées et retirées.
- ❌ **Incohérence financière majeure** : offre saisie 150 TND net → carte affichée « PRIX PROPOSÉ 168 TND / COMMISSION −20 TND / GAIN NET 148 TND », et « GAINS POTENTIELS 147,84 TND ». Le formulaire promettait 150 TND net ; « Mes offres » recalcule 12 % sur le brut. **Deux formules différentes pour la même offre.**
- ❌ « Voir » renvoie au détail de la mission ; il n'existe pas de page de détail d'offre.
- ✅ Retrait : modale de confirmation claire (« Cette action est irréversible ») — bon réflexe produit.

### 3.6 Mes Missions (`/jobs`)
- ✅ Onglets, recherche texte (présente ici mais absente de la recherche de missions !), cartes financières, accès Détails/Messages.
- ❌ « GAINS TOTAUX : 68 TND » vs 450,50 TND au dashboard.
- ❌ KPI « TOTAL : 2 » à côté d'un onglet « Toutes : 3 » (le trajet retour compte dans l'un, pas dans l'autre).
- ❌ Le bouton « Messages » d'une mission renvoie à la **liste générale** des conversations, pas à la conversation de la mission.

### 3.7 Mission en cours (`/jobs/2`) et livraison
- ✅ Actions complètes : Marquer comme livré (avec modale de confirmation), Ouvrir la messagerie, Voir la réservation, Annuler la mission, Signaler un problème. GPS + liens Maps.
- ❌ Aucune étape intermédiaire (arrivé au chargement / chargé / en route). Un déménagement de 450 TND se résume à un bouton binaire « livré ».
- ❌ **Aucune preuve de livraison** : ni photo, ni signature, ni code de confirmation.
- ❌ Après livraison : le header passe à « Terminée » alors que le panneau dit « En attente de confirmation — le client doit confirmer avant que votre paiement soit libéré », et un second panneau dit « Mission terminée — le transport a été effectué avec succès ». Trois messages d'état différents sur le même écran.
- ✅ Avis double-aveugle (note globale + Ponctualité / Soin / Communication + commentaire), verrouillé après envoi — fonctionnalité haut de gamme.

### 3.8 Réservation (`/booking/2`)
- ❌ « **Commission plateforme (15 %)** » alors que le formulaire d'offre affiche 12 %. Deux taux affichés au transporteur pour le même contrat.
- ❌ « **Mode de paiement en attente — sera défini lors de l'acceptation** » sur une mission déjà acceptée, en cours, puis livrée. L'escrow vanté sur tous les écrans n'était donc pas actif pendant l'exécution.

### 3.9 Trajet retour (`/jobs/return-trip` + consultation)
- ✅ Création : pédagogie (« Évitez le retour à vide »), 24 gouvernorats, 5 types de véhicules, capacité, prix indicatif, note. Publication OK (redirection vers Mes Missions, onglet dédié).
- ❌ Validation à vide silencieuse (clic sur Publier sans rien remplir : aucun message).
- ❌ Consultation : le trajet retour est rendu comme une **mission de client** (« Récapitulatif de votre demande », « Client : Mehdi Khelifi », « vous recevrez des offres sous forme d'enchères inversées ») ; le véhicule et la capacité saisis **ne sont affichés nulle part** ; budget rendu « 120.00 - ? TND ».
- ❌ Bloc « Offres reçues » : « Impossible de charger les offres. **Vérifiez votre connexion internet** » — en réalité un refus serveur (403) sur sa propre annonce.
- ❌ **Aucun bouton Modifier ni Supprimer.** Un trajet retour publié est figé — erreur de date ou de prix = annonce polluante à vie.
- 🧭 Conclusion Phase 9 : l'avantage concurrentiel est réel sur le papier, mais la moitié du cycle de vie (consulter correctement / modifier / supprimer / être contacté) n'existe pas encore.

### 3.10 Messagerie (`/messages`, `/messages/2`)
- ✅ Liste : recherche, compteurs non-lus, statut mission, dernier message. Conversation : séparateurs par jour, accusés de lecture (✓), lien vers la mission, bouton « Coordonnées » révélant téléphone + email du client assigné. Réception d'un message client en ~8 s sans recharger.
- ❌ **Pas de pièces jointes** (pas de photo de colis, pas de document).
- ❌ Heures « 04:09 PM » (format anglo-saxon dans une UI française) ; message système « 🤖 Status changed to completed » non traduit.
- ❌ Techniquement : rafraîchissement par polling très agressif (rafales de GET dupliqués), pas de WebSocket observé malgré la stack annoncée.
- ❌ Aucune notification (cloche) pour un message entrant — le transporteur doit ouvrir Messages pour savoir qu'on lui a écrit.

### 3.11 Paiements — **écran inexistant**
- `/wallet` → 404, `/payments` → 404, aucune entrée de menu.
- Aucun historique de transactions, aucun RIB/moyen de retrait, aucune facture, aucun récapitulatif de commissions.
- Les informations financières n'existent qu'en miettes contradictoires sur 4 écrans.
- **Un transporteur ne peut ni savoir combien il a gagné, ni comment il sera payé, ni demander un retrait.** C'est le manque le plus grave de l'application.

### 3.12 Profil (`/profile/3`)
- ✅ Badge Vérifié, score de confiance 65/100, avis clients, complétude de profil avec tâches (photo, véhicule), stats.
- ❌ « **0 missions terminées** » sur le profil vs 2 au dashboard ; « Taux de complétion 100.00 % » vs 50 % au dashboard (avant livraison).
- ❌ Véhicule « Non spécifié » — pourtant le trajet retour m'a demandé un type de véhicule ; les deux ne communiquent pas.
- ❌ Aucune section documents (permis, assurance, patente, CIN) alors que la vitrine promet « Transporteurs vérifiés (CIN, patente, assurance) ». Impossible de voir ou renouveler ses documents.

### 3.13 Vérification (`/verification`)
- ❌ Pour un compte vérifié : une seule phrase (« Profil Vérifié ✓ … Vous pouvez répondre aux offres »). Pas de liste de documents, pas de dates d'expiration, pas de renouvellement. Et le dashboard continue de réclamer la vérification.

### 3.14 Paramètres (`/settings`)
- ✅ 4 onglets propres (Profil / Notifications / Sécurité / Préférences), changement de mot de passe.
- ❌ Types de notifications **écrits pour un client** (« Nouvelles offres — quand un transporteur soumet une offre ») : le transporteur n'a aucun réglage « nouvelles missions dans ma zone ».
- ❌ Onglet Préférences : « العربية (Bientôt) » et « English (Coming soon) » **alors que le commutateur de l'entête active déjà l'arabe**. Contradiction flagrante.
- ❌ Pas de 2FA, pas de gestion de sessions, pas de suppression de compte.

### 3.15 Notifications (`/notifications` + cloche)
- ✅ La cloche fonctionne pour l'auto-feedback : « 🎉 Mission terminée » reçue après ma livraison. Page dédiée avec onglets Toutes/Non lues.
- ❌ **Zéro notification entrante** : message client envoyé par l'API officielle → aucune notification (vérifié serveur : `results: []`). Rien non plus pour les nouvelles missions publiées. Le canal le plus important pour gagner sa vie (réactivité aux opportunités et aux clients) est muet.

### 3.16 Litiges (`/disputes`)
- ✅ Écran propre : onglets par statut, état vide sympathique, explication du processus en 4 étapes (24-48h, remboursement 3-5 jours).
- ⚠️ Processus décrit côté « remboursement » (client) ; le cas transporteur (paiement retenu injustement) n'est pas évoqué. Création de litige non testée jusqu'au bout.

### 3.17 Centre d'aide (`/help`)
- ❌ 10 questions sur 11 orientées client. Aucun guide « Comment faire une bonne offre », « Comment être payé », « Comment fonctionne la commission ». Le transporteur est un citoyen de seconde zone de la documentation.

---

## 4. ANALYSE FONCTION PAR FONCTION

| Fonction | État | Note /10 |
|---|---|---|
| Inscription / connexion / déconnexion | Connexion fluide, logout propre, OAuth affiché (non testé) | 7 |
| Recherche de missions | Liste OK, filtres indigents, compteur faux | 4 |
| Détail mission | Lisible mais sans km, carte, photos, poids | 4 |
| Soumission d'offre | Fonctionne, transparence commission, mais feedback nul et validation absente | 4 |
| Suivi des offres | Meilleur écran ; KPI faux, formule commission incohérente | 6 |
| Exécution mission | Actions présentes ; pas d'étapes, pas de POD | 5 |
| Trajets retour | Création 8/10, cycle de vie 1/10 (ni édition, ni suppression, rendu erroné) | 4 |
| Chat | Solide pour du texte ; pas de PJ, pas de notif, polling | 6 |
| Paiements / portefeuille | **Inexistant** | 0 |
| Profil / confiance | Bonne base (score, badges, avis) ; stats fausses, documents absents | 5 |
| Vérification | Page vide, bannière contradictoire | 2 |
| Notifications | Sortantes OK, entrantes muettes | 2 |
| Paramètres | Basiques, orientés client, i18n contradictoire | 4 |
| Litiges | Cadre présent, non éprouvé | 5 |
| Avis / réputation | Double-aveugle + sous-notes : au-dessus du marché | 8 |

---

## 5. ANALYSE UX (Phases 16 & 19)

**Frictions majeures observées :**
1. Silence systémique — les trois formulaires testés (offre, offre dupliquée, trajet retour vide) échouent ou réussissent **sans un mot**. L'utilisateur apprend par déduction.
2. Vocabulaire client servi au transporteur — « votre demande », « Voir l'offre », « répondre aux offres », notifications « quand un transporteur soumet une offre ». L'app a été écrite côté client puis partagée telle quelle.
3. Chiffres non fiables — chaque écran a sa propre vérité (voir §14). L'utilisateur doit choisir qui croire.
4. Onboarding en boucle — la bannière « Étape 1/3 » réapparaît après chaque session pour un compte déjà vérifié ; le « Passer » n'est pas mémorisé.
5. Navigation de compensation — pour répondre à un client depuis une mission : Mes Missions → Messages (liste) → retrouver la conversation. Deux clics de trop, dix fois par jour.

**Notes par écran (Clarté / Rapidité / Simplicité / Ergonomie / Lisibilité / Accessibilité / Productivité / Esthétique, /10) :**

| Écran | C | R | S | E | L | A | P | Es | Moy |
|---|---|---|---|---|---|---|---|---|---|
| Landing | 8 | 7 | 8 | 7 | 8 | 6 | 5 | 8 | 7,1 |
| Login | 9 | 8 | 9 | 8 | 9 | 7 | 8 | 8 | 8,3 |
| Dashboard | 6 | 7 | 7 | 7 | 8 | 6 | 5 | 8 | 6,8 |
| Recherche missions | 6 | 7 | 7 | 5 | 7 | 6 | 4 | 7 | 6,1 |
| Détail mission | 6 | 6 | 7 | 5 | 7 | 6 | 4 | 7 | 6,0 |
| Formulaire offre | 7 | 7 | 8 | 4 | 8 | 5 | 4 | 7 | 6,3 |
| Mes offres | 8 | 7 | 8 | 7 | 8 | 6 | 7 | 8 | 7,4 |
| Mes missions | 7 | 7 | 8 | 7 | 8 | 6 | 6 | 8 | 7,1 |
| Trajet retour (création) | 8 | 7 | 8 | 6 | 8 | 6 | 6 | 8 | 7,1 |
| Trajet retour (consultation) | 2 | 5 | 3 | 2 | 5 | 5 | 1 | 5 | 3,5 |
| Chat | 7 | 6 | 8 | 7 | 8 | 6 | 6 | 7 | 6,9 |
| Profil | 6 | 7 | 7 | 6 | 8 | 6 | 5 | 8 | 6,6 |
| Paramètres | 6 | 7 | 7 | 6 | 8 | 6 | 5 | 7 | 6,5 |
| Notifications | 5 | 7 | 8 | 6 | 8 | 6 | 2 | 7 | 6,1 |
| Vérification | 3 | 8 | 6 | 3 | 7 | 6 | 1 | 5 | 4,9 |
| Litiges | 8 | 7 | 8 | 7 | 8 | 6 | 6 | 8 | 7,3 |

---

## 6. ANALYSE MÉTIER (Phase 17)

Workflow attendu : Mission → Offre → Attente → Acceptation → Paiement → Chat → Ramassage → Livraison → Confirmation → Paiement libéré → Évaluation.

**Ruptures observées :**
- **Paiement hors circuit** : la mission #2 (450 TND) était « En cours » puis « Livrée » avec une réservation affichant « Mode de paiement en attente — sera défini lors de l'acceptation ». Le paiement n'a jamais été sécurisé, contredisant la promesse d'escrow répétée sur chaque écran.
- **Ramassage inexistant** : aucun état entre « Assignée/En cours » et « Livrée ». Pas de confirmation de chargement, pas d'horodatage, pas de géo-validation.
- **Confirmation ambiguë** : après « Marquer comme livré », l'écran affirme simultanément « Terminée », « En attente de confirmation client » et « Le transport a été effectué avec succès ».
- **Détection d'offre existante cassée** : l'appel de contrôle échoue (405), donc l'app propose au transporteur de re-soumettre une offre qu'elle refusera ensuite en silence (400).
- **Trajet retour sans issue** : publié, il devient une pseudo-demande client que son auteur ne peut ni éditer, ni supprimer, ni suivre (403 sur ses propres offres).
- **Commission indéterminée** : 12 % (formulaire), 12 % sur brut (Mes offres), 15 % (réservation). Le contrat économique entre la plateforme et le transporteur n'est pas défini de manière univoque à l'écran.

---

## 7. ANALYSE DE LA NAVIGATION

- ✅ Sidebar complète et stable (12 entrées), état actif visible, footer « Connecté en tant que », bottom-nav mobile propre (Accueil/Missions/Offres/Notifs/Messages/Profil), logout accessible (menu avatar), breadcrumbs ponctuels (« Retour à la mission #2 »).
- ❌ **Hiérarchie inversée** : « Trouver une mission » — l'action n°1 du métier — est en 7e position, sous Litiges. « Mes offres » en 8e. Les entrées les plus utilisées sont les plus basses.
- ❌ **Pas d'entrée Paiements** (la fonction n'existe pas).
- ❌ « Vérification » reste dans le menu d'un compte vérifié, pointant vers une page vide.
- ❌ Titre d'onglet unique (« Transporti — La logistique réinventée ») sur toutes les pages : multi-onglets impossible à gérer, historique navigateur illisible.
- ❌ Le clic « Messages » d'une mission perd le contexte (liste générique).

---

## 8. PERFORMANCES PERÇUES

- Premier chargement : page blanche de plusieurs secondes (compilation dev partiellement en cause — à re-mesurer en production).
- Navigation entre pages : fluide (< 1 s perçu), transitions propres.
- Chat : réception ~8 s ; polling en rafales avec **requêtes systématiquement dupliquées** (chaque GET part en double), ce qui gaspille batterie/données — le WebSocket annoncé dans la stack n'a pas été observé.
- Aucune requête n'échoue en timeout ; les 4xx observés (405, 403, 400) sont des erreurs de logique, pas de lenteur.
- Listes courtes (4 missions) : pagination non éprouvée — comportement à 200+ missions inconnu.

---

## 9. COHÉRENCE INTERNE DE LA PLATEFORME WEB (parité client / transporteur)

L'audit portant sur la version web elle-même (mobile exclue par consigne), cette section évalue la parité de traitement entre les deux rôles de la même plateforme :

- Le **squelette** (design system, sidebar, cartes, modales) est partagé et cohérent entre rôles.
- Le **contenu** ne l'est pas : landing 100 % client, FAQ 10/11 client, paramètres de notifications client, libellés client dans les écrans transporteur (« votre demande », « Voir l'offre »), page vérification écrite pour l'étape client (« répondre aux offres »).
- Les **capacités** sont asymétriques : le client a un parcours de paiement (Konnect annoncé) ; le transporteur n'a même pas une page de solde.
- Verdict : le transporteur utilise visiblement une application pensée pour l'autre moitié du marché. Parité estimée : **40 %**.

---

## 10. BUGS CRITIQUES (P0)

| # | Bug | Observation |
|---|---|---|
| C1 | **Commission incohérente 12 % net / 12 % brut / 15 %** | Offre 150 TND « net » → « GAIN NET 148 TND » dans Mes offres (147,84 exact) ; réservation : « Commission (15%) » |
| C2 | **Aucun module paiements** | `/wallet`, `/payments` → 404 ; aucun retrait, aucun historique, aucune facture |
| C3 | **Mission exécutable sans paiement sécurisé** | Réservation « Mode de paiement en attente » sur mission en cours, puis livrée |
| C4 | **Échec d'offre 100 % silencieux** | 2e soumission → 400 backend (message en anglais), rien à l'écran |
| C5 | **Succès d'offre sans confirmation** | 201 → formulaire vide réaffiché, aucun état « offre envoyée », re-soumission invitée |
| C6 | **Endpoint offres en attente cassé** | `GET /api/offers/?status=PENDING` → 405 systématique (détection d'offre existante impossible) |
| C7 | **Notifications entrantes muettes** | Message client via API officielle → 0 notification (vérifié) ; aucune notif « nouvelle mission » |
| C8 | **Compteur missions mensonger** | « 27 missions disponibles » vs 4 listées |
| C9 | **Trajet retour ni modifiable ni supprimable** | Aucune action d'édition/suppression ; 403 + « vérifiez votre connexion » sur ses propres offres |

## 11. BUGS MAJEURS (P1)

| # | Bug |
|---|---|
| M1 | Statistiques contradictoires : gains 450,50 vs 68 TND ; offres actives 3 vs 4 ; missions terminées 0 (profil) vs 2 (dashboard) ; complétion 50 %/100 %/100.00 % ; TOTAL 2 vs Toutes 3 |
| M2 | Bannière « Vérifiez votre identité — Étape 1/3 » permanente pour un compte Vérifié ✓ |
| M3 | Prix négatif accepté par le calculateur d'offre (« Prix total : −56,00 TND ») |
| M4 | Trajet retour rendu comme mission client (véhicule/capacité saisis invisibles, « enchères inversées », « Client : Mehdi Khelifi ») |
| M5 | Filtre gouvernorats : 8/24 dans la recherche (24/24 dans trajet retour) |
| M6 | Aucune distance km / durée sur les missions (décision tarifaire impossible) |
| M7 | Triple message d'état contradictoire après livraison |
| M8 | Poids/volume « - kg / - m³ » partout ; pas de photos |
| M9 | Dark mode cassé : sidebar sombre, contenu clair, large zone noire vide |
| M10 | i18n incohérente : arabe activable dans l'entête mais « Bientôt » dans Paramètres ; bannières et pages entières restant en français en mode arabe |
| M11 | Validation de formulaire silencieuse (trajet retour vide, offre vide) |

## 12. BUGS MINEURS (P2/P3)

- Logo rendu « ransporti » (pictogramme illisible comme T).
- Heures au format AM/PM dans une interface française ; année absente de certaines dates (« mardi 1 décembre à 11:00 »).
- Formats monétaires mixtes : « 100.00 - 300.00 TND », « 450,50 TND », « 147,84 », « 168 TND ».
- Message système chat « 🤖 Status changed to completed » en anglais.
- « Budget non spécifié » vs « 120.00 - ? TND » pour la même absence de donnée.
- Coordonnées GPS brutes affichées (36.80080, 10.18600).
- `<title>` identique sur toutes les pages.
- Requêtes réseau systématiquement dupliquées.
- « Voir » d'une offre pointe vers la mission (pas de détail d'offre).

## 13. FONCTIONNALITÉS MANQUANTES

**Bloquantes pour un usage professionnel quotidien :**
1. Portefeuille / historique de paiements / demande de retrait / factures et récapitulatif de commissions.
2. Notifications entrantes (nouvelles missions par zone, message reçu, offre acceptée/refusée) + alertes configurables par gouvernorat.
3. Preuve de livraison (photo, signature, code PIN client).
4. Édition/suppression/duplication des trajets retour.
5. Distance et durée estimées par mission ; carte de l'itinéraire.

**Importantes :**
6. Filtres complets (24 gouvernorats, destination, date, budget, poids) + tri par distance.
7. Étapes de mission (chargé / en route / arrivé) avec horodatage.
8. Pièces jointes dans le chat.
9. Gestion des documents (permis, assurance, patente) avec dates d'expiration.
10. Profil véhicule structuré réutilisé dans les offres et trajets retour.
11. Statistiques de revenus (par mois, par trajet, taux d'acceptation des offres).
12. Contre-offres / négociation (le modèle « enchères inversées » est annoncé mais aucune trace visible).
13. Historique / conditions de la commission (contrat économique affiché).
14. Mode hors-ligne / PWA (métier mobile par nature).

## 14. INCOHÉRENCES MÉTIER (récapitulatif)

1. Le prix « net garanti » du formulaire n'est pas le net payé (148 ≠ 150).
2. Deux taux de commission affichés pour un même contrat (12 % / 15 %).
3. Mission exécutée et livrée sans mode de paiement défini, malgré la promesse d'escrow.
4. Un compte vérifié sommé de se vérifier (étape 1/3) sur l'écran principal.
5. Le transporteur devient « client » de son propre trajet retour, avec un mécanisme d'enchères qui ne correspond pas au concept.
6. « 27 missions dans votre zone » sans notion de zone, et sans rapport avec la liste réelle.
7. Statut « Terminée » avant confirmation client, avec paiement « à libérer » sans circuit de paiement.
8. La FAQ interdit le partage de numéro avant réservation, mais l'app affiche les « Coordonnées » complètes après assignation — règle jamais expliquée au transporteur.

## 15. COMPARAISON AVEC LES LEADERS

| Capacité | Uber Freight / Convoy | Sennder | Amazon Relay | Lalamove / Bolt | **Transporti** |
|---|---|---|---|---|---|
| Prix au km affiché | ✅ | ✅ | ✅ | ✅ | ❌ (pas même la distance) |
| Réservation instantanée / enchère | ✅ | ✅ | ✅ | ✅ | ⚠️ offre simple, négociation absente |
| Preuve de livraison (POD) | ✅ | ✅ | ✅ | ✅ | ❌ |
| Étapes de mission trackées | ✅ | ✅ | ✅ | ✅ | ❌ (binaire) |
| Paiement / portefeuille chauffeur | ✅ (délais garantis) | ✅ | ✅ | ✅ | ❌ |
| Alertes de fret par zone | ✅ | ✅ | ✅ | ✅ | ❌ |
| Score / réputation | ✅ | ✅ | ✅ | ✅ | ✅ (+ double-aveugle, mieux que certains) |
| Trajets retour / repositionnement | ⚠️ suggestions | ✅ | ⚠️ | ❌ | ✅ concept présent (exécution incomplète) |
| Localisation dialectale | ❌ | ❌ | ❌ | ⚠️ | ✅ derja tunisienne — différenciant |

**Points forts à capitaliser :** avis double-aveugle avec sous-notes, transparence de commission au moment de l'offre (une fois la formule unifiée), trajets retour, derja, score de confiance, règle des 300 TND explicite.
**Écart principal :** tout ce qui touche à l'argent et au temps réel — précisément ce qui fait vivre un transporteur.

## 16. SCORE GLOBAL : **48/100**

| Dimension | Note /100 | Justification courte |
|---|---|---|
| Fonctionnalités | 52 | Socle complet mais paiements absents, retours à moitié, notifications muettes |
| Ergonomie | 55 | Écrans propres, mais silence des formulaires et frictions de navigation |
| Design | 62 | Design system cohérent et moderne ; dark mode cassé, logo tronqué, formats mixtes |
| Navigation | 60 | Sidebar claire ; hiérarchie inversée, contexte perdu (Messages), titres d'onglets uniques |
| Performance | 55 | Fluide à petite échelle ; polling en rafales dupliquées, 1er chargement lent |
| Confiance | 35 | Chiffres financiers contradictoires + compteurs faux + bannière de vérification erronée |
| Productivité | 42 | Pas d'alertes, pas de filtres sérieux, pas de bilan financier : le quotidien reste manuel |
| Expérience transporteur | 45 | L'app parle client au transporteur ; ses écrans à lui sont les moins finis |
| Parité client/transporteur | 40 | Contenu, aide, paramètres et paiements pensés pour le client |

## 17. AVIS D'EXPERT — DÉCISION DE DÉPLOIEMENT

**Décision : NON au déploiement en l'état auprès de milliers de transporteurs tunisiens.**

Trois raisons pratiques, vécues pendant le test comme les vivrait un chauffeur :

1. **Je ne sais pas combien je gagne ni comment je serai payé.** On m'a promis 150 TND, un autre écran m'en montre 148 ; une commission de 12 % devient 15 % ; mes « gains totaux » varient de 68 à 450,50 TND selon la page ; et il n'existe nulle part un solde, un retrait ou une facture. Aucun professionnel ne confiera son revenu à cet écosystème de chiffres.
2. **L'application ne me prévient de rien et ne me répond pas.** Mes offres partent sans accusé, échouent sans message ; les clients m'écrivent sans que la cloche ne bouge ; mes erreurs affichent « vérifiez votre connexion ». Sur la route, entre deux chargements, ce silence coûte des missions.
3. **Les fondations, elles, sont bonnes.** Le parcours offre→mission→livraison→avis fonctionne de bout en bout ; les avis double-aveugle, le score de confiance, la transparence de commission (dans son intention) et les trajets retour sont des choix produit supérieurs à la moyenne du marché ; la derja est un vrai atout d'adoption. Ce n'est pas une refonte qu'il faut, c'est un chantier de fiabilisation.

**Chemin critique avant production (P0) :** unifier la formule de commission et l'afficher contractuellement (1 seul taux, 1 seule définition du net) ; livrer un module Paiements minimal (solde, historique, retrait) ; réparer la détection d'offre existante (405) et donner un feedback à chaque action (succès + erreurs traduites) ; brancher les notifications entrantes (message, offre acceptée, nouvelle mission) ; réconcilier tous les compteurs sur une source unique ; verrouiller le lien paiement→exécution (pas de mission « en cours » sans paiement sécurisé) ; compléter le cycle de vie des trajets retour (édition, suppression, rendu dédié).

**P1 :** distance/durée sur les missions, preuve de livraison, filtres complets (24 gouvernorats + destination), étapes de mission, bannière d'onboarding conditionnelle, i18n arabe complète.
**P2 :** pièces jointes chat, gestion documentaire avec expirations, statistiques de revenus, dark mode, formats de dates/devise unifiés.
**P3/P4 :** page détail d'offre, carte interactive, contre-offres, PWA/offline, centre d'aide transporteur.

Avec ces corrections — dont aucune n'exige de refonte architecturale visible — Transporti a le potentiel de devenir la référence tunisienne du fret digitalisé. En l'état, un déploiement massif brûlerait la confiance du public le plus difficile à reconquérir : les professionnels.

---
*Rapport établi sur la base de comportements observés dans l'interface graphique les 13–14 juillet 2026. Non couvert : inscription d'un nouveau transporteur, flux Konnect côté client, création de litige de bout en bout, pagination à forte volumétrie, application mobile (exclue par consigne).*
