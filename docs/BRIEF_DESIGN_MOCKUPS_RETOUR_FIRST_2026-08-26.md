# BRIEF DE DESIGN — MOCKUPS « RETOUR FIRST »

**Destinataire** : Claude Design · **Date** : 26/08/2026 · **Produit** : Transporti V1, application web
**Objet** : générer les maquettes haute fidélité de 8 écrans, à partir d'un design system existant

> **Ce document est autoporteur.** Toutes les valeurs de tokens, tous les libellés, toutes les données
> d'exemple et toutes les contraintes nécessaires à la production des maquettes y figurent. Aucune
> autre lecture n'est requise.

---

## PARTIE A — CE QU'IL FAUT SAVOIR AVANT DE DESSINER

### A.1 Le produit en cinq lignes

Transporti est une marketplace logistique tunisienne. Elle met en relation des clients ayant un
besoin de transport avec des transporteurs **déjà en déplacement**, pour valoriser leurs trajets
retour effectués à vide.

**Signature stratégique** : *la plateforme qui transforme chaque retour à vide en opportunité de revenu.*
**Métrique unique** : kilomètres de retour à vide transformés en kilomètres chargés.
**Marché** : Tunisie. Gouvernorats. Monnaie : dinar tunisien, noté `DT`. Langues : français et arabe.

### A.2 Les deux profils à dessiner

| | **Transporteur** | **Client expéditeur** |
|---|---|---|
| Statut | Persona **principal** | Persona secondaire |
| Exemple | Mehdi B., camionnette 2 T, basé à Tunis | Ahmed K., envoie un frigo Tunis → Sousse |
| Fréquence d'usage | Quotidienne, souvent **en déplacement, sur mobile** | Ponctuelle, souvent sur desktop |
| Ce qu'il veut | Rentabiliser un trajet qu'il fait déjà | Trouver un transporteur fiable, vite, pas cher |
| Sa racine dans l'app | Un **inventaire** : ses retours publiés | Une **recherche** : les trajets disponibles |
| Ce qui le fait revenir | L'argent gagné, rendu visible | Rien — il revient quand il a un besoin |

**Conséquence de design** : le transporteur est un utilisateur professionnel qui scanne un tableau de
bord ; le client est un visiteur occasionnel qu'il faut guider pas à pas. Les deux ne demandent pas
la même densité d'information.

### A.3 Les cinq principes qui gouvernent ces écrans

Chaque écran de la partie C indique lesquels il sert. Ils ne sont pas décoratifs : ils tranchent
la hiérarchie visuelle.

- **IA-1 — L'inventaire précède l'annonce.** Le client cherche dans un stock existant avant d'en créer. « Trouver un trajet » domine toujours « publier une demande ».
- **IA-2 — 30 secondes, depuis là où l'on est.** Publier son retour doit s'atteindre en un geste. Cette action est **toujours l'élément le plus proéminent** de l'écran où elle apparaît.
- **IA-3 — Jamais de cul-de-sac.** Tout état vide propose deux sorties nommées, de poids visuel comparable.
- **IA-4 — Une boîte de réception par rôle.** Ce qui attend une décision se voit d'un coup d'œil, avec un compteur.
- **IA-5 — La valeur se chiffre à l'écran.** Un gain en dinars ou en kilomètres est un **chiffre affiché**, jamais une phrase noyée dans un paragraphe.

---

## PARTIE B — DESIGN SYSTEM À RESPECTER

Ces valeurs sont extraites du code existant (`frontend/tailwind.config.ts`, `frontend/app/globals.css`).
**Elles ne sont pas à réinventer.** Utiliser exactement ces hex, cette échelle typographique, ce pas
d'espacement et ces rayons.

### B.1 Couleurs

**Marque — bleu royal.** C'est la couleur d'identité. Sidebar, en-têtes, accents structurants.

| Token | Hex | Usage |
|---|---|---|
| `brand-500` | `#2563B3` | Bleu du logo |
| `brand-600` | `#1E3A8A` | **Bleu royal principal** — sidebar, hero, accents |
| `brand-700` | `#172F73` | Survol, état actif |
| `brand-900` | `#0F1D4E` | Bande pied de page, bandeaux d'appel à l'action |
| `brand-50` | `#EEF2FF` | Fond de zone d'information légère |

