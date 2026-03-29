# Guide du Débutant - Environnement Transporti V1 (Windows)

Bienvenue sur ce projet ! Ce document est conçu pour vous aider à utiliser cet environnement de développement spécifique sur votre machine Windows.

## 1. Où se trouve le projet ?
Le code source est situé ici :  
`C:\Users\DELL\.gemini\antigravity\playground\tensor-ride\transporti_v1`

---

## 2. Comment ouvrir un terminal ?
Pour lancer les serveurs, vous aurez besoin de deux terminaux (fenêtres de commande) :

1.  Appuyez sur la touche **Windows**, tapez `PowerShell`, et appuyez sur **Entrée**.
2.  Ou, si vous utilisez **VS Code**, allez dans le menu en haut : `Terminal` > `New Terminal`.

---

## 3. Lancer le Backend (Serveur de données)
Le "Backend" est le cœur du projet. Il gère la base de données.

1.  **Ouvrez un premier terminal.**
2.  **Copiez et collez cette commande exacte** :
    ```powershell
    cd "C:\Users\DELL\.gemini\antigravity\playground\tensor-ride\transporti_v1\backend"; .\venv\Scripts\activate; python manage.py runserver
    ```
3.  **Vérification** : Une fois lancé, ouvrez votre navigateur sur [http://localhost:8000/health/](http://localhost:8000/health/). Vous devriez voir un message `{"status": "healthy"}`.

---

## 4. Lancer le Frontend (Interface Utilisateur)
Le "Frontend" est ce que l'utilisateur voit (le site web).

1.  **Ouvrez un second terminal.**
2.  **Copiez et collez cette commande exacte** :
    ```powershell
    cd "C:\Users\DELL\.gemini\antigravity\playground\tensor-ride\transporti_v1\frontend"; npm run dev
    ```
3.  **Vérification** : Une fois lancé, ouvrez votre navigateur sur [http://localhost:3000](http://localhost:3000). Vous verrez la page d'accueil de **Transporti V1**.

---

## 5. Résumé des outils installés sur cette machine
Voici les versions des logiciels déjà configurés pour vous :
- **Node.js** : v24.12.0 (Pour le Frontend)
- **Python** : 3.10+ (Pour le Backend)
- **Base de données** : SQLite (Fichier `db.sqlite3` dans le dossier backend)

## 6. Astuces pour débutants
- **Arrêter un serveur** : Allez dans le terminal et appuyez sur `Ctrl + C`.
- **Rafraîchir** : Si le site ne s'affiche pas, vérifiez que les deux terminaux sont bien ouverts et sans erreurs rouges.
- **Chemins** : Sous Windows, nous utilisons des barres obliques inverses `\` pour les dossiers.
