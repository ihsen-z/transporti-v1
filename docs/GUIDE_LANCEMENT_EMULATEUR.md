# Lancer Transporti sur l'émulateur — guide manuel

Guide pas à pas, sans script, pour démarrer l'application sur l'émulateur
Android Studio. Compte environ **5 minutes** au premier lancement.

> **Raccourci** : si tu ne veux pas taper les commandes une par une,
> `scripts/mobile-emulator.sh` fait les étapes 1, 3 et 4 d'un coup. Ce guide
> est là pour comprendre ce qui se passe, et pour dépanner quand ça coince.

**Le principe** : trois choses doivent tourner **en même temps**.

| Quoi | Rôle | Port |
|---|---|---|
| L'émulateur | le faux téléphone | — |
| Le backend Django | les données (comptes, trajets) | 8000 |
| Metro | fabrique l'app et l'envoie au téléphone | 8082 |

Si l'un des trois s'arrête, l'application ne marche plus.

---

## Avant de commencer (une seule fois)

Vérifie que le fichier `mobile/.env` contient bien cette ligne :

```
EXPO_PUBLIC_API_BASE_URL=http://10.0.2.2:8000
```

`10.0.2.2` est l'adresse magique par laquelle l'émulateur voit ton PC. Ce n'est
ni `localhost` ni `127.0.0.1` : depuis l'émulateur, ceux-là désignent
l'émulateur lui-même, pas le PC.

> Si tu as testé sur un vrai téléphone entre-temps, cette ligne a été remplacée
> par une adresse Wi-Fi (`192.168.…`). Remets `10.0.2.2` pour l'émulateur.

---

## Étape 1 — Démarrer l'émulateur

Ouvre un terminal **Git Bash** dans le dossier du projet, et lance :

```bash
"$LOCALAPPDATA/Android/Sdk/emulator/emulator.exe" -avd Pixel_7_API_35 &
```

Une fenêtre de téléphone Android s'ouvre. **Attends qu'elle affiche l'écran
d'accueil** (une à deux minutes la première fois).

Pour vérifier qu'il est bien prêt :

```bash
"$LOCALAPPDATA/Android/Sdk/platform-tools/adb.exe" devices
```

Tu dois voir :

```
List of devices attached
emulator-5554   device
```

Si la liste est vide, c'est qu'il démarre encore. Attends et relance la
commande.

> Le seul émulateur installé s'appelle `Pixel_7_API_35`. Pour voir la liste :
> `"$LOCALAPPDATA/Android/Sdk/emulator/emulator.exe" -list-avds`

---

## Étape 2 — Démarrer le backend

Ouvre un **deuxième** terminal, et lance :

```bash
cd backend && ALLOWED_HOSTS="localhost,127.0.0.1,10.0.2.2" ./venv/Scripts/python.exe manage.py runserver 0.0.0.0:8000
```

Deux détails comptent, sinon rien ne marchera :

- `0.0.0.0:8000` — pour que le serveur accepte les connexions de l'émulateur,
  et pas seulement du PC.
- `ALLOWED_HOSTS` avec `10.0.2.2` — sans ça, Django **refuse** les requêtes de
  l'émulateur avec une erreur **400**.

Laisse ce terminal ouvert. Tu dois lire `Starting development server at
http://0.0.0.0:8000/`.

---

## Étape 3 — Démarrer Metro

Ouvre un **troisième** terminal :

```bash
cd mobile && npx expo start --port 8082
```

Attends la ligne `Waiting on http://localhost:8082`.

> **Pourquoi 8082 et pas 8081 ?** Le port 8081 (celui par défaut) est déjà
> utilisé par la version web du projet. Si tu laisses le port par défaut, Expo
> te posera une question et, sans réponse, ne démarrera pas.

Laisse ce terminal ouvert aussi.

---

## Étape 4 — Ouvrir l'application dans l'émulateur

Dans le **premier** terminal :

```bash
"$LOCALAPPDATA/Android/Sdk/platform-tools/adb.exe" shell am start -a android.intent.action.VIEW -d "exp://10.0.2.2:8082" host.exp.exponent
```

L'application **Expo Go** s'ouvre sur l'émulateur et affiche
« Bundling… » pendant 10 à 60 secondes, puis l'écran de connexion Transporti
apparaît.