**Accent — vert.** Réservé à la **valeur et à la réussite** : gains, économies, confirmations, badges de vérification.

| Token | Hex |
|---|---|
| `accent-600` | `#10B981` — vert principal |
| `accent-700` | `#059669` — texte vert sur fond clair |
| `accent-100` | `#DCFCE7` — fond de pastille verte |

**Appel à l'action — orange.** Réservé à **l'action principale unique** de chaque écran. Un seul orange par écran, jamais deux.

| Token | Hex |
|---|---|
| `cta-500` | `#F97316` — bouton principal |
| `cta-600` | `#EA580C` — survol |
| `cta-100` | `#FFEDD5` — fond de bandeau d'amorce |

**Sémantique** — distincte de l'accent, pour les états système uniquement.

| Rôle | Défaut | Fond clair | Texte foncé |
|---|---|---|---|
| Succès | `#10B981` | `#D1FAE5` | `#047857` |
| Avertissement | `#F59E0B` | `#FEF3C7` | `#D97706` |
| Erreur | `#EF4444` | `#FEE2E2` | `#DC2626` |
| Information | `#3B82F6` | `#DBEAFE` | `#2563EB` |

**Neutres** — `50 #F9FAFB` · `100 #F3F4F6` · `200 #E5E7EB` · `300 #D1D5DB` · `400 #9CA3AF` · `500 #6B7280` · `600 #4B5563` · `700 #374151` · `800 #1F2937` · `900 #111827`

Fond de page par défaut : `neutral-50`. Surfaces de cartes : blanc. Texte courant : `neutral-900`. Texte secondaire : `neutral-500`.

### B.2 Typographie

| Rôle | Police | Remarque |
|---|---|---|
| Latin (français) | **Inter** | chargée via `next/font/google` |
| Arabe | **Cairo** | appliquée automatiquement sur `dir="rtl"` |

Échelle (taille / interligne) : `xs 12/16` · `sm 14/20` · `base 16/24` · `lg 18/28` · `xl 20/28` · `2xl 24/32` · `3xl 30/36` · `4xl 36/40` · `5xl 48/56`

Graisses disponibles : `400` normal · `500` moyen · `600` demi-gras · `700` gras · `800` extra-gras.

**Chiffres** : tout nombre aligné en colonne (montants, kilomètres, compteurs) utilise des chiffres tabulaires.

### B.3 Espacement, rayons, ombres

**Espacement, base 8 px** : `1 = 4px` · `2 = 8px` · `3 = 12px` · `4 = 16px` · `6 = 24px` · `8 = 32px` · `10 = 40px` · `12 = 48px` · `16 = 64px` · `20 = 80px` · `24 = 96px`

**Rayons** : `sm 4px` · `md 8px` (défaut) · `lg 12px` · `xl 16px` · `2xl 24px` · `full` (pastilles, avatars)

**Ombres** : `sm 0 1px 2px rgb(0 0 0/.05)` · défaut `0 1px 3px rgb(0 0 0/.1)` · `md 0 4px 6px -1px rgb(0 0 0/.1)` · `lg 0 10px 15px -3px rgb(0 0 0/.1)`

### B.4 Deux viewports à produire par écran

| Viewport | Largeur | Chrome |
|---|---|---|
| **Mobile** | 375 px | En-tête compact + barre de navigation basse à 4 entrées |
| **Desktop** | 1280 px | Barre latérale gauche fixe (256 px) + zone de contenu |

Le transporteur travaille majoritairement sur mobile : **dessiner le mobile d'abord** pour les écrans T.

### B.5 Deux contraintes non négociables

**RTL arabe.** L'application est déjà entièrement RTL : `dir` est posé sur `<html>` avant le premier
rendu, et le code n'utilise que des propriétés logiques (aucune marge ni padding directionnel).
Chaque maquette doit donc être **pensée réversible** : ne rien accrocher visuellement à « gauche »
ou « droite » de façon irréversible, et prévoir le miroir des icônes directionnelles (chevrons,
flèches de progression). Fournir au moins un écran en version arabe pour valider.

**Mode sombre.** Le mode sombre est aujourd'hui **cassé** hors zone d'administration : un bouton de
bascule est exposé à tous les utilisateurs et suit la préférence système, mais aucun style sombre
n'existe sur les écrans métier. Conséquence pour vous : **produire les maquettes en clair
uniquement**, et proposer une palette sombre comme livrable séparé. Ne pas supposer qu'un thème
sombre existe.

