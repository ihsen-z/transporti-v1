# CAHIER DE RECETTE — PARCOURS TRANSPORTEUR
## Transporti V1 (plateforme web)

**Version :** 1.0 (Sprint 0) — 14 juillet 2026
**Source :** `docs/AUDIT_PARCOURS_TRANSPORTEUR_2026-07-14.md` · Plan : `docs/PLAN_EXECUTION_REMEDIATION_TRANSPORTEUR_2026-07-14.md`
**Usage :** chaque scénario reproduit un constat de l'audit. Un lot n'est « fermé » que lorsque ses scénarios passent en environnement de recette de référence, avec captures archivées.

## Conventions
- **Compte transporteur de recette :** `mehdi.khelifi@test.transporti.tn` / seed standard
- **Compte client de recette :** `ahmed.trabelsi@test.transporti.tn` / seed standard
- **Préconditions communes :** environnement de recette réinitialisé (procédure §Reset du guide d'environnement), navigateur 1280×800, langue FR sauf mention contraire.
- **Statuts :** ✅ Passe · ❌ Échec · ⏸ Bloqué (dépendance) · N/A
- Chaque exécution : date, testeur, build, capture(s).

---

## BLOC A — FIABILITÉ FINANCIÈRE (WS-A)

### REC-A1 — Cohérence de la commission sur les 4 écrans (ferme C1)
1. Ouvrir une mission publiée de type Transport, saisir un tarif de **150 TND** dans le formulaire d'offre.
2. Noter le taux, le montant de commission et le prix client affichés dans le formulaire.
3. Envoyer l'offre. Ouvrir **Mes offres** : relever prix proposé / commission / gain net.
4. (Après acceptation par le client de recette) ouvrir **Réservation** : relever prix / commission / net.
5. Ouvrir **Mes Missions** : relever les mêmes montants.
- **Attendu :** taux identique partout selon la décision D1/D2 ; le net transporteur est identique **au millime** sur les 4 écrans ; le taux et sa base sont libellés explicitement (« x % du … »).
- **Échec type (audit) :** 150 net promis → 148 affiché ; 12 % vs 15 %.

### REC-A2 — Portefeuille (ferme C2)
1. Menu latéral → vérifier la présence de l'entrée **Portefeuille**.
2. Ouvrir `/wallet` : vérifier blocs Solde disponible / En attente / Historique / Retrait.
3. Dérouler le scénario REC-D3 (mission livrée + confirmée) puis revenir : le net de la mission apparaît « En attente » puis « Disponible ».
4. Faire une demande de retrait (selon D4) : statut visible et suivi.
5. Vérifier l'historique : 1 ligne par mouvement avec mission, date, montants, statut ; export CSV.
- **Attendu :** aucun 404 ; chiffres égaux à ceux de REC-A1.

### REC-A3 — Verrou paiement → exécution (ferme C3)
1. Client accepte une offre SANS finaliser le mode de paiement.
2. Transporteur tente de démarrer la mission (ou le système tente la transition).
- **Attendu (selon D3) :** transition bloquée avec message explicite, OU statut « Paiement à la livraison (espèces) » affiché sans ambiguïté AVANT l'acceptation côté transporteur. Impossible d'avoir une mission « En cours » avec réservation « Mode de paiement en attente ».

### REC-A4 — Validation des prix (ferme M3)
1. Dans le formulaire d'offre, saisir **-50**, puis **0**, puis un prix hors fourchette plausible.
- **Attendu :** erreur inline immédiate sous le champ (FR/AR), bouton d'envoi inactif, aucun total négatif affiché nulle part.

### REC-A5 — Format monétaire unique (ferme mineur « formats »)
1. Parcourir : dashboard, browse, détail mission, formulaire d'offre, Mes offres, Mes Missions, réservation, portefeuille.
- **Attendu :** un seul format d'affichage monétaire (séparateurs, décimales, position du symbole) sur tous les écrans, FR et AR.

---

## BLOC B — COHÉRENCE DES DONNÉES (WS-B)

### REC-B1 — Compteur « missions disponibles » (ferme C8)
1. Relever le chiffre « Missions disponibles » du dashboard.
2. Ouvrir « Trouver une mission » sans toucher aux filtres : compter les cartes (toutes pages).
- **Attendu :** égalité stricte au même instant.

### REC-B2 — KPI d'offres (ferme M1 partie offres)
1. Relever « Offres actives » (dashboard et Mes offres).
2. Retirer une offre en attente.
- **Attendu :** les deux KPI affichent la même valeur, décrémentée immédiatement ; les offres expirées/retirées n'entrent pas dans « actives » (définition B1).

### REC-B3 — Gains totaux et missions terminées (ferme M1 partie gains/stats)
1. Relever « Gains totaux » et « Missions terminées » sur : dashboard, Mes Missions, profil public.
- **Attendu :** valeurs identiques sur les trois écrans, conformes au dictionnaire KPI (B1).

### REC-B4 — Onboarding conditionnel (ferme M2)
1. Se connecter avec le compte transporteur **vérifié** → aucune bannière « Vérifiez votre identité ».
2. Se connecter avec un compte transporteur **non vérifié** du seed → bannière présente, à la bonne étape ; cliquer « Passer » ; se reconnecter → l'étape passée ne réapparaît pas.

### REC-B5 — Cohérence TOTAL vs onglets (ferme M1 partie Mes Missions)
1. Ouvrir Mes Missions avec 2 missions + 1 trajet retour au seed.
- **Attendu :** le KPI TOTAL et l'onglet « Toutes » comptent le même périmètre (défini en B1), affichent le même nombre.

---

## BLOC C — FEEDBACK & CYCLE DE VIE DES OFFRES (WS-C)

### REC-C1 — Plus aucun 405 (ferme C6)
1. Ouvrir le détail d'une mission publiée, console réseau ouverte.
- **Attendu :** tous les appels ≤ 400 ; l'appel « mes offres en attente » répond 200.

### REC-C2 — Confirmation de soumission (ferme C5)
1. Soumettre une offre valide (150 TND, message).
- **Attendu :** confirmation visible ≥ 4 s ; le formulaire est remplacé par la carte « Votre offre — En attente » (montant, actions Retirer / Voir mes offres) ; retour ultérieur sur la page → même carte, pas de formulaire vide.

### REC-C3 — Double soumission impossible et expliquée (ferme C4)
1. Via un second onglet resté sur l'ancien état, tenter de re-soumettre une offre sur la même mission.
- **Attendu :** message d'erreur **en français** (et en AR en mode AR) affiché à l'écran ; aucun échec silencieux.

### REC-C4 — Erreurs honnêtes (ferme C4/C9 partie messages)
1. Simuler un 403 (ouvrir une ressource interdite) et une coupure backend (service arrêté).
- **Attendu :** deux messages distincts : « accès non autorisé » vs « service momentanément indisponible » ; plus jamais « Vérifiez votre connexion internet » pour un refus serveur.

### REC-C5 — Validation des formulaires (ferme M11)
1. Soumettre à vide : formulaire d'offre, trajet retour, avis, litige.
- **Attendu :** erreurs inline sous chaque champ requis, focus sur le premier champ en erreur, pas d'appel réseau émis.

---

## BLOC D — EXÉCUTION DE MISSION (WS-D)

### REC-D1 — État unique après livraison (ferme M7) — ✅ D1' livré (Sprint 7, 20/07)
1. Sur une mission en cours, « Marquer comme livré » (avec preuve selon D7).
- **Attendu :** UN seul panneau d'état (composant `PostDeliveryPanel`) selon l'état réel :
  - client, non encore confirmé → **une seule** carte ambre « Confirmer la livraison / Confirmez la réception pour libérer le paiement » (jamais accompagnée d'un « Mission terminée » vert) ;
  - transporteur, non encore confirmé → carte info « en attente de confirmation client » ;
  - après confirmation client → **une seule** carte verte « Mission terminée · paiement libéré ».
  Header, stepper et panneau alignés. La section avis reste distincte.
- **Vérifié navigateur (20/07) :** job confirmé = 1 carte verte + note « avis déjà laissé » ; job non confirmé = 1 carte ambre seule, sans vert contradictoire.

### REC-D2 — Étapes intermédiaires (Manque 7, selon D6)
1. Mission assignée : vérifier que l'écran propose UNE action suivante claire (ex. « Je suis arrivé au chargement » → « Chargement effectué » → « Marquer comme livré »).
- **Attendu :** jalons horodatés visibles côté transporteur et client.

### REC-D3 — Preuve de livraison (Manque 3, selon D7)
1. Tenter « Marquer comme livré » sans preuve → blocage expliqué.
2. Fournir la preuve (photo + code PIN client selon D7) → livraison enregistrée.
- **Attendu :** preuve consultable dans le détail mission ; réutilisable en litige.

### REC-D4 — Annulation encadrée
1. « Annuler la mission » sur une mission assignée.
- **Attendu :** motif obligatoire, rappel de l'impact (score de confiance), double confirmation.

---

## BLOC E — NOTIFICATIONS & TEMPS RÉEL (WS-E)

### REC-E1 — Message entrant (ferme C7)
1. Le client envoie un message via SON interface (pas de fixture DB).
2. Côté transporteur, ne rien toucher.
- **Attendu :** cloche incrémentée < 5 s ; événement listé dans /notifications ; email/push selon préférences actives.

### REC-E2 — Offre acceptée / refusée
1. Le client accepte (puis, sur une autre offre, refuse).
- **Attendu :** notification transporteur pour chacune, avec lien direct vers l'offre/mission.

### REC-E3 — Nouvelle mission dans ma zone
1. Transporteur configure ses gouvernorats d'alerte (Paramètres > Notifications).
2. Le client publie une mission au départ d'un gouvernorat couvert, puis une hors zone.
- **Attendu :** notification pour la première uniquement.

### REC-E4 — Préférences transporteur (ferme M-« paramètres client »)
1. Ouvrir Paramètres > Notifications avec le compte transporteur.
- **Attendu :** aucun libellé orienté client ; les toggles persistent après rechargement et sont réellement respectés (tester un toggle OFF).

### REC-E5 — Réseau propre (ferme perf/polling) — ✅ E3 assaini (Sprint 7, 20/07)
1. Rester 2 minutes sur la messagerie, console réseau ouverte.
- **Attendu :** aucune requête dupliquée à l'identique au même instant ; cadence stable conforme à l'intervalle documenté (inbox 30 s, fil 10 s).
- **Correctif E3 :** pollers messages (inbox + fil) réécrits sur référence stable → l'intervalle est créé **une seule fois** et ne se ré-abonne plus quand l'identité d'un callback change (dépendance i18n `t`). Cleanup symétrique → pas de fuite au double-montage React StrictMode. « Double pollers » AppHeader/BottomNav déjà consolidés en `NotificationContext` (S6).
- **Note :** en développement, StrictMode double transitoirement les requêtes (artefact dev, absent en production) ; le critère est l'**absence de dérive** de la cadence (pas d'accumulation d'intervalles), vérifiée le 20/07.

---

## BLOC F — TRAJETS RETOUR (WS-F)

### REC-F1 — Création avec validation
1. Publier un trajet retour complet (Sousse→Tunis, date, véhicule, capacité, prix, note).
- **Attendu :** confirmation visible ; le trajet apparaît dans l'onglet dédié avec badge de statut.

### REC-F2 — Consultation dédiée (ferme M4)
1. Ouvrir le trajet retour créé.
- **Attendu :** gabarit « Trajet retour » (PAS « Récapitulatif de votre demande ») affichant : itinéraire, date, **véhicule et capacité saisis**, prix indicatif propre (pas de « ? TND »), statut, demandes reçues ; aucune mention d'« enchères inversées » (sauf décision D5 contraire).

### REC-F3 — Édition et suppression (ferme C9)
1. Modifier la date du trajet retour → sauvegarder → vérifier la mise à jour.
2. Supprimer le trajet (avec confirmation) → il disparaît de la liste et de la recherche client.
- **Attendu :** aucune erreur 403 ; plus de message « Vérifiez votre connexion internet ».

### REC-F4 — Boucle complète côté client
1. Avec le compte client, trouver le trajet retour publié, engager le contact (selon D5).
- **Attendu :** le transporteur reçoit une notification (REC-E1) et peut poursuivre l'échange.

### REC-F5 — Expiration automatique
1. Trajet retour dont la date est passée (seed dédié).
- **Attendu :** statut « Expiré », retiré de la recherche client.

---

## BLOC G — RECHERCHE & DÉCISION (WS-G)

### REC-G1 — Filtres complets (ferme M5, Manque 6)
1. Vérifier : 24 gouvernorats au départ ET à destination ; filtres date et budget ; recherche texte.
2. Filtrer « destination = Sfax » → seules les missions vers Sfax restent.
3. Recharger la page → les filtres sont conservés.

### REC-G2 — Distance et durée (ferme M6)
1. Ouvrir une carte mission et son détail.
- **Attendu :** « ≈ X km · ≈ Y h » affichés ; dans le formulaire d'offre, l'indicatif TND/km apparaît.

### REC-G3 — Données mission complètes (ferme M8)
1. Mission de seed sans poids/volume ; mission avec photos.
- **Attendu :** « Non renseigné par le client » (jamais « - kg ») ; photos visibles dans le détail.

### REC-G4 — Vocabulaire transporteur (ferme mineurs libellés)
1. Relire browse, détail mission, vérification, notifications, aide avec la grille : « ce texte s'adresse-t-il à un transporteur ? »
- **Attendu :** plus aucun « Voir l'offre » sur une mission, « votre demande », « répondre aux offres ».

---

## BLOC H — PROFIL & DOCUMENTS (WS-H)

### REC-H1 — Page vérification complète — ✅ WS-H expirations livré (Sprint 7, 20/07)
1. Compte vérifié : liste des documents avec statuts et dates d'expiration ; re-dépôt possible.
2. Compte avec document expiré (seed) : badge visible.
- **Attendu (expirations WS-H) :**
  - badge d'expiration calculé **côté serveur** (`is_expired` / `expires_soon`, seuil 30 j) : **rouge « Expiré »**, **ambre « Expire bientôt, le … »**, **gris « Expire le … »** ; aucun badge sur les documents qui n'expirent pas (CIN, selfie) ;
  - à l'upload, un **sélecteur de date d'expiration** apparaît uniquement pour Permis / Carte grise / Assurance (pas la CIN) ; l'envoi est bloqué si la date manque ; le backend refuse une date passée.
- **Vérifié navigateur (20/07) :** les trois badges colorés + le sélecteur pour les seuls types expirants ; 8 tests backend WS-H verts.

### REC-H2 — Véhicule structuré
1. Renseigner le véhicule dans le profil (type, capacité, photo).
2. Créer un trajet retour → champs véhicule pré-remplis ; profil public → véhicule affiché.

### REC-H3 — Stats de profil exactes
1. Comparer profil public vs dashboard (missions terminées, note, temps de réponse).
- **Attendu :** identiques (source unique B2).

---

## BLOC I — MESSAGERIE (WS-I)

### REC-I1 — Contexte conservé
1. Depuis une carte de Mes Missions, cliquer « Messages ».
- **Attendu :** ouverture directe de LA conversation de cette mission.

### REC-I2 — Pièces jointes
1. Envoyer une photo depuis le chat transporteur ; le client l'ouvre ; tester un fichier trop volumineux.
- **Attendu :** aperçu, téléchargement OK ; erreur claire si limite dépassée.

### REC-I3 — Localisation du chat
1. Vérifier horodatages (24 h locale, année si ambiguë) et messages système en FR (et AR en mode AR).
- **Attendu :** aucun « PM », aucun « Status changed to… ».

---

## BLOC J — i18n & DESIGN (WS-J)

### REC-J1 — Arabe complet
1. Basculer en AR ; rejouer le parcours complet (dashboard → browse → détail → offre → Mes offres → mission → chat → paramètres).
- **Attendu :** aucun texte FR résiduel ; RTL correct ; Paramètres > Langue synchronisé avec le commutateur d'entête (plus de « Bientôt » mensonger).

### REC-J2 — Mode sombre
1. Activer le mode sombre ; parcourir les mêmes écrans.
- **Attendu :** aucun bloc blanc sur fond noir ni zone noire vide ; contrastes lisibles.

### REC-J3 — Micro-finitions
1. Check-list : logo « T » lisible ; `<title>` distinct par page ; dates avec année ; pas de GPS bruts ; « À partir de 120 TND » ; format budget unifié.

### REC-J4 — Détail d'offre
1. Depuis Mes offres, cliquer « Voir ».
- **Attendu :** vue de L'OFFRE (montants, message, historique de statut, lien mission), pas une redirection sèche vers la mission.

---

## BLOC K — CONTENUS & NAVIGATION (WS-K)

### REC-K1 — Aide transporteur : les 6 articles prévus (offre, commission, paiement, trajets retour, coordonnées, litiges) sont présents et exacts (chiffres = D1/D2). — ✅ WS-K livré (Sprint 8, 20/07)
- Centre d'aide `/help` réécrit **orienté pivot**, **bilingue FR+AR** (namespace i18n `help`) et **par rôle** : onglets « Je suis client » / « Je suis transporteur » (défaut = rôle connecté).
- **Transporteur** : publier ses retours (NSM/revenus), commission **8 %** trajets retour (D13) avec net garanti (D1), vérification + **expiration des documents** (WS-H), gains + **retrait manuel** (D4). **Client** : trajets retour (repli alerte + demande pré-remplie), demande structurée (D5) + **règle coordonnées** (D8), escrow (D3) + litige.
- **Vérifié live (20/07, stack Docker)** : `/help` rendu en FR **et AR** (`dir=rtl`, derja) ; onglets « Je suis client / Je suis transporteur » basculent les sections ; accordéon affiche le contenu exact (commission 8 % D13 + net garanti D1) ; console propre. Typecheck clean.
### REC-K2 — Landing : section transporteur visible, CTA « Devenir transporteur » dans le header.
### REC-K3 — Mon activité : revenus par mois, taux d'acceptation, missions par gouvernorat cohérents avec le portefeuille. — ✅ orienté remplissage (Sprint 8, 20/07)
- La carte **Performance** du dashboard transporteur affiche désormais, en plus de la note et du taux de complétion, une **barre « Taux de remplissage »** (violette) + le détail « X/Y trajets retour remplis · Z km à vide transformés ». Métriques calculées **côté serveur** (`get_transporter_stats`, K12 : `fill_rate`, `km_transformed` = distance des trajets retour livrés = NSM perso) — jamais recalculées au front.
- **Vérifié live (20/07)** en FR **et AR** (`dir=rtl`, « نسبة التعمير ») ; état vide honnête « — / 0/0 · 0 km » ; suite logistics 92 tests OK.
- **Note recette** : le matching trajets retour (`/api/return-trips/match/`) 500ait sur PostgreSQL (`abs(interval)`) — corrigé le 21/07 ; rejouer REC-P (recherche trajet retour avec date) **sur Postgres**, pas seulement SQLite.
### REC-K4 — Menu : Trouver une mission / Mes offres / Mes Missions / Portefeuille dans le premier tiers ; « Vérification » absent pour un compte vérifié.

---

## BLOC L — TRANSVERSE

### REC-L1 — Volumétrie : 200+ missions au seed → pagination/scroll, tri et filtres restent < 2 s perçu. — ✅ L3 livré (Sprint 8, 20/07)
- **Seed orienté pilote** : `python manage.py seed_test_data --clear --jobs 500` (sous Windows : préfixer `PYTHONUTF8=1`). Génère ~40 % de trajets retour sur le corridor A1 (Tunis–Sousse–Sfax–Gabès) + ~60 % de demandes classiques, chacun avec `distance_km` estimé (centroïdes) pour la NSM.
- **Vérifié (20/07)** : 509 jobs / 202 trajets retour / 500 avec `distance_km` (42 230 km NSM potentiels, répartition A1 équilibrée) ; `/api/jobs/public/` paginé 20/page (count 502) en ~0,23 s ; `/api/admin/stats/` 200 en ~0,32 s. Pagination et perf conformes.
- **Note** : la NSM *réalisée* (`nsmKmTransformed`) reste 0 tant que la volumétrie ne crée que de l'offre publiée (pas de bookings) — attendu ; un lot de trajets retour COMPLETED serait requis pour une NSM transformée non nulle.
### REC-L2 — Non-régression client : le parcours client minimal (publier une annonce, recevoir l'offre, accepter, payer, confirmer) passe après chaque porte de phase.
### REC-L3 — Zones ex-non-auditées : inscription transporteur complète ; flux Konnect client ; litige de bout en bout (création → décision → impact paiement).

---

## BLOC P — PARCOURS PIVOT « RETURN TRIPS FIRST » (Sprints 3-5)

### REC-P1 — Demande structurée bout-en-bout (✅ passé le 18/07/2026)
1. Transporteur publie un trajet retour (réservation immédiate décochée).
2. Client tente `book-return` → refus `REQUEST_REQUIRED` ; envoie une demande (description, prix, mode de paiement).
3. Transporteur notifié → contre-propose ; client notifié → accepte la contre-proposition.
- **Attendu :** job MATCHED + Booking, offre à **8 %** (commission = total×0,08/1,08), demandes concurrentes rejetées et notifiées, conversation incluant le client, circuit D3 enchaîné.

### REC-P2 — Cycle de vie owner (✅ passé le 18/07/2026)
1. Sur son trajet : panneau « Mon trajet retour » (statut, demandes reçues, Accepter/Contre-proposer/Refuser, Modifier, Supprimer).
2. Modifier capacité/prix/réservation immédiate → persisté. Supprimer → CANCELLED + demandes refusées/notifiées. Plus aucun 403.

### REC-P3 — NSM (✅ passé le 18/07/2026)
- Toute création (mission ou trajet) avec coordonnées stocke `distance_km` = haversine × 1,25 (Sfax→Tunis ≈ 294,5 km).

### REC-P4 — Funnel client inversé (Sprint 4)
1. Client : « Trouver un trajet » est l'entrée principale ; recherche corridor + dates.
2. Trajets trouvés → demande depuis le détail. Aucun trajet → « Publier une demande » **pré-remplie** (1 clic) + « Créer une alerte corridor ».
3. Dans /jobs/new, si des trajets compatibles existent → bannière de suggestion avant publication.
- **Attendu :** aucun cul-de-sac ; le flux classique reste accessible à chaque étape ; bascule intégrale derrière `RETURN_TRIPS_FIRST`.

### REC-P5 — Alerte corridor (Sprint 4 v0 / Sprint 5 active)
1. Client crée une alerte Sfax→Tunis. 2. Un transporteur publie un trajet compatible.
- **Attendu :** notification « nouveau trajet sur votre corridor » au client abonné (et pas aux autres).

### REC-P6 — Exécution : timeline + POD (✅ passé le 18/07/2026)
1. Mission IN_PROGRESS. Transporteur : « Je suis arrivé au chargement » → « Chargé — je suis en route » (séquence forcée, LOADED bloqué avant ARRIVED).
2. Timeline visible 2 parties, horodatée.
3. Client-payeur voit son code 4 chiffres ; transporteur ne le voit pas.
4. « Marquer comme livré » : PIN faux → rejeté ; PIN bon (+ photo optionnelle) → mission Terminée.
- **Attendu :** `/complete/` sans Booking = sans PIN OK ; avec Booking = PIN obligatoire. Annulation transporteur tracée (JobEvent) → K7 baisse.

## Registre d'exécution

| Scénario | Build | Date | Testeur | Statut | Captures | Commentaire |
|---|---|---|---|---|---|---|
| REC-A1 | | | | ⏸ | | Dépend D1/D2 |
| REC-A2 | | | | ⏸ | | Dépend A2 |
| … | | | | | | |

*(À dupliquer par campagne. Une campagne = une porte de phase.)*
