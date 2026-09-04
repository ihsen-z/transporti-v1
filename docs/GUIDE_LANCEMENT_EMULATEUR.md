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
| Metro | fabrique l'app et l'envoie au téléphone | **8081** |

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
cd mobile && npx expo start --port 8081
```

Attends la ligne `Waiting on http://localhost:8081`.

> **Pourquoi 8081 et pas 8082 ?** *(corrigé le 04/09, après une heure perdue
> en recette.)* Ce guide indiquait 8082 en supposant qu'on passait par Expo Go.
> Or **Expo Go n'est pas installé sur l'AVD** : ce qui l'est, c'est un build de
> développement `tn.transporti.app` qui cherche son bundle sur
> `ws://10.0.2.2:8081` **en dur**. Avec Metro sur 8082, l'application reste sur
> un écran noir **sans rien écrire dans les logs** — rien n'indique la cause.
>
> Si le port 8081 est déjà pris par la version web, arrête-la : c'est le mobile
> qui n'a pas le choix du port, pas le web.

Laisse ce terminal ouvert aussi.

---

## Étape 4 — Ouvrir l'application dans l'émulateur

Dans le **premier** terminal :

```bash
"$LOCALAPPDATA/Android/Sdk/platform-tools/adb.exe" shell monkey -p tn.transporti.app -c android.intent.category.LAUNCHER 1
```

L'application Transporti s'ouvre sur l'émulateur. Le premier lancement
affiche le logo pendant 20 à 60 secondes — Metro construit le bundle — puis
l'écran de connexion apparaît.

Pour vérifier que le bundle est bien parti, dans le terminal de Metro :
`Android Bundled 20593ms node_modules\expo-router\entry.js`.

> **Attention** : `10.0.2.2` et jamais `127.0.0.1`. Depuis l'émulateur,
> `127.0.0.1` désigne l'émulateur lui-même, pas ton PC.

Le build de développement est **déjà installé** sur cet émulateur — rien à
installer. Si tu dois le réinstaller, il se reconstruit avec
`npx expo run:android` (compte 10 à 15 minutes).

---

## Étape 5 — Se connecter

Deux comptes de test, même mot de passe : **`Test@123!`**

| Rôle | E-mail |
|---|---|
| Transporteur | `mehdi.khelifi@test.transporti.tn` |
| Client | `leila.benamor@test.transporti.tn` |

Le transporteur voit « Publier un retour » et « Mes missions » ; le client voit
« Trouver un retour » et « Mes demandes ».

### Rejoue le seed avant toute campagne

Les scénarios du jeu fixe sont datés **relativement à maintenant** : « un
retour dans deux jours », « un retour échu depuis deux jours ». Sans rejeu, ces
dates restent celles du premier seed et l'environnement **vieillit jusqu'à
devenir inutilisable** : au 03/09, les deux trajets retour du jeu fixe étaient
expirés et la recherche cliente ne renvoyait plus qu'une ligne héritée sans
prix — donc sans économie estimée. L'argument de conversion du produit était
invisible, et aucun code n'était en cause.

```bash
cd backend && ./venv/Scripts/python.exe manage.py seed_test_data
```

Depuis le 04/09, un rejeu **remet les dates à l'heure** (les autres champs, dont
`distance_km`, restent intacts). Verrouillé par
`backend/logistics/tests/test_seed_rafraichissement.py`.

**Et si tu veux repartir vraiment propre**, ajoute `--clear`. Un environnement
utilisé pendant des semaines accumule des lignes qu'aucun seed ne nettoie : au
03/09 il portait **82 trajets retour dont 78 sans prix** et 388 notifications
non lues, tous issus de l'usage et non du seed.

```bash
cd backend && ./venv/Scripts/python.exe manage.py seed_test_data --clear
```

Ces comptes et ces scénarios vivent dans
`backend/users/management/commands/seed_test_data.py`.

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
| **Écran noir figé, aucun log** | Metro n'écoute pas sur **8081**. C'est le seul port que le build installé accepte → étape 3 |
| L'app ne se connecte pas au bundle | tu as utilisé `127.0.0.1` au lieu de `10.0.2.2` |
| L'app s'ouvre, la connexion échoue | le backend est éteint, ou `ALLOWED_HOSTS` sans `10.0.2.2` → étape 2 |
| `Port 8081 is being used` | un autre Metro ou la version web tient le port. Arrête-le : le mobile n'a pas le choix du port (voir étape 3) |
| Écran blanc figé | recharge : refais l'étape 4 |
| La recherche cliente ne renvoie rien | les trajets du seed ont expiré → rejoue le seed (étape 5) |
| Aucune économie estimée sur les cartes | même cause, ou des lignes héritées sans prix → `seed_test_data --clear` |
| L'app s'ouvre directement sur l'accueil | normal : la session précédente est mémorisée, pas besoin de se reconnecter |
| L'app est en arabe sans raison | la langue choisie reste mémorisée sur l'appareil ; rebascule avec le bouton **Français** en haut de l'écran |

### Metro bloqué sur « Starting Metro Bundler »

Cela arrive quand un Metro précédent ne s'est pas arrêté proprement : il n'ouvre
jamais le port et attend indéfiniment. Vérifie d'abord que personne n'écoute :

```bash
netstat -ano | grep 8081
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
curl -s http://localhost:8081/status
```

```bash
curl -s -o /dev/null -w "%{http_code}\n" http://127.0.0.1:8000/api/
```

Attendu : un `emulator-5554 device`, puis `packager-status:running`, puis un
code HTTP (`404` est **normal** ici — cela prouve juste que Django répond).

---

## Mesurer au lieu d'estimer

Deux commandes valent d'être connues avant une campagne de recette.

```bash
scripts/mobile-ui.sh elements     # arbre d'accessibilité + centres cliquables
scripts/mobile-ui.sh cibles       # cibles tactiles sous 44 dp, mesurées en dp
```

`cibles` convertit les bornes en dp avec la densité **lue sur l'appareil** — un
AVD en 420 dpi et un téléphone en 320 dpi ne donnent pas les mêmes chiffres
pour le même code. C'est cette commande qui a trouvé les 16 cibles trop petites
du 03/09, là où une lecture des feuilles de style n'en voyait que cinq : le
style ne dit pas ce que le rognage par un parent produit. Elle a aussi trouvé
le bouton central rogné à 43 dp par sa translation verticale, invisible
autrement.

Elle a une limite à connaître : **`hitSlop` n'apparaît pas dans l'arbre
d'accessibilité**. Un chevron de 24 dp avec `hitSlop={12}` fait 48 dp au doigt
et sera pourtant signalé. La règle de lint `local/pressable-accessible` est
complémentaire : elle connaît `hitSlop` mais pas le rognage. Les deux ensemble
couvrent ce qu'aucune des deux ne voit seule.