### B.6 Composants déjà disponibles — à réutiliser, pas à redessiner

`Button` · `Card` · `Input` · `Select` · `Modal` · `ConfirmModal` · `Toast` · `Skeleton` ·
`LoadingState` · `StatusBadge` · `Pagination` · `LanguageSwitcher` · `JobCard` · `JobTimeline` ·
`MissionStepper` · `PhotoUploader` · `LocationPicker` · `OfferCard` · `OfferForm` · `ReviewCard` ·
`TrustBadges` · `VehicleGallery` · `EscrowBadge` · `RouteMap` (Leaflet) · `StatCard` ·
`NotificationBell` · `TripRequestsPanel`

### B.7 Trois composants à créer — livrables attendus

| Nom | Où il apparaît | Ce qu'il doit faire |
|---|---|---|
| **Bandeau d'amorce de retour** | T4.4, T1.1 | Proposer de publier un retour, avec origine et destination pré-remplies. Le composant le plus proéminent de son écran. Fond `cta-100`, bordure `cta-500` |
| **Carte de trajet avec économie** | C1.2 | Une offre de trajet retour, dont l'économie estimée est une **ligne dédiée** en vert, pas une mention |
| **Carte de demande actionnable** | T2.1 | Une demande reçue avec ses trois actions décisionnelles visibles sans ouvrir le détail |

---

## PARTIE C — LES 8 ÉCRANS À MAQUETTER

Ordre de production recommandé : T4.4, T1.2, T1.1, T2.1, C1.1/C1.2, C1.3, C1.5, T5.4.
Les trois premiers forment le parcours qui porte la métrique unique.

---

### ÉCRAN 1 — T4.4 · Fin de mission, amorce de retour

| | |
|---|---|
| **Profil** | Transporteur |
| **Route** | `/missions/[id]`, état final |
| **Priorité** | **1 — l'écran le plus important du lot** |
| **Principes servis** | IA-2 (dominant), IA-5 |
| **Viewport prioritaire** | Mobile 375 — le transporteur vient de livrer, il est debout à côté de son camion |

**Objectif** — Convertir la fin d'une mission en publication d'un trajet retour, immédiatement.

**Contexte narratif** — Mehdi vient de livrer à Sfax. Il rentre à Tunis. Son camion est vide. C'est
l'instant, et le seul, où la publication d'un retour est évidente pour lui. Si cet écran ne le
capte pas, le kilométrage est perdu.

**Régions, de haut en bas, par poids visuel décroissant**

1. **Confirmation de paiement** — pastille verte, discrète mais rassurante. `accent-100` / `accent-700`.
2. **Bandeau d'amorce de retour** — *l'élément dominant de l'écran.* Fond `cta-100`, bordure `cta-500`, titre en `xl/600`. Doit occuper visuellement le tiers supérieur utile.
3. **Trajet pré-rempli** — deux champs déjà remplis, présentés comme un fait acquis, non comme un formulaire à remplir. Fond `neutral-100`, non éditables au premier regard mais modifiables.
4. **Bouton principal** — `cta-500`, pleine largeur, hauteur 48 px minimum.
5. **Échappatoire** — « Plus tard », texte seul, `neutral-500`. Présent mais discret.
6. **Actions secondaires** — noter le client, voir le portefeuille. Liens en `neutral-600`, en bas.

**Contenu exact à composer**

- Pastille : `Mission livrée · 120 DT versés à votre portefeuille`
- Contexte : `Vous êtes à Sfax`
- Titre du bandeau : `Vous rentrez à Tunis à vide ?`
- Corps du bandeau : `Publiez votre retour en 30 secondes. Camionnette 2 T et capacité déjà renseignées.`
- Champs pré-remplis : `Sfax → Tunis` · `Aujourd'hui`
- Bouton principal : `Publier mon retour`
- Échappatoire : `Plus tard`
- Liens : `Noter le client` · `Voir mon portefeuille`

**États à produire** — état par défaut (ci-dessus) ; variante où le transporteur a déjà un retour publié sur ce corridor, le bandeau devient `Vous avez déjà publié ce retour` en `brand-50`.