> **Attention** : utilise bien `exp://10.0.2.2:8082`. Avec `127.0.0.1`, Expo Go
> échoue avec « connection refused », même si tout le reste est correct.

Expo Go est **déjà installé** sur cet émulateur — rien à installer.

---

## Étape 5 — Se connecter

Deux comptes de test, même mot de passe : **`Test@123!`**

| Rôle | E-mail |
|---|---|
| Transporteur | `mehdi.khelifi@test.transporti.tn` |
| Client | `leila.benamor@test.transporti.tn` |

Le transporteur voit « Publier un retour » et « Mes missions » ; le client voit
« Trouver un retour » et « Mes demandes ».

Ces comptes viennent de `backend/users/management/commands/seed_test_data.py`.
S'ils n'existent pas dans ta base :

```bash
cd backend && ./venv/Scripts/python.exe manage.py seed_test_data
```

---

## Tout arrêter

Ferme les fenêtres, ou dans chaque terminal fais **Ctrl + C**. Puis :

```bash
"$LOCALAPPDATA/Android/Sdk/platform-tools/adb.exe" emu kill
```

---

## Si ça coince

| Symptôme | Quoi faire |
|---|---|
| `adb devices` est vide | l'émulateur n'a pas fini de démarrer, ou il s'est fermé → refaire l'étape 1 |
| Metro reste bloqué sur `Starting Metro Bundler` | un ancien Metro tourne encore en fond (voir juste en dessous) |
| Expo Go : « Something went wrong » | Metro n'était pas prêt → vérifier l'étape 3, puis refaire l'étape 4 |
| Expo Go : « connection refused » | tu as utilisé `127.0.0.1` au lieu de `10.0.2.2` |
| L'app s'ouvre, la connexion échoue | le backend est éteint, ou `ALLOWED_HOSTS` sans `10.0.2.2` → étape 2 |
| `Port 8081 is being used` | utilise `--port 8082` comme à l'étape 3 |
| Écran blanc figé | recharge : refais l'étape 4 |
| L'app s'ouvre directement sur l'accueil | normal : la session précédente est mémorisée, pas besoin de se reconnecter |
| L'app est en arabe sans raison | la langue choisie reste mémorisée sur l'appareil ; rebascule avec le bouton **Français** en haut de l'écran |

### Metro bloqué sur « Starting Metro Bundler »

Cela arrive quand un Metro précédent ne s'est pas arrêté proprement : il n'ouvre
jamais le port et attend indéfiniment. Vérifie d'abord que personne n'écoute :

```bash
netstat -ano | grep 8082
```

Si la commande ne renvoie rien alors que Metro « démarre » depuis plus d'une
minute, ferme les processus Node restants puis refais l'étape 3 :

```bash
taskkill //IM node.exe //F
```

### Trois pièges de manipulation

**La touche RETOUR ferme l'application.** Sur l'écran de connexion, si tu
appuies sur le bouton retour d'Android pour masquer le clavier, tu quittes
l'app au lieu de fermer le clavier.

**Le clavier fait remonter le formulaire.** Quand le clavier s'ouvre, tout
l'écran se décale vers le haut : le bouton « Se connecter » n'est plus au même
endroit qu'avant. Si un clic « ne fait rien », ou si tu vois « Le mot de passe
est requis » alors que tu l'as tapé, c'est ça — regarde où sont réellement les
champs avant de cliquer.

**L'émulateur se ferme quand tu fermes son terminal.** Si tu veux qu'il
survive, lance-le détaché :

```bash
cd "$LOCALAPPDATA/Android/Sdk/emulator" && cmd //c start "" //B emulator.exe -avd Pixel_7_API_35
```

---

## Vérifier que tout tourne

À tout moment, ces trois commandes te disent où tu en es :

```bash
"$LOCALAPPDATA/Android/Sdk/platform-tools/adb.exe" devices
```

```bash
curl -s http://localhost:8082/status
```

```bash
curl -s -o /dev/null -w "%{http_code}\n" http://127.0.0.1:8000/api/
```

Attendu : un `emulator-5554 device`, puis `packager-status:running`, puis un
code HTTP (`404` est **normal** ici — cela prouve juste que Django répond).
