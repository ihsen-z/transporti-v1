# APK pilote : donner l'application aux transporteurs sans le Play Store

Ce guide explique comment fabriquer l'application Android et l'installer sur
le téléphone des transporteurs du pilote, **gratuitement et sans carte
bancaire**.

Pourquoi pas le Play Store tout de suite :

- le compte développeur Google coûte **25 $, payables par carte** ;
- un nouveau compte personnel doit faire tester l'application par **12
  personnes pendant 14 jours** avant de pouvoir la publier.

Le fichier d'installation (APK) envoyé par lien évite ces deux obstacles. Le
Play Store reste l'étape d'après, pour le lancement public.

---

## Ce qui est déjà prêt (fait le 28/10/2026)

- **Compte Expo** : `senzen` (gratuit, sans carte). Expo fabrique l'APK sur
  ses serveurs : rien à installer d'Android sur le PC.
- **Projet Expo** : `@senzen/transporti-mobile`, relié au code
  (`extra.eas.projectId` dans `mobile/app.json`).
- **Profil de construction `pilote`** (`mobile/eas.json`) :
  - produit un **APK** (installable directement, pas un `.aab` de store) ;
  - **distribution interne** : Expo donne un lien de téléchargement ;
  - branché sur le **vrai serveur** `https://transporti-v1.onrender.com` ;
  - numéro de version **incrémenté automatiquement** à chaque construction,
    pour qu'une nouvelle version s'installe par-dessus l'ancienne.

## Avant de donner l'application : le serveur doit marcher

L'APK appelle le serveur Render. Tant que la base Neon n'y est pas branchée
(voir `GUIDE_MISE_EN_PRODUCTION_RENDER.md`), l'application s'ouvre mais **la
connexion et l'inscription échouent**.

Vérification : https://transporti-v1.onrender.com/health/ doit afficher
`"database": "ok"`.

On peut quand même **fabriquer** l'APK avant, et l'installer sur votre propre
téléphone pour tester l'installation.

---

## Étape 1 : fabriquer l'APK (sur le PC)

Dans un terminal, depuis le dossier du projet :

```bash
cd mobile
npx eas-cli@latest build --platform android --profile pilote
```

1. **La première fois seulement**, Expo demande :
   « Generate a new Android Keystore? ». Répondez **Yes** (touche Entrée).
   Le keystore est la **signature** de l'application. Expo le garde pour
   vous. Il ne faut jamais le supprimer : sans lui, une nouvelle version ne
   s'installerait plus par-dessus l'ancienne (les transporteurs devraient
   désinstaller, et perdre leur session).
2. Expo envoie le code et construit l'APK. Avec l'offre gratuite, la file
   d'attente prend **de 10 minutes à plus d'une heure**. Vous pouvez fermer le
   terminal et suivre l'avancement sur
   https://expo.dev/accounts/senzen/projects/transporti-mobile/builds
3. À la fin, Expo affiche un **lien** et un **QR code** vers l'APK.

L'offre gratuite limite le nombre de constructions par mois : ne relancez pas
une construction sans changement de code.

Le dossier doit être sur la branche `master` à jour, avec ses dépendances
installées (`npm ci` dans `mobile`). Si la construction s'arrête sur « Failed
to compute project fingerprint », relancez-la en sautant ce calcul annexe :

```bash
EAS_SKIP_AUTO_FINGERPRINT=1 npx eas-cli@latest build --platform android --profile pilote
```

La première construction a été lancée le 28/10/2026 : le keystore existe
déjà chez Expo, la question de l'étape 1 ne sera donc plus posée.

## Étape 2 : installer sur un téléphone Android

1. Sur le téléphone, ouvrez le lien dans **Chrome** (ou scannez le QR code
   avec l'appareil photo), puis touchez **Install**. Le fichier `.apk` se
   télécharge.
2. Ouvrez le fichier téléchargé. Android demande d'**autoriser Chrome à
   installer des applications inconnues** : touchez **Paramètres**, activez
   l'option, puis revenez en arrière.
3. Touchez **Installer**.
4. **Play Protect** peut afficher « Application inconnue » ou « Application
   non vérifiée ». C'est normal pour une application hors Play Store : touchez
   **Plus de détails**, puis **Installer quand même**.
5. Ouvrez **Transporti**.

L'APK ne fonctionne que sur **Android**. Pour un iPhone, il faut un compte
Apple Developer (99 $ par an) : pas prévu pour le pilote.

## Étape 3 : envoyer l'application aux transporteurs

Envoyez le lien **en message privé** (WhatsApp, SMS), jamais en public :
toute personne qui a le lien peut télécharger l'application.

Message type :

> Salam, voici l'application Transporti pour le test :
> <lien Expo>
> Ouvrez le lien dans Chrome, touchez « Install », puis ouvrez le fichier.
> Si le téléphone demande d'autoriser l'installation, acceptez.
> Si Play Protect affiche un avertissement : « Plus de détails », puis
> « Installer quand même ».
> Appelez-moi si vous bloquez.

Le plus sûr pour le premier transporteur : faire l'installation **avec lui**,
en personne ou au téléphone.

## Mettre à jour l'application

Après une correction : relancez la commande de l'étape 1, puis envoyez le
nouveau lien. La nouvelle version s'installe **par-dessus** l'ancienne : le
compte et les données restent.

---

## Limites connues du pilote

| Limite | Pourquoi | Ce qui se passe à la place |
|---|---|---|
| **Pas de notification push** | Côté téléphone, il faut un projet Firebase (gratuit, sans carte). Côté serveur, l'envoi Firebase n'est pas encore codé (`notifications/push_service.py`, mode `SANDBOX`). | L'application actualise d'elle-même (pastilles toutes les minutes, missions toutes les 30 s), mais seulement quand elle est ouverte. Prévenez les transporteurs de l'ouvrir régulièrement, ou appelez-les à chaque nouvelle demande. |
| **Pas de carte des trajets** | La clé Google Maps exige un compte de facturation Google, donc une carte bancaire. | Un message « La carte n'est pas encore disponible » s'affiche, et les trajets restent listés en dessous. |
| **Pas de liens CGU / confidentialité dans le menu** | Ils attendent l'adresse du site (`EXPO_PUBLIC_TERMS_URL`, `EXPO_PUBLIC_PRIVACY_URL`). | Les entrées n'apparaissent pas, au lieu d'être des liens morts. |
| **Android seulement** | Pas de compte Apple. | — |

Au premier lancement, l'application demande l'autorisation d'envoyer des
notifications. L'accepter ne coûte rien et prépare l'arrivée des push.