**Critère de réussite** — un transporteur qui regarde cet écran une seconde comprend qu'on lui propose de gagner de l'argent sur un trajet qu'il va faire de toute façon.

---

### ÉCRAN 2 — T1.2 · Publier un retour en 30 secondes

| | |
|---|---|
| **Profil** | Transporteur |
| **Route** | `/retours/nouveau` |
| **Priorité** | 2 |
| **Principes servis** | IA-2 |
| **Viewport prioritaire** | Mobile 375 |

**Objectif** — Publier un trajet retour en moins de 30 secondes et moins de 4 saisies manuelles.

**Contrainte de design structurante** — **quatre saisies, pas cinq.** Le véhicule et la capacité
viennent du profil et ne sont jamais ressaisis. Chaque champ supplémentaire est une régression.
Privilégier partout le choix parmi des options tactiles plutôt que la saisie libre.

**Régions**

1. **Rappel du véhicule, non éditable** — présenté comme un acquis. Fond `brand-50`, texte `brand-600`, avec une petite icône de camionnette.
2. **Saisies 1 et 2 — le trajet** — deux champs de localisation côte à côte, avec suggestions de gouvernorats.
3. **Saisie 3 — la date** — trois pastilles tactiles, pas un calendrier : `Aujourd'hui`, `Demain`, `Autre date`.
4. **Saisie 4 — la place disponible** — trois pastilles : `Tout le camion`, `La moitié`, `Préciser en m³`.
5. **Prix indicatif** — pré-rempli par une suggestion de corridor, modifiable. Mentionner explicitement que c'est une suggestion.
6. **Bouton principal** — `cta-500`, pleine largeur, collé en bas sur mobile.

**Contenu exact**

- Rappel véhicule : `Camionnette 2 T · 8 m³ · depuis votre profil`
- Étiquettes : `D'où partez-vous ?` · `Où allez-vous ?` · `Quand ?` · `Quelle place reste-t-il ?`
- Valeurs d'exemple : `Sfax` · `Tunis`
- Prix : `85 DT` avec la mention `suggéré pour ce corridor`
- Bouton : `Mettre en ligne`

**États à produire** — vide ; en cours de saisie avec suggestions de gouvernorats ouvertes ; envoi en cours ; erreur de validation sur un champ de localisation.

**Critère de réussite** — l'écran doit donner l'impression d'être déjà à moitié rempli à l'ouverture.

---

### ÉCRAN 3 — T1.1 · Hub « Mes retours »

| | |
|---|---|
| **Profil** | Transporteur |
| **Route** | `/dashboard` |
| **Priorité** | 3 |
| **Principes servis** | IA-2, IA-4, IA-5 |
| **Viewport prioritaire** | Les deux, à parité |

**Objectif** — Être la racine du transporteur : ce qu'il gagne, ce qui attend sa décision, et l'invitation permanente à publier un retour.

**Nature de l'écran** — Ceci est un tableau de bord : il est **scanné, pas lu**. La synthèse précède
le détail. L'état doit se lire à la forme autant qu'au chiffre.

**Régions**

1. **Bandeau d'amorce, conditionnel** — n'apparaît que si une mission vient d'être livrée. Quand il est là, il est au-dessus de tout le reste. Fond `cta-100`.
2. **Rangée de trois indicateurs** — retours en ligne, demandes en attente, revenus du mois. Chiffres en `2xl/700`, tabulaires. L'indicateur monétaire est en `accent-600`.
3. **Métrique unique, mise en avant** — les kilomètres à vide valorisés. Traitement vert, `accent-100` / `accent-700`. Ce n'est pas un indicateur de plus : c'est **la** promesse du produit rendue à celui qui la produit.
4. **Liste des retours en ligne** — une ligne par trajet : corridor, date, place restante, et **compteur de demandes en pastille**. Une ligne sans demande doit se distinguer visuellement d'une ligne qui en a.
5. **Renvoi secondaire** — « Compléter mon aller », plus discret, sans concurrencer les retours.

**Contenu exact**

