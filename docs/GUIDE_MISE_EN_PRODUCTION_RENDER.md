# Guide de mise en production de Transporti sur Render

Rédigé le 26/10/2026. Pour le fondateur : chaque étape est courte et se fait
dans un navigateur. Aucune ligne de code à écrire.

Les libellés de boutons ont été vérifiés dans la documentation officielle de
Render, Cloudflare et Brevo à cette date. Quand un libellé n'a pas pu être
vérifié, il est marqué **(à vérifier)** : l'écran peut avoir un nom un peu
différent, cherchez le plus proche.

---

## 0. Avant de commencer : où on en est

**Ce qui tourne aujourd'hui sur votre compte Render :**

| Service | Adresse | Rôle |
|---|---|---|
| `transporti-v1` | https://transporti-v1.onrender.com | le serveur (API) appelé par le site et l'application mobile |
| `transporti-frontend` | https://transporti-frontend.onrender.com | le site web et le back-office admin |

Ce déploiement fait tourner un **ancien code** (d'avant les fusions du 25-26/10).

**Ce que ce guide met en place :**

1. **Paiement en espèces seulement** (`PAYMENT_GATEWAY=DISABLED`). Sans ce
   réglage, le serveur refuse désormais de démarrer en production. C'est voulu :
   le mode « bac à sable » déclarerait tout paiement réussi sans encaisser.
2. **Un stockage durable pour les fichiers** (Cloudflare R2). Aujourd'hui, une
   photo envoyée est effacée à chaque redéploiement.
3. **L'envoi des e-mails** (Brevo). Aujourd'hui, aucun e-mail ne part :
   « mot de passe oublié » ne fonctionne pas.
4. **Le planificateur** (`transporti-scheduler`), qui expire les offres, libère
   les paiements bloqués et purge les pièces KYC après 5 ans. S'il n'existe pas,
   aucune de ces tâches ne tourne.

**Prérequis côté code :** les branches doivent être fusionnées dans `master`
dans cet ordre : PR #10, puis PR #13 (mode espèces), puis
`feature/render-production` (ce guide et le nouveau `render.yaml`).

> **Point bloquant à connaître (pièces KYC).** Le code actuel écrit les
> pièces d'identité et les selfies directement sur le disque du serveur, sans
> passer par R2. Même avec R2 configuré, **ces pièces sont encore effacées à
> chaque déploiement**, et la purge des 5 ans ne vise que le disque. Les
> avatars et les photos passent bien par R2. Une correction du code est
> nécessaire avant d'accepter de vraies pièces d'identité. Elle est décrite
> dans le compte rendu technique qui accompagne ce guide.

### Coûts par mois (prix Render relevés en octobre 2026, à revérifier sur render.com/pricing)

| Élément | Plan | Prix indicatif |
|---|---|---|
| Serveur `transporti-v1` | Starter (toujours allumé) | env. 7 $ |
| Planificateur `transporti-scheduler` | Starter (pas d'offre gratuite pour ce type) | env. 7 $ |
| Site `transporti-frontend` | Free (s'endort après 15 min sans visite) | 0 $ |
| Base PostgreSQL | Basic-256mb (plus petit plan payant) | env. 6 $ + stockage |
| Cloudflare R2 | gratuit jusqu'à 10 Go | 0 $ |
| Brevo | gratuit (300 e-mails par jour, à vérifier) | 0 $ |
| **Total** | | **env. 20 $ par mois, environ 65 DT** |

Si votre serveur actuel est sur le plan gratuit (il « s'endort » et met près
d'une minute à répondre), passer à Starter ajoute 7 $ par mois. C'est voulu :
une application mobile qui met une minute à répondre au premier écran paraît
en panne.

---

## 1. Cloudflare R2 : le stockage des fichiers

R2 garde les fichiers envoyés (avatars, photos de marchandise) hors du serveur,
pour qu'ils survivent aux redéploiements.

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
brevo.com/pricing).

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
   - le **port** : `587` ;
   - le **Login** (une adresse du type `xxxxxx@smtp-brevo.com`).
3. Générez une **clé SMTP** (bouton du type « Generate a new SMTP key »,
   **(à vérifier)**) et copiez-la tout de suite. Attention : c'est une **clé
   SMTP**, pas une « clé API ». Une clé API ne fonctionne pas en SMTP.

### 2.4 Correspondance avec les variables du serveur

Le code a été écrit pour SendGrid. Il fonctionne avec Brevo à condition de
remplir ces variables :

| Variable | Valeur pour Brevo |
|---|---|
| `EMAIL_BACKEND` | `django.core.mail.backends.smtp.EmailBackend` |
| `EMAIL_HOST` | `smtp-relay.brevo.com` (le serveur affiché par Brevo) |
| `EMAIL_PORT` | `587` |
| `EMAIL_USE_TLS` | `True` |
| `EMAIL_HOST_USER` | le **Login** SMTP Brevo |
| `SENDGRID_API_KEY` | la **clé SMTP** Brevo. Le nom trompe : c'est simplement la variable où le serveur lit le mot de passe SMTP. |
| `DEFAULT_FROM_EMAIL` | l'expéditeur vérifié, ex. `Transporti <contact@transporti.tn>` |

---

## 3. Les valeurs à coller dans Render

Les valeurs fixes sont déjà écrites dans `render.yaml`. Les **secrets** ne
sont jamais dans le code : vous les saisissez vous-même.

Astuce : dans l'onglet **Environment** d'un service, le bouton **Add from
.env** permet de coller plusieurs lignes `CLÉ=valeur` d'un coup. Mettez entre
guillemets une valeur qui contient des espaces.

### 3.1 Service `transporti-v1` (le serveur)

Bloc prêt à coller (remplacez les `<...>`) :

```
ENV=production
DEBUG=False
PORT=8000
ALLOWED_HOSTS=transporti-v1.onrender.com
CORS_ALLOWED_ORIGINS=https://transporti-frontend.onrender.com
FRONTEND_URL=https://transporti-frontend.onrender.com
MOBILE_APP_SCHEME=transporti
MOBILE_DEEP_LINK_ENABLED=true
PUSH_NOTIFICATION_MODE=SANDBOX
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
EMAIL_PORT=587
EMAIL_USE_TLS=True
EMAIL_HOST_USER=<Login SMTP Brevo>
SENDGRID_API_KEY=<clé SMTP Brevo>
DEFAULT_FROM_EMAIL="Transporti <contact@votre-domaine>"
```

Ne touchez pas à `DATABASE_URL`, `SECRET_KEY` ni `JWT_SECRET_KEY` s'ils
existent déjà : les changer déconnecterait tous les utilisateurs.

**Ne créez pas** `AWS_S3_CUSTOM_DOMAIN` ni `MEDIA_CDN_URL` : ils
produiraient des liens non signés vers des fichiers privés.

### 3.2 Service `transporti-scheduler` (le planificateur)

```
ENV=production
DEBUG=False
ALLOWED_HOSTS=transporti-v1.onrender.com
PAYMENT_GATEWAY=DISABLED
COD_MAX_AMOUNT=300
COMMISSION_DEBT_LIMIT=60
AWS_S3_REGION_NAME=auto
```

Plus, **mêmes valeurs que sur `transporti-v1`** : `DATABASE_URL`,
`SECRET_KEY`, `JWT_SECRET_KEY`, `AWS_STORAGE_BUCKET_NAME`,
`AWS_S3_ENDPOINT_URL`, `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`. Avec le
Blueprint, Render les recopie tout seul depuis le serveur. À la main, copiez-
les depuis l'onglet Environment de `transporti-v1`.

Pas de variables e-mail ici : le planificateur n'envoie pas d'e-mail.

### 3.3 Service `transporti-frontend` (le site)

```
NEXT_PUBLIC_API_URL=https://transporti-v1.onrender.com
```

---

## 4. Appliquer la configuration : Blueprint ou à la main ?

Un **Blueprint** est la fonction de Render qui lit `render.yaml` et crée ou
met à jour les services décrits. **Attention, piège :** d'après la
documentation de Render, un Blueprint **nouvellement créé** ne reprend pas
des services créés à la main. S'il trouve des services du même nom, Render
affiche un avertissement et **crée des copies** avec un suffixe dans le nom :
un second serveur à une autre adresse, et une **seconde base de données
vide**. Le site et l'application continueraient d'appeler l'ancien serveur.

### 4.1 D'abord, vérifier (5 minutes)

Dans https://dashboard.render.com :

1. Menu **Blueprints** : un Blueprint existe-t-il déjà pour ce dépôt ?
   - **Oui** : passez au chemin B.
   - **Non** (cas le plus probable, puisque le serveur porte le nom
     `transporti-v1` et non celui de l'ancien fichier) : suivez le chemin A.
2. Notez le **nom exact de la base PostgreSQL** et son **plan**. Si le plan
   est **Free**, la base expire 30 jours après sa création, puis Render la
   **supprime** 14 jours plus tard. Passez-la sur un plan payant
   (Basic-256mb) avant tout le reste.
3. Ouvrez `transporti-v1` puis **Settings** et notez :
   - **Branch** (la branche déployée) : elle doit être `master` ;
   - **Auto-Deploy** : **On Commit** redéploie à chaque fusion dans `master` ;
   - **Health Check Path** : mettez `/health/` ;
   - **Instance Type** : Starter recommandé (voir les coûts au §0).
4. Faites la même vérification de branche sur `transporti-frontend`.

### 4.2 Chemin A (recommandé) : réglage à la main, sans Blueprint

1. **Serveur** : `transporti-v1` > **Environment** > **Add from .env** > collez
   le bloc du §3.1 > enregistrez avec **Save only**.
2. **Planificateur** : **New > Background Worker** **(à vérifier)** :
   - dépôt `ihsen-z/transporti-v1`, branche `master` ;
   - Language : **Docker** ; Root Directory : `backend` ;
   - Region : **Frankfurt** ; Instance Type : **Starter** ;
   - Docker Command (sous **Advanced**) : `python manage.py run_scheduled_tasks` ;
   - variables : le §3.2.
3. **Base de données** : faites une sauvegarde ou un export avant le premier
   déploiement du nouveau code. Le serveur applique les migrations tout seul
   au démarrage (menu **Backups** ou **Recovery** de la base, **(à vérifier)**).
4. Déployez : `transporti-v1` > **Manual Deploy** > **Deploy latest commit**.
   Faites de même pour `transporti-frontend`.

Plus tard, quand tout fonctionne, la documentation de Render décrit comment
générer un Blueprint à partir de services existants (sélectionner les services
dans le tableau de bord, puis **Generate Blueprint**). Ce n'est pas nécessaire
pour lancer.

### 4.3 Chemin B : un Blueprint existe déjà

1. Vérifiez que `render.yaml` porte **exactement** les mêmes noms que le
   tableau de bord : `transporti-v1`, `transporti-frontend`,
   `transporti-scheduler`, et la base (`transporti-db` dans le fichier). Si la
   base porte un autre nom, faites corriger `render.yaml` (les deux lignes
   `name: transporti-db` des `fromDatabase` et le bloc `databases`) **avant**
   de synchroniser.
2. Vérifiez la **branche liée** au Blueprint (`master`) et son **Auto Sync**
   (réglages du Blueprint).
3. Lancez la synchro (**Manual Sync** si Auto Sync est sur « No »). Sur
   l'écran de revue, chaque service existant doit apparaître comme **mis à
   jour**, jamais comme **créé**. Le seul service qui peut être créé est
   `transporti-scheduler`. S'il est écrit qu'une base va être créée, ou si un
   nom a un suffixe : **annulez**.
4. Les variables secrètes (`sync: false` dans le fichier) **ne sont pas
   demandées** lors d'une mise à jour de Blueprint. Ajoutez-les à la main
   (§3.1), puis redéployez `transporti-v1`.

Attention : une synchro **change le plan** des services selon le fichier
(serveur et planificateur en Starter, site en Free). La base garde son plan
actuel : le fichier ne précise volontairement pas le plan de la base.

---

## 5. Vérifications après déploiement

Le premier appel peut prendre une minute si le site est sur le plan gratuit.

### 5.1 Le serveur répond, avec la base

Dans un terminal (ou en ouvrant l'adresse dans le navigateur) :

```
curl https://transporti-v1.onrender.com/health/
```

Attendu : `"status": "healthy"` et `"database": "connected"`.

### 5.2 Le paiement en ligne est bien coupé

```
curl https://transporti-v1.onrender.com/api/v1/payments/config/
```

Attendu :

```json
{"cod_max_amount": 300.0, "commission_debt_limit": 60.0, "online_payment_enabled": false}
```

Une erreur 404 signifie que l'ancien code tourne encore : vérifiez la branche
et relancez **Deploy latest commit**.

### 5.3 Le planificateur tourne

`transporti-scheduler` > **Logs** : une ligne `Scheduler started. 4 tasks
registered.` doit apparaître, puis des lignes `completed`. Une erreur
`CRITICAL: PAYMENT_GATEWAY` signifie qu'il manque `PAYMENT_GATEWAY=DISABLED`
sur ce service.

### 5.4 Les fichiers survivent à un redéploiement

1. Dans l'application ou sur le site, connectez-vous et changez la **photo de
   profil** (avatar).
2. Dans Cloudflare, bucket `transporti-media` : un fichier doit apparaître
   dans le dossier `avatars/`.
3. Dans Render, `transporti-v1` > **Manual Deploy** > **Deploy latest commit**.
4. Une fois le déploiement terminé, rechargez le profil : la photo doit
   toujours s'afficher.

Rappel : ce test vaut pour les avatars. Les pièces KYC ne survivent pas
encore (voir l'encadré du §0).

### 5.5 Les e-mails partent

1. Sur https://transporti-frontend.onrender.com/forgot-password, demandez une
   réinitialisation pour un compte dont vous lisez la boîte.
2. L'e-mail doit arriver en moins de 2 minutes (regardez aussi les spams).
3. Le lien doit ouvrir la page `reset-password` du site.
4. Rien ne vient ? Regardez `transporti-v1` > **Logs** et cherchez
   `EMAIL_FAILED` (le message d'erreur suit). Dans Brevo, consultez les
   journaux d'envoi transactionnels **(à vérifier)**.

---

## Annexe : ce que la vérification locale a prouvé (26/10/2026)

Avec la configuration de ce guide (`ENV=production`, `DEBUG=False`,
`PAYMENT_GATEWAY=DISABLED`, clés aléatoires) :

- `python manage.py check` : aucun problème ;
- `python manage.py check --deploy` : aucun avertissement de sécurité Django.
  Les 110 avertissements restants viennent du générateur de documentation
  d'API (drf-spectacular) et n'empêchent rien ;
- sans `PAYMENT_GATEWAY`, le serveur refuse de démarrer (`CRITICAL:
  PAYMENT_GATEWAY vaut 'SANDBOX' en production`), comme prévu ;
- avec les variables R2, le stockage bascule bien sur R2 et produit des liens
  signés vers `https://<ACCOUNT_ID>.r2.cloudflarestorage.com/transporti-media/...`.

Sources : render.com/docs (blueprint-spec, infrastructure-as-code,
configure-environment-variables, deploys, health-checks, free,
compute-plans), developers.cloudflare.com/r2 (get-started/s3, api/tokens,
pricing), developers.brevo.com/docs/smtp-integration.
