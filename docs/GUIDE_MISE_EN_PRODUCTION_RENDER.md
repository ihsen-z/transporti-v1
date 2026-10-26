# Guide de mise en production de Transporti (hébergement gratuit)

Rédigé le 26/10/2026. Pour le fondateur : chaque étape est courte et se fait
dans un navigateur. Aucune ligne de code à écrire.

Les libellés de boutons et les limites ont été vérifiés dans la documentation
officielle de Render, Neon, Netlify, cron-job.org, Cloudflare et Brevo à cette
date. Quand un libellé n'a pas pu être vérifié, il est marqué **(à vérifier)** :
l'écran peut avoir un nom un peu différent, cherchez le plus proche.

---

## 0. Avant de commencer : où on en est

**Ce qui existe aujourd'hui sur votre compte Render** (projet « My project ») :

| Service | Adresse | État |
|---|---|---|
| `transporti_v1` (le serveur, offre gratuite) | https://transporti-v1.onrender.com | **en panne** : chaque déploiement échoue, et sa base de données n'existe plus |
| `transporti-frontend` (le site web) | https://transporti-frontend.onrender.com | tourne, mais appelle un serveur en panne |

Deux causes :

1. Le nouveau code refuse de démarrer en production tant que le paiement est
   en mode « bac à sable » (`CRITICAL: PAYMENT_GATEWAY vaut 'SANDBOX'`). C'est
   voulu : ce mode déclarerait tout paiement réussi sans encaisser.
2. La base PostgreSQL gratuite de Render **expire au bout de 30 jours**, puis
   Render la supprime. C'est arrivé : `/health/` répond `"database": "error"`.
   Toutes les données étaient des données de test, on repart donc d'une base
   vide.

**La nouvelle organisation, 100 % gratuite :**