- Bandeau : `Vous venez de livrer à Sfax. Vous rentrez à vide ?` + bouton `Publier mon retour`
- Indicateurs : `2 retours en ligne` · `5 demandes en attente` · `340 DT ce mois`
- Métrique : `610 km de retour à vide valorisés ce mois`
- Trajet 1 : `Sfax → Tunis · 29 août · 1,4 m³ libres · 3 demandes`
- Trajet 2 : `Tunis → Sousse · 2 septembre · 3 m³ libres · aucune demande`
- Renvoi : `Compléter mon aller · 12 demandes sur mes corridors`

**États à produire** — nominal (ci-dessus) ; **premier usage, aucun retour publié** — état vide qui doit proposer la publication comme action unique et évidente ; chargement en squelettes.

**Critère de réussite** — le transporteur voit en trois secondes combien il a gagné et ce qui attend sa réponse.

---

### ÉCRAN 4 — T2.1 · Demandes reçues, tous trajets confondus

| | |
|---|---|
| **Profil** | Transporteur |
| **Route** | `/demandes-recues` |
| **Priorité** | 4 |
| **Principes servis** | IA-4 |
| **Viewport prioritaire** | Mobile 375 |

**Objectif** — Réunir en un seul endroit toutes les demandes reçues sur tous les trajets publiés, et permettre de décider sans ouvrir le détail.

**Régions**

1. **Onglets segmentés par attente d'action** — `À décider` avec compteur, `En négociation` avec compteur, `Archivées`. L'onglet actif est franc, pas subtil.
2. **Liste de cartes de demande actionnable** — par carte : nom et note du client, marchandise, poids, **prix proposé en gras**, trajet concerné, ancienneté de la demande.
3. **Trois actions par carte, hiérarchisées** — `Accepter` en `cta-500` plein ; `Contre-proposer` en bouton bordé neutre ; `Refuser` en texte seul `neutral-500`. La hiérarchie visuelle doit rendre l'acceptation la plus facile.
4. **Rappel de délai** — mention discrète sur l'incitation à répondre vite.

**Contenu exact**

- Onglets : `À décider · 5` · `En négociation · 2` · `Archivées`
- Carte : `Ahmed K. · 4,6 ★` · `Frigo · 120 kg` · `85 DT` · `sur Sfax → Tunis du 29 août` · `reçue il y a 2 h`
- Actions : `Accepter` · `Contre-proposer` · `Refuser`
- Rappel : `Répondre sous 4 h protège votre taux de réponse`

