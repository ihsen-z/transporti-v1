# Tester Transporti sur ton téléphone — guide pas à pas

Guide pour débutant. Objectif : voir l'application tourner sur ton téléphone,
avec les vraies données du backend qui tourne sur ton PC.

**Comment ça marche, en une phrase** : ton PC héberge l'application ; ton
téléphone s'y connecte par le Wi-Fi. Les deux doivent donc être sur le **même
réseau Wi-Fi**, et le PC doit **autoriser** le téléphone à se connecter.

> **iPhone** : lis d'abord la section « Cas de l'iPhone » en bas. Ce guide
> fonctionne aujourd'hui pour **Android**.

---

## Ce qu'il te faut

- Un téléphone **Android**
- Le téléphone et le PC sur le **même Wi-Fi**
- Un câble USB, ou n'importe quel moyen d'envoyer un fichier au téléphone

> **L'adresse du PC change avec le réseau.** Chaque Wi-Fi attribue une adresse
> différente (et la box peut en changer après un redémarrage). Ce guide n'en
> fixe donc aucune : `scripts/mobile-telephone.sh` la détecte et l'affiche à
> chaque lancement. C'est **toujours celle affichée par le script** qu'il faut
> utiliser — elle est notée `<IP-DU-PC>` dans la suite.

---

## Étape 1 — Ouvrir le pare-feu (à faire **une seule fois**)

Windows bloque par défaut les connexions entrantes. Sans ça, ton téléphone ne
verra jamais le PC. C'est la cause n°1 des échecs.

1. Menu Démarrer → tape `PowerShell`
2. **Clic droit** sur « Windows PowerShell » → **Exécuter en tant
   qu'administrateur**
3. Colle ces deux lignes, l'une après l'autre, et valide avec Entrée :

```
netsh advfirewall firewall add rule name="Transporti dev 8000" dir=in action=allow protocol=TCP localport=8000
```

```
netsh advfirewall firewall add rule name="Transporti dev 8082" dir=in action=allow protocol=TCP localport=8082
```

Chaque commande doit répondre **`Ok.`**

> Ces règles ouvrent deux ports **uniquement sur ton réseau local**, pour le
> temps du développement. Pour les retirer plus tard :
> `netsh advfirewall firewall delete rule name="Transporti dev 8000"`
> (idem avec `8082`), toujours en administrateur.

---

## Étape 2 — Installer la bonne version d'Expo Go (**une seule fois**)

**Attention, c'est le piège principal.** « Expo Go » est l'application qui va
faire tourner Transporti sur ton téléphone. Mais **ne l'installe pas depuis le
Play Store** : la version du Play Store est trop récente et refusera d'ouvrir
ce projet.

Pourquoi : Transporti est construit avec **Expo SDK 52**, et Expo Go ne sait
lire que les projets récents. Il te faut la version **2.32.19**, qui
correspond au SDK 52.

Le fichier est déjà prêt sur ton PC :

```
mobile/.expo/ExpoGo-2.32.19.apk        (211 Mo)
```

1. Copie ce fichier sur ton téléphone (câble USB, Google Drive, WhatsApp à
   toi-même… peu importe)
2. Sur le téléphone, ouvre le fichier
3. Android va demander l'autorisation d'installer une application « de source
   inconnue » → accepte
4. Une icône **Expo Go** apparaît

---

## Étape 3 — Démarrer l'application (à faire **à chaque fois**)

Sur le PC, dans le dossier du projet :

```bash
scripts/mobile-telephone.sh
```

Le script :

- trouve l'adresse de ton PC sur le Wi-Fi ;
- met à jour la configuration de l'application ;
- vérifie que le pare-feu est bien ouvert ;
- ouvre **deux fenêtres noires** :
  - « Backend Transporti » → le serveur de données
  - « Metro Transporti » → affiche un **QR code**

**Laisse ces deux fenêtres ouvertes** pendant tout le test. Les fermer arrête
l'application.

---

## Étape 4 — Connecter le téléphone

1. Ouvre **Expo Go** sur le téléphone
2. Touche **« Scan QR code »**
3. Vise le QR code affiché dans la fenêtre « Metro Transporti »

La première ouverture prend **30 à 60 secondes** (le téléphone télécharge
l'application). C'est normal. Ensuite, l'écran de connexion Transporti
apparaît.

Si le scan ne marche pas : dans Expo Go, touche **« Enter URL manually »** et
tape l'adresse affichée par le script, sous la forme :

```
exp://<IP-DU-PC>:8082
```

---

## Étape 5 — Se connecter dans l'application

Deux comptes de test, même mot de passe : **`Test@123!`**

| Rôle | E-mail |
|---|---|
| Transporteur | `mehdi.khelifi@test.transporti.tn` |
| Client | `leila.benamor@test.transporti.tn` |

Le transporteur voit « Publier un retour » et ses trajets ; le client voit
« Trouver un retour ».

---

## Si ça ne marche pas

| Symptôme | Cause la plus probable |
|---|---|
| Expo Go dit « incompatible » ou « SDK version » | version du Play Store installée → refaire l'**étape 2** avec l'APK fournie |
| Le QR scanne mais rien ne charge | téléphone sur un autre Wi-Fi, ou 4G activée → coupe les données mobiles |
| « Something went wrong » dans Expo Go | la fenêtre « Metro » a été fermée → relance l'étape 3 |
| L'app s'ouvre mais la connexion échoue | pare-feu → refaire l'**étape 1**, puis relancer le script |
| « Network request failed » | l'adresse IP du PC a changé → relance simplement le script |
| Un bandeau rouge `i18next::pluralResolver` | **normal en développement**, sans gravité, ferme-le avec la croix |

Pour vérifier que le PC est bien joignable, depuis le navigateur du
**téléphone** ouvre (avec l'adresse affichée par le script) :

```
http://<IP-DU-PC>:8000/api/
```

Une page (même une erreur « 404 ») = la connexion passe, le pare-feu est bon.
Rien du tout / « impossible d'accéder au site » = le pare-feu bloque encore.

---

## Cas de l'iPhone

Ce guide ne fonctionne **pas** tel quel sur iPhone, et il faut le savoir avant
de perdre du temps.

Sur Android, on peut installer l'ancienne version d'Expo Go via un fichier
APK. Sur iPhone, c'est impossible : l'App Store ne propose que la **dernière**
version d'Expo Go, qui ne sait pas ouvrir un projet **SDK 52**.

Trois options, par ordre d'effort :

1. **Tester sur un Android** (le plus simple aujourd'hui) ;
2. **Monter le projet vers un SDK récent** (`npx expo install --fix` puis
   montée de version) — c'est un vrai chantier technique, pas une manipulation
   de débutant ;
3. **Fabriquer une application iOS dédiée** avec EAS Build — nécessite un
   compte Expo et un compte développeur Apple.

---

## Rappel de sécurité

Les règles de pare-feu de l'étape 1 ouvrent ton PC **aux autres appareils du
réseau Wi-Fi**. Sur ton réseau domestique, c'est sans risque. Évite de laisser
ces ports ouverts sur un Wi-Fi public (café, aéroport, hôtel) : supprime alors
les règles avec les commandes données à l'étape 1.