| Rôle | Service | Pourquoi lui |
|---|---|---|
| Serveur Django (API) | **Render**, offre Free (`transporti_v1`, déjà créé) | on garde l'adresse appelée par le site et l'application |
| Base PostgreSQL | **Neon**, offre Free, à Francfort | n'expire pas, contrairement à celle de Render |
| Site web Next.js | **Netlify**, offre Free | usage commercial accepté (l'offre gratuite de Vercel l'interdit) ; libère les heures gratuites de Render pour le serveur |
| Tâches planifiées | **cron-job.org** (gratuit) | l'offre gratuite de Render n'a pas de service « worker » |
| Fichiers envoyés | **Cloudflare R2** (gratuit jusqu'à 10 Go) | les fichiers survivent aux redéploiements |
| E-mails | **Brevo** (gratuit) | « mot de passe oublié » fonctionne enfin |

**Prérequis côté code (à faire avant les étapes 4 et 5) :** les branches
doivent être fusionnées dans `master` dans cet ordre : PR #10, puis PR #13
(mode espèces), puis `feature/render-production` (ce guide, `render.yaml` et
`netlify.toml`). Les PR #11, #12 et #14 sont indépendantes ; fusionnez-les
aussi, en particulier #14 (pièces KYC privées, voir l'encadré). Tant que la PR
#13 n'est pas dans `master`, **chaque déploiement du serveur échoue**, quels
que soient les réglages.

> **Pièces KYC (pièces d'identité, selfies).** Sans la PR #14, le code écrit
> ces pièces sur le disque du serveur : elles sont **effacées à chaque
> déploiement**. Avec la PR #14 fusionnée, elles vont dans R2, en privé.
> N'acceptez pas de vraies pièces d'identité avant cette fusion.

### Coûts par mois

| Élément | Offre | Prix |
|---|---|---|
| Serveur `transporti_v1` | Render Free | 0 $ |
| Base PostgreSQL | Neon Free | 0 $ |
| Site web | Netlify Free | 0 $ |
| Tâches planifiées | cron-job.org | 0 $ |
| Fichiers | Cloudflare R2 (10 Go gratuits) | 0 $ |
| E-mails | Brevo Free (300 e-mails par jour, à vérifier) | 0 $ |
| **Total** | | **0 DT par mois** |

Seul achat conseillé, hors hébergement : un **nom de domaine** (ex.
`transporti.tn`), pour que les e-mails n'arrivent pas en spam (voir §2.2).

### Ce que « gratuit » veut dire ici

- **Le serveur s'endort** après 15 minutes sans visite et met **environ une
  minute** à se réveiller. Le §6 installe un « réveil » toutes les 10 minutes
  qui l'empêche de s'endormir.
- **Render donne 750 heures gratuites par mois et par compte.** Un mois compte
  au plus 744 heures (31 × 24) : un seul service gratuit allumé en permanence
  tient dedans, **pas deux**. Si les heures s'épuisent, Render **suspend tous
  les services gratuits** jusqu'au mois suivant. D'où l'étape 7 : supprimer
  `transporti-frontend` de Render.
- **Neon (la base)** : 1 Go de données par projet et 100 « heures de calcul »
  (CU-hours) par mois, soit environ 400 heures d'activité au plus petit
  format. La base se met en pause après 5 minutes sans requête et ne consomme
  rien en pause. Si les heures s'épuisent, la base est suspendue jusqu'au mois
  suivant (les données ne sont pas perdues). Avec peu d'utilisateurs, c'est
  large ; surveillez le compteur dans Neon quand le trafic monte.
- **Netlify (le site)** : 300 « crédits » par mois. Une mise en ligne coûte
  15 crédits, 1 Go de trafic 20 crédits, 10 000 visites de pages 2 crédits.
  Si les crédits s'épuisent, **le site est mis en pause** (« Site not
  available ») jusqu'au mois suivant. Concrètement : évitez plus d'une
  dizaine de mises en ligne du site par mois. Le site n'est reconstruit que
  si le dossier `frontend/` change (réglage déjà prévu dans `netlify.toml`).
- **Aucune garantie de disponibilité** (pas de SLA) et pas de sauvegardes
  automatiques avancées. Pour un lancement, c'est acceptable.

### La solution payante de repli

Si l'endormissement ou une limite devient gênant, la première dépense utile
est le **serveur seul** : Render **Starter**, environ **7 $ par mois** (à
revérifier sur render.com/pricing). Il ne s'endort jamais, donne accès au
terminal (Shell) de Render et lève le blocage des ports e-mail (voir §2.3).
Le reste peut rester gratuit.

---

## 1. Cloudflare R2 : le stockage des fichiers

R2 garde les fichiers envoyés (avatars, photos de marchandise et, avec la PR
#14, pièces KYC) hors du serveur, pour qu'ils survivent aux redéploiements.

### 1.1 Activer R2

1. Créez un compte gratuit sur https://dash.cloudflare.com (ou connectez-vous).
2. Dans le menu de gauche : **Storage & databases > R2 > Overview**.
3. Suivez le parcours d'activation (« checkout ») pour ajouter R2 au compte.
   L'offre gratuite inclut 10 Go par mois. Cloudflare peut demander une carte
   bancaire ou PayPal même pour l'offre gratuite **(à vérifier)**.

### 1.2 Créer le bucket

1. Sur la page R2, cliquez **Create bucket**.
2. Nom : `transporti-media` (minuscules, sans espace).
3. Emplacement : laissez le choix automatique. Classe de stockage : **Standard**
   (seule celle-ci a une offre gratuite).
4. Cliquez **Create bucket**.
5. **N'activez pas l'accès public** (pas de « r2.dev », pas de domaine
   personnalisé). Le bucket doit rester privé : le serveur fabrique des liens
   signés qui expirent au bout d'une heure.

### 1.3 Créer la clé d'accès (API token)

1. Revenez sur **Storage & databases > R2 > Overview**.
2. À côté de **API Tokens**, cliquez **Manage**.
3. Cliquez **Create Account API token**. Ce type de jeton reste valable même si
   un utilisateur quitte le compte.
4. Permission : **Object Read & Write**. N'utilisez pas « Admin » : cette
   permission vaut pour tout le compte.
5. Choisissez **Apply to specific buckets only**, puis sélectionnez
   `transporti-media`.
6. Validez (**Create API Token**).
7. **Copiez tout de suite** ces deux valeurs dans un endroit sûr (gestionnaire
   de mots de passe). La seconde n'est affichée qu'une seule fois :
   - **Access Key ID**
   - **Secret Access Key**
8. Notez aussi l'**adresse S3** (endpoint), affichée en bas de la page de
   confirmation et sur la page R2 Overview. Elle a cette forme :
   `https://<ACCOUNT_ID>.r2.cloudflarestorage.com`
   (`<ACCOUNT_ID>` est l'identifiant de votre compte Cloudflare, une suite de
   32 caractères).

Vous avez maintenant les **4 valeurs R2** : nom du bucket, endpoint, Access
Key ID, Secret Access Key.

---

## 2. Brevo : l'envoi des e-mails

Nous utilisons Brevo plutôt que SendGrid : SendGrid n'a plus d'offre gratuite
permanente depuis 2025, Brevo en a une (300 e-mails par jour, à vérifier sur
brevo.com/pricing). Sur l'offre gratuite, Brevo ajoute sa marque dans les
e-mails.

### 2.1 Créer le compte

1. Inscrivez-vous sur https://www.brevo.com (offre **Free**).
2. Confirmez votre adresse e-mail et complétez le profil demandé.

### 2.2 Vérifier l'expéditeur

Les e-mails partiront « de la part de » cette adresse. Elle doit être vérifiée
dans Brevo, sinon l'envoi est refusé.

1. Ouvrez les réglages des expéditeurs : menu **Senders, Domains & Dedicated
   IPs > Senders** **(à vérifier)**.
2. Ajoutez un expéditeur : nom `Transporti`, adresse de votre choix.
3. Cliquez le lien de confirmation reçu dans cette boîte.

**Conseil important :** utilisez une adresse sur **votre propre nom de
domaine** (ex. `contact@transporti.tn`), puis authentifiez ce domaine dans
Brevo (onglet **Domains**, enregistrements DNS à ajouter chez votre
registrar). Une adresse Gmail ou Yahoo comme expéditeur passe souvent en
spam, ou se fait rejeter, quand l'e-mail est envoyé par un autre service. Si
vous n'avez pas encore de domaine, c'est un achat à prévoir avant le lancement.

### 2.3 Récupérer les identifiants SMTP

1. Ouvrez https://app.brevo.com/settings/keys/smtp (**SMTP and API settings**,
   onglet **SMTP**).
2. Notez :
   - le **serveur SMTP** affiché (en principe `smtp-relay.brevo.com`) ;
   - le **Login** (une adresse du type `xxxxxx@smtp-brevo.com`).
3. Générez une **clé SMTP** (bouton du type « Generate a new SMTP key »,
   **(à vérifier)**) et copiez-la tout de suite. Attention : c'est une **clé
   SMTP**, pas une « clé API ». Une clé API ne fonctionne pas en SMTP.

> **Port 2525, pas 587.** L'offre gratuite de Render **bloque les ports
> e-mail habituels** (25, 465 et 587). Brevo accepte aussi le port **2525**,
> qui n'est pas bloqué. Utilisez donc `2525` ci-dessous, même si Brevo affiche
> 587. (Si un jour le serveur passe en Starter, 587 redevient possible.)

### 2.4 Correspondance avec les variables du serveur

Le code a été écrit pour SendGrid. Il fonctionne avec Brevo à condition de
remplir ces variables :

| Variable | Valeur pour Brevo |
|---|---|
| `EMAIL_BACKEND` | `django.core.mail.backends.smtp.EmailBackend` |
| `EMAIL_HOST` | `smtp-relay.brevo.com` (le serveur affiché par Brevo) |
| `EMAIL_PORT` | `2525` (voir l'encadré ci-dessus) |
| `EMAIL_USE_TLS` | `True` (chiffrement après connexion, à vérifier sur le port 2525 : si l'envoi échoue avec une erreur TLS, essayez `False`) |
| `EMAIL_HOST_USER` | le **Login** SMTP Brevo |
| `SENDGRID_API_KEY` | la **clé SMTP** Brevo. Le nom trompe : c'est simplement la variable où le serveur lit le mot de passe SMTP. |
| `DEFAULT_FROM_EMAIL` | l'expéditeur vérifié, ex. `Transporti <contact@transporti.tn>` |

---

## 3. Neon : la base de données

### 3.1 Créer le compte et le projet

1. Inscrivez-vous sur https://console.neon.tech (offre **Free**, sans carte
   bancaire). La connexion avec votre compte GitHub ou Google marche aussi.
2. Cliquez **New Project**.
3. **Project name** : `transporti`.
4. **Region** : **AWS Europe (Frankfurt)** (`aws-eu-central-1`), la plus
   proche de la Tunisie et la même ville que le serveur Render. **La région ne
   peut plus être changée ensuite.**
5. Sous **Services**, laissez **Postgres database** coché. **Postgres
   version** : laissez la version proposée par défaut (17 au moment de
   l'écriture, à vérifier).
6. Cliquez **Create project**. Neon crée une base nommée `neondb` dans une
   branche `production`.

### 3.2 Copier la chaîne de connexion

1. Sur la page du projet, cliquez **Connect** (en haut).
2. Dans la fenêtre **Connect to your branch** : laissez la branche
   `production`, la base `neondb` et le rôle proposé.
3. **Désactivez** l'interrupteur **Connection pooling** (il est activé par
   défaut). Voir l'explication ci-dessous.
4. Copiez la chaîne affichée. Elle ressemble à :

   ```
   postgresql://neondb_owner:<mot de passe>@ep-xxxx-xxxx.eu-central-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require
   ```

   Gardez-la **telle quelle**, avec la fin `?sslmode=require...` : elle
   impose une connexion chiffrée. Elle contient le mot de passe de la base :
   rangez-la dans votre gestionnaire de mots de passe.

**Connexion directe ou « poolée » ?** Neon propose deux adresses : la
directe, et la « poolée » (avec `-pooler` dans le nom), qui partage les
connexions entre beaucoup de clients. Le code accepte les deux. Nous
conseillons la **directe** :

- le serveur applique les **migrations** (création des tables) à chaque
  démarrage, et Neon recommande la connexion directe pour les migrations ;
- avec un seul petit serveur, le nombre de connexions reste très bas.

Si un jour les journaux affichent `too many connections`, remplacez la chaîne
par la version poolée (interrupteur activé) : rien d'autre à changer.

### 3.3 Comment la base se remplit

Rien à faire à la main. Au démarrage, le serveur lance automatiquement
`migrate`, qui **crée toutes les tables** dans la base vide. Aucune donnée de
démonstration n'est ajoutée : le remplissage de test ne tourne que si la
variable `RUN_SEED=true` existe. **Ne créez jamais `RUN_SEED` en
production** : il créerait des comptes administrateur aux mots de passe
connus de tous.

---

## 4. Netlify : le site web

À faire **après** la fusion de `feature/render-production` dans `master` :
c'est elle qui apporte le fichier `netlify.toml` dont Netlify a besoin.

### 4.1 Importer le dépôt

1. Inscrivez-vous sur https://app.netlify.com (offre **Free**), de préférence
   avec votre compte GitHub.
2. Sur le tableau de bord : **Add new project > Import an existing project**.
3. Choisissez **GitHub** et autorisez Netlify à lire le dépôt
   `ihsen-z/transporti-v1` (vous pouvez limiter l'accès à ce seul dépôt).
4. Sélectionnez le dépôt `ihsen-z/transporti-v1`.
5. **Branche à déployer** : `master`.
6. Réglages de construction : le fichier `netlify.toml` du dépôt les fixe, et
   il **l'emporte sur l'écran**. Si les champs sont préremplis, ne touchez à
   rien. S'ils sont vides, laissez-les vides, ou mettez au besoin
   (libellés à vérifier) :
   - **Base directory** : `frontend`
   - **Build command** : `npm run build`
   - **Publish directory** : `frontend/.next`
   - **Functions directory** : vide
7. Si l'écran propose d'ajouter des variables d'environnement, ajoutez celle
   du §4.2 dès maintenant. Sinon, faites-le juste après.
8. Cliquez le bouton de mise en ligne (**Deploy** ou **Publish**, à vérifier).

Netlify reconnaît Next.js tout seul et installe ce qu'il faut. Le premier
déploiement prend quelques minutes.

### 4.2 La variable du site

1. Ouvrez le projet, puis **Project configuration > Environment variables**.
2. **Add a variable** :
   - Key : `NEXT_PUBLIC_API_URL`
   - Value : `https://transporti-v1.onrender.com` (sans `/` à la fin)
   - Contextes : **All deploy contexts**.
3. Cette valeur est gravée dans le site au moment de la construction : après
   l'avoir ajoutée ou modifiée, relancez une construction (**Deploys >
   Trigger deploy > Deploy site**, à vérifier).

### 4.3 Choisir l'adresse du site

1. Netlify donne une adresse au hasard, du type
   `https://nom-au-hasard-123.netlify.app`.
2. Changez le nom **tout de suite**, avant l'étape 5 (ex. `transporti` →
   `https://transporti.netlify.app`, si le nom est libre) : **Project
   configuration > General > Project details > Change project name** (à
   vérifier).
3. **Notez l'adresse finale.** Elle sert deux fois à l'étape 5
   (`CORS_ALLOWED_ORIGINS` et `FRONTEND_URL`). Si vous la changez plus tard,
   il faudra aussi changer ces deux variables sur Render.

Domaine personnalisé (ex. `www.transporti.tn`) : plus tard, dans **Domain
management > Production domains > Add a domain**. Ajoutez alors aussi cette
adresse dans `CORS_ALLOWED_ORIGINS` sur Render (plusieurs adresses séparées
par une virgule) et mettez-la dans `FRONTEND_URL`.

À ce stade, le site s'affiche, mais la connexion ne marchera qu'après
l'étape 5.

---

## 5. Render : régler le serveur `transporti_v1`

À faire **après** la fusion de la PR #13 dans `master`. Le service existe
déjà : on le règle **à la main**, sans Blueprint (voir l'annexe).

Ouvrez https://dashboard.render.com, puis le service `transporti_v1`.

### 5.1 Les réglages du service

Onglet **Settings** :

1. **Branch** : `master`. **Auto-Deploy** : à chaque commit (**On Commit**).
2. **Instance Type** : **Free**.
3. Section **Health Checks** > **Edit** > chemin : `/ping/` > **Save
   Changes**. Surtout **pas** `/health/` : celui-ci interroge la base toutes
   les quelques secondes, ce qui empêcherait Neon de se mettre en pause et
   épuiserait ses heures gratuites. `/ping/` répond sans toucher à la base.

### 5.2 Les variables : supprimer, remplacer, ajouter

Onglet **Environment**. Aujourd'hui le service a 7 variables. Voici quoi en
faire :

| Variable | Action |
|---|---|
| `DB_URL_OVERRIDE` | **SUPPRIMER**. Elle passe avant `DATABASE_URL` et pointe vers la base disparue. |
| `DATABASE_URL` | **REMPLACER** la valeur par la chaîne Neon du §3.2. |
| `ENV` | garder : doit valoir `production` |
| `DEBUG` | garder : doit valoir `False` |
| `ALLOWED_HOSTS` | garder : doit valoir `transporti-v1.onrender.com` |
| `SECRET_KEY`, `JWT_SECRET_KEY` | garder tels quels |
| toutes les autres | **AJOUTER** avec le bloc ci-dessous |

**Le secret des tâches planifiées (`CRON_SECRET`).** C'est un mot de passe
que seuls Render et cron-job.org connaîtront. Fabriquez-le avec le
générateur de votre gestionnaire de mots de passe : **48 caractères, lettres
et chiffres seulement** (pas d'espace ni de symbole, pour éviter les erreurs
de copie). Gardez-le : il resservira au §6.

**Bloc prêt à coller** avec **Add from .env** (remplacez les `<...>`, sans
laisser de `/` à la fin des adresses) :

```
PORT=8000
CORS_ALLOWED_ORIGINS=https://<votre-site>.netlify.app
FRONTEND_URL=https://<votre-site>.netlify.app
MOBILE_APP_SCHEME=transporti
MOBILE_DEEP_LINK_ENABLED=true
PUSH_NOTIFICATION_MODE=SANDBOX
CRON_SECRET=<secret de 48 caractères>
PAYMENT_GATEWAY=DISABLED
COD_MAX_AMOUNT=300
COMMISSION_DEBT_LIMIT=60
AWS_STORAGE_BUCKET_NAME=transporti-media
AWS_S3_ENDPOINT_URL=https://<ACCOUNT_ID>.r2.cloudflarestorage.com
AWS_ACCESS_KEY_ID=<Access Key ID R2>
AWS_SECRET_ACCESS_KEY=<Secret Access Key R2>
AWS_S3_REGION_NAME=auto
EMAIL_BACKEND=django.core.mail.backends.smtp.EmailBackend
EMAIL_HOST=smtp-relay.brevo.com
EMAIL_PORT=2525
EMAIL_USE_TLS=True
EMAIL_HOST_USER=<Login SMTP Brevo>
SENDGRID_API_KEY=<clé SMTP Brevo>
DEFAULT_FROM_EMAIL="Transporti <contact@votre-domaine>"
```

À ne **pas** créer : `RUN_SEED` (comptes de test), `AWS_S3_CUSTOM_DOMAIN` et
`MEDIA_CDN_URL` (liens non signés vers des fichiers privés).

### 5.3 Enregistrer et déployer

1. Enregistrez avec **Save, rebuild, and deploy**.
   - La PR #13 n'est pas encore dans `master` ? Choisissez **Save only** :
     le déploiement échouerait de toute façon. Il partira tout seul à la
     fusion.
2. Onglet **Logs** : vous devez voir `Running migrations...` (création des
   tables dans Neon), puis le démarrage du serveur. Le premier démarrage sur
   une base vide prend un peu plus longtemps.
3. Le déploiement est réussi quand le statut passe à **Live**.

### 5.4 Créer votre compte administrateur

La base est vide : il n'existe aucun compte, ni administrateur. L'offre
gratuite de Render n'a pas de terminal (Shell), on passe donc par Neon.

1. Sur le site Netlify, **inscrivez-vous normalement** avec votre adresse
   e-mail.
2. Dans Neon, ouvrez le projet, puis **SQL Editor** (menu de gauche, à
   vérifier).
3. Collez cette requête en remplaçant l'adresse, puis lancez-la (**Run**) :

   ```sql
   UPDATE users_user
   SET role = 'ADMIN', is_staff = true, is_superuser = true
   WHERE email = 'votre-adresse@exemple.com';
   ```

   Le résultat doit indiquer **1 ligne modifiée**. Zéro ligne : l'adresse ne
   correspond pas, vérifiez la faute de frappe.
4. Déconnectez-vous du site puis reconnectez-vous : le back-office admin est
   accessible. L'administration technique de Django est aussi disponible sur
   https://transporti-v1.onrender.com/admin/.

---

## 6. cron-job.org : les tâches planifiées et le réveil

Le serveur a des tâches de maintenance à lancer régulièrement. Sans elles, les
offres n'expirent jamais, les paiements bloqués ne sont jamais libérés, les
avis ne sont jamais révélés et les pièces KYC ne sont jamais purgées. Sur
l'offre gratuite, c'est un service extérieur qui « sonne » le serveur :

| Groupe | Tâches | Fréquence |
|---|---|---|
| `frequentes` | expirer les offres en attente, libérer les paiements après 48 h | toutes les heures |
| `quotidiennes` | révéler les avis après 7 jours, purger les pièces KYC après 5 ans | une fois par nuit |

**Limite à connaître :** cron-job.org abandonne un appel au bout de **30
secondes** (fixe, non réglable). Or un serveur endormi met environ une minute
à se réveiller. C'est pourquoi la **tâche « réveil »** (job 1) n'est pas
optionnelle en pratique : elle garde le serveur éveillé, et les appels des
tâches répondent alors en quelques secondes. Elle sert aussi vos
utilisateurs : plus d'attente d'une minute au premier écran.

### 6.1 Créer le compte

1. Inscrivez-vous sur https://console.cron-job.org (gratuit).
2. Confirmez votre adresse e-mail.

### 6.2 Job 1 : le réveil (à créer en premier)

1. **Create cronjob** (à vérifier).
2. **Title** : `Transporti - réveil`.
3. **URL** : `https://transporti-v1.onrender.com/ping/`
4. **Execution schedule** : toutes les **10 minutes** (le serveur s'endort
   après 15 minutes sans visite).
5. Méthode : **GET** (par défaut). Pas d'en-tête.
6. Enregistrez (**Create**, à vérifier).

Ce réveil n'utilise pas la base : il ne consomme rien chez Neon. Il ne tient
dans les 750 heures gratuites de Render que si `transporti_v1` est **le seul
service gratuit** du compte (étape 7).

### 6.3 Job 2 : les tâches fréquentes (toutes les heures)

1. **Create cronjob**.
2. **Title** : `Transporti - tâches fréquentes`.
3. **URL** :
   `https://transporti-v1.onrender.com/api/v1/taches-planifiees/?groupe=frequentes`
4. **Execution schedule** : **toutes les heures** (par exemple à la minute 5).
5. Onglet **Advanced** (à vérifier) :
   - **Request method** : **POST** (obligatoire : un GET reçoit une erreur) ;
   - **Headers** : ajoutez un en-tête
     - nom : `Authorization`
     - valeur : `Bearer <votre CRON_SECRET>` (le mot `Bearer`, **une
       espace**, puis le secret) ;
   - **Time zone** : `Africa/Tunis`.
6. **Notifications** : cochez l'envoi d'un e-mail quand l'exécution **échoue**,
   et quand le job est **désactivé** après trop d'échecs (libellés à
   vérifier).
7. Enregistrez.

### 6.4 Job 3 : les tâches de nuit

Même chose que le job 2, avec :

- **Title** : `Transporti - tâches de nuit` ;
- **URL** :
  `https://transporti-v1.onrender.com/api/v1/taches-planifiees/?groupe=quotidiennes`
- **Execution schedule** : **tous les jours à 03:00**, fuseau `Africa/Tunis`.

### 6.5 Lire les réponses

Dans l'historique d'un job (**History**, à vérifier) :

| Code | Signification | Que faire |
|---|---|---|
| **200** | toutes les tâches ont réussi | rien |
| **401** | secret refusé | vérifiez l'en-tête : `Bearer`, une espace, puis exactement le `CRON_SECRET` de Render |
| **404** | `CRON_SECRET` absent sur Render (ou mauvaise adresse) | ajoutez la variable (§5.2) et redéployez |
| **405** | méthode GET au lieu de POST | réglez **Request method** sur POST |
| **500** | une tâche a échoué (les autres ont tourné) | Render > `transporti_v1` > **Logs**, cherchez `SCHEDULER_TASK_FAILED` |
| délai dépassé | serveur endormi | vérifiez que le job 1 (réveil) est actif |

Toutes ces tâches peuvent être relancées sans risque : elles ne traitent que
ce qui est échu.

### 6.6 Variante : GitHub Actions

À la place de cron-job.org, GitHub peut lancer ces appels depuis le dépôt
(onglet **Actions**). Il faut pour cela un petit fichier de configuration dans
le dépôt (non créé à ce jour, Claude peut l'ajouter) et le secret rangé dans
les « secrets » du dépôt. Limites : intervalle minimum de 5 minutes, horaires
parfois retardés quand GitHub est chargé, et, sur un dépôt public, arrêt
automatique après 60 jours sans activité. cron-job.org reste plus simple pour
démarrer.

---

## 7. Retirer le site de Render

Une fois que le site Netlify fonctionne (§8.6 réussi) :

1. Render > service `transporti-frontend` > **Settings**.
2. Tout en bas : **Delete Web Service** (ou **Suspend Service** si vous
   préférez garder la possibilité de revenir en arrière) (libellés à
   vérifier).

**Pourquoi c'est obligatoire :** les deux services gratuits se partagent les
750 heures mensuelles du compte. Avec le réveil toutes les 10 minutes, le
serveur en utilise déjà 744 à lui seul. Si `transporti-frontend` reste actif,
les heures s'épuisent avant la fin du mois et Render **suspend tous les
services gratuits**, serveur compris.

Pour la même raison, n'activez pas les « previews » (copies de test
automatiques) sur `transporti_v1`, et ne créez pas d'autre service gratuit
sur ce compte.

---

## 8. Vérifications après déploiement

Les adresses en GET s'ouvrent simplement dans le navigateur. Dans un terminal
Windows (PowerShell), tapez bien `curl.exe` et non `curl`.

### 8.1 Le serveur répond

https://transporti-v1.onrender.com/ping/

Attendu : `{"status": "ok"}`.

### 8.2 Le serveur parle à la base Neon

https://transporti-v1.onrender.com/health/

Attendu : `"status": "healthy"` et `"database": "connected"`. Si vous voyez
`"database": "error"` : `DATABASE_URL` est fausse, ou `DB_URL_OVERRIDE`
existe encore (§5.2).

### 8.3 Le paiement en ligne est bien coupé

https://transporti-v1.onrender.com/api/v1/payments/config/

Attendu :

```json
{"cod_max_amount": 300.0, "commission_debt_limit": 60.0, "online_payment_enabled": false}
```

Une erreur 404 signifie que l'ancien code tourne encore : vérifiez la branche
et relancez **Manual Deploy > Deploy latest commit**.

### 8.4 Les tâches planifiées tournent

1. Dans cron-job.org, l'historique des jobs 2 et 3 doit montrer des **200**.
2. Pour tester sans attendre, depuis un terminal :

   ```
   curl.exe -X POST -H "Authorization: Bearer <CRON_SECRET>" "https://transporti-v1.onrender.com/api/v1/taches-planifiees/?groupe=frequentes"
   ```

   Attendu :
   `{"groupe": "frequentes", "taches": {"expire_stale_offers": true, "auto_release_escrow": true}}`

### 8.5 Les fichiers survivent à un redéploiement

1. Sur le site, connectez-vous et changez la **photo de profil** (avatar).
2. Dans Cloudflare, bucket `transporti-media` : un fichier doit apparaître
   dans le dossier `avatars/`.
3. Dans Render, `transporti_v1` > **Manual Deploy** > **Deploy latest
   commit**.
4. Une fois le déploiement terminé, rechargez le profil : la photo doit
   toujours s'afficher.

### 8.6 Le site Netlify fonctionne

1. Ouvrez `https://<votre-site>.netlify.app`.
2. Connectez-vous avec votre compte (§5.4).
3. Si la page de connexion affiche une erreur réseau : appuyez sur F12,
   onglet **Console**. Un message contenant `CORS` signifie que
   `CORS_ALLOWED_ORIGINS` sur Render ne correspond pas **exactement** à
   l'adresse du site (`https://`, pas de `/` final), ou que Render n'a pas
   été redéployé après la modification.

### 8.7 Les e-mails partent

1. Sur `https://<votre-site>.netlify.app/forgot-password`, demandez une
   réinitialisation pour un compte dont vous lisez la boîte.
2. L'e-mail doit arriver en moins de 2 minutes (regardez aussi les spams).
3. Le lien doit ouvrir la page `reset-password` du site Netlify (sinon,
   vérifiez `FRONTEND_URL`).
4. Rien ne vient ? Regardez `transporti_v1` > **Logs** et cherchez
   `EMAIL_FAILED` (le message d'erreur suit). Vérifiez que `EMAIL_PORT` vaut
   bien `2525` (§2.3). Dans Brevo, consultez les journaux d'envoi
   transactionnels **(à vérifier)**.

---

## Annexe A : pourquoi pas de Blueprint

Un **Blueprint** est la fonction de Render qui lit `render.yaml` et crée les
services décrits. Le service `transporti_v1` a été créé à la main : un
Blueprint **nouveau** ne le reprendrait pas, il en créerait une **copie**
avec un autre nom et une autre adresse, que ni le site ni l'application
n'appellent. Le fichier `render.yaml` sert donc de **référence** (noms et
valeurs des variables, commentés), et on règle le service à la main comme au
§5.

## Annexe B : sources consultées le 26/10/2026

- Render : render.com/docs/free (veille après 15 min, 750 h, ports e-mail
  bloqués, pas de Shell, base gratuite de 30 jours), render.com/docs/health-checks,
  render.com/docs/configure-environment-variables.
- Neon : neon.com/docs/introduction/plans et neon.com/pricing (1 Go,
  100 CU-hours, pause après 5 min, sans carte bancaire),
  neon.com/docs/introduction/regions, neon.com/docs/manage/projects,
  neon.com/docs/connect/connection-pooling, neon.com/docs/guides/django.
- Netlify : docs.netlify.com (frameworks/next-js/overview,
  start/quickstarts/deploy-from-repository, build/environment-variables/get-started,
  build/configure-builds/ignore-builds, crédits de l'offre Free et pause des
  projets dans manage/accounts-and-billing).
- cron-job.org : cron-job.org/en/faq (gratuit, délai de 30 s, POST et
  en-têtes, notifications), docs.cron-job.org/rest-api.html.
- GitHub : docs.github.com, événement `schedule` des Actions.
- Cloudflare : developers.cloudflare.com/r2 (get-started/s3, api/tokens,
  pricing). Brevo : developers.brevo.com/docs/smtp-integration (ports 587,
  2525 et 465).