**États à produire** — liste peuplée ; **état vide** (« aucune demande pour l'instant ») qui doit renvoyer vers la publication d'un retour supplémentaire, conformément à IA-3 ; carte en cours de traitement après clic sur Accepter.

**Critère de réussite** — un transporteur avec trois retours en ligne sait d'un coup d'œil combien de décisions il doit prendre.

---

### ÉCRAN 5 — C1.1 et C1.2 · Recherche de trajet et résultats

| | |
|---|---|
| **Profil** | Client expéditeur |
| **Route** | `/recherche` |
| **Priorité** | 5 |
| **Principes servis** | IA-1, IA-5 |
| **Viewport prioritaire** | Desktop 1280, puis mobile |

**Objectif** — Être la racine du parcours client : chercher dans l'inventaire de trajets existants, et rendre l'économie évidente avant tout clic.

**Nature de l'écran** — Le client n'a pas de tableau de bord. **Cet écran est son accueil.** Il doit
être immédiatement lisible par quelqu'un qui découvre le produit.

**Régions**

1. **Formulaire de recherche** — départ, arrivée, fenêtre de dates, nature et poids de la marchandise, bouton de recherche. Sur desktop, en bandeau horizontal ; sur mobile, empilé.
2. **Ligne de résultat** — nombre de trajets trouvés et critère de tri.
3. **Liste de cartes de trajet avec économie** — le composant central. Par carte : nom et note du transporteur, type de véhicule, corridor, date, place restante, prix, et **l'économie estimée sur une ligne dédiée en vert**.
4. **Carte du corridor** — repliable, secondaire. Ne doit jamais concurrencer la liste.

**Contenu exact**

- Champs : `Départ · Sfax` · `Arrivée · Tunis` · `Du 28 au 30 août` · `Frigo · 120 kg`
- Bouton : `Chercher`
- Ligne de résultat : `4 trajets retour sur ce corridor · triés par date de départ`
- Carte : `Mehdi B. · 4,8 ★ · camionnette 2 T` / `Sfax → Tunis · 29 août · 1,4 m³ libres · 85 DT`
- **Ligne d'économie** : `Vous économisez 40 DT — ce trajet est déjà prévu`

**Point d'attention** — cette ligne d'économie est l'argument de conversion du produit et elle est
aujourd'hui totalement absente de l'application. C'est la principale valeur ajoutée attendue de
cette maquette. Elle doit être visible sans effort de lecture, sans pour autant transformer la
carte en publicité.

**États à produire** — recherche vierge à l'arrivée ; résultats peuplés ; chargement en squelettes de cartes ; **une carte de trajet en version arabe RTL**, pour valider la réversibilité.

**Critère de réussite** — un client comprend en cinq secondes qu'il paie moins parce que le camion roulait déjà.

---

### ÉCRAN 6 — C1.3 · Repli, aucun trajet disponible

| | |
|---|---|
| **Profil** | Client expéditeur |
| **Route** | `/recherche`, état vide |
| **Priorité** | 6 |
| **Principes servis** | IA-3 |
| **Viewport prioritaire** | Les deux |

**Objectif** — Transformer une recherche infructueuse en engagement, jamais en impasse.

**Contrainte de design structurante** — **deux sorties de poids visuel comparable.** Ni l'une ni
l'autre ne doit apparaître comme le lot de consolation. C'est le point de bifurcation le plus
important du parcours client.

**Régions**

1. **Rappel de la recherche** — ce qui a été cherché, pour que l'utilisateur puisse le corriger.
2. **Constat, sans dramatisation** — pas d'icône d'erreur, pas de rouge. Ce n'est pas une panne.
3. **Sortie A — publier une demande** — bloc `brand-50` bordé `brand-600`, titre, une phrase d'explication, bouton `cta-500`.
4. **Sortie B — créer une alerte corridor** — bloc de traitement symétrique, bouton bordé neutre.
5. **Élargissement de la recherche** — suggestions discrètes en bas : dates voisines, gouvernorats limitrophes.

**Contenu exact**

- Rappel : `Sfax → Tozeur · 28 au 30 août`
- Constat : `Aucun trajet retour sur ce corridor pour ces dates`
- Sortie A, titre : `Publier ma demande` — corps : `Les transporteurs du corridor la verront. Le formulaire est déjà rempli avec votre recherche.` — bouton : `Publier ma demande`
- Sortie B, titre : `Créer une alerte` — corps : `Prévenez-moi dès qu'un trajet Sfax → Tozeur est publié.` — bouton : `Créer l'alerte`
- Élargissement : `Élargir : dates ± 3 jours · gouvernorats voisins`

**Critère de réussite** — personne ne quitte cet écran sans avoir fait une des deux choses.

---

### ÉCRAN 7 — C1.5 · Envoyer une demande structurée

| | |
|---|---|
| **Profil** | Client expéditeur |
| **Route** | `/trajets/[id]/demande` |
| **Priorité** | 7 |
| **Principes servis** | IA-1 |
| **Viewport prioritaire** | Desktop 1280 |

**Objectif** — Recueillir une demande complète et sans ambiguïté, sans décourager par la longueur.

**Contrainte de design structurante** — c'est la **transaction centrale du produit**, et un
formulaire long. Le sectionner en trois blocs numérotés courts, chacun tenant dans un regard, avec
une progression visible. Le client doit sentir qu'il avance.

**Régions**

1. **Rappel du trajet choisi** — bandeau non éditable rappelant à qui l'on écrit et pour quand.
2. **Bloc 1, ce que vous envoyez** — nature, poids, dimensions, photos, mention de fragilité.
3. **Bloc 2, où et quand** — adresses d'enlèvement et de livraison, créneau souhaité.
4. **Bloc 3, votre prix** — montant proposé, avec le prix indicatif du transporteur affiché comme repère.
5. **Bouton d'envoi** et **note de réassurance sur le paiement** — juste sous le bouton, non escamotable.

**Contenu exact**

- Rappel : `Trajet de Mehdi B. · Sfax → Tunis · 29 août`
- Titres de blocs : `1 — Ce que vous envoyez` · `2 — Où et quand` · `3 — Votre prix`
- Champs : `Frigo` · `120 kg` · `Photos, dimensions, fragilité` · `Adresse d'enlèvement` · `Adresse de livraison` · `85 DT proposés`
- Bouton : `Envoyer ma demande`
- Réassurance : `Le transporteur répond, accepte ou contre-propose. Vous ne payez qu'après son accord.`

**États à produire** — formulaire vierge ; photos ajoutées avec vignettes ; erreur de validation sur un champ obligatoire ; envoi en cours.

**Critère de réussite** — le client sait exactement ce qu'il s'engage à faire, et qu'il ne paie pas encore.

---

### ÉCRAN 8 — T5.4 · Performance retours

| | |
|---|---|
| **Profil** | Transporteur |
| **Route** | `/performance` |
| **Priorité** | 8 |
| **Principes servis** | IA-5, IA-2 |
| **Viewport prioritaire** | Desktop 1280 |

**Objectif** — Montrer au transporteur ce que la plateforme lui rapporte, et l'orienter vers son prochain retour à publier.

**Nature de l'écran** — Tableau de bord analytique. Double usage assumé : **rétrospectif** (voici ce
que vous avez gagné) et **prospectif** (voici où publier ensuite). La bascule entre les deux est le
cœur du design.

**Régions**

1. **Grille de quatre indicateurs** — kilomètres à vide valorisés (traitement vert dominant, c'est la métrique unique), taux de remplissage, revenu des retours, nombre de retours publiés. Chiffres tabulaires.
2. **Graphique de revenu par corridor** — histogramme horizontal sur six mois. Une teinte de bleu unique par corridor, avec grille légère et extrémité mise en valeur. Pas de dégradé, pas de palette arc-en-ciel.
3. **Recommandation actionnable** — bloc `brand-50` signalant un corridor où la demande dépasse l'offre.
4. **Bouton de rebond** — `cta-500`, qui ramène à la publication d'un retour sur le corridor recommandé.

**Contenu exact**

- Indicateurs : `610 km à vide valorisés` · `68 % taux de remplissage` · `340 DT revenu retours` · `7 retours publiés`
- Titre du graphique : `Revenu par corridor · 6 derniers mois`
- Corridors : `Sfax → Tunis` · `Tunis → Sousse` · `Sousse → Sfax`
- Recommandation : `Sur Tunis → Sousse, 9 demandes attendent un transporteur cette semaine`
- Bouton : `Publier un retour sur ce corridor`

**États à produire** — données peuplées ; **transporteur nouveau, sans historique** — état vide qui explique ce que l'écran montrera et invite à publier un premier retour.

**Critère de réussite** — le transporteur repart de cet écran en publiant un retour.

---

## PARTIE D — LIVRABLES ATTENDUS

| # | Livrable | Détail |
|---|---|---|
| 1 | **8 écrans en mobile 375 px** | Tous les écrans, priorité de fidélité sur les écrans T |
| 2 | **8 écrans en desktop 1280 px** | Avec barre latérale de 256 px |
| 3 | **États secondaires** | Ceux listés par écran : vides, chargement, erreurs. Les états vides ne sont pas optionnels : trois écrans en dépendent |
| 4 | **1 écran en arabe RTL** | La carte de trajet avec économie (écran 5), pour valider la réversibilité |
| 5 | **3 composants documentés** | Bandeau d'amorce de retour · Carte de trajet avec économie · Carte de demande actionnable. Avec leurs variantes et leurs états |
| 6 | **Proposition de palette sombre** | Livrable séparé, en attente du branchement des tokens côté code |

## PARTIE E — CE QU'IL FAUT ÉVITER

- **Deux oranges sur un même écran.** L'orange marque l'action principale unique. Un second orange détruit la hiérarchie.
- **Le vert comme décoration.** Le vert signifie valeur ou réussite. Pas un accent libre.
- **Un état vide traité comme une erreur.** Ni rouge, ni icône d'alerte, ni ton d'excuse.
- **Une carte du corridor qui domine la liste de trajets.** La carte illustre, la liste décide.
- **Des chiffres en graisse normale dans une colonne.** Tout nombre comparable est tabulaire et distinct.
- **Un formulaire de publication de retour à cinq champs.** Quatre saisies, c'est la promesse produit.
- **Une mise en page accrochée à la gauche de l'écran.** Elle doit se retourner en arabe.
- **Supposer qu'un thème sombre existe.** Il n'existe pas sur les écrans métier.
