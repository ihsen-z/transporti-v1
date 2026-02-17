# Transporti V1 - Backend

Ce dossier contient l'API REST de Transporti V1, construite avec **Django** et **Django REST Framework**.

## Prérequis

*   Python 3.10+
*   Pip
*   Virtualenv (recommandé)

## Installation

1.  **Créez et activez un environnement virtuel :**
    ```bash
    python -m venv venv
    # Windows
    .\venv\Scripts\activate
    # Linux/Mac
    source venv/bin/activate
    ```

2.  **Installez les dépendances :**
    ```bash
    pip install -r requirements.txt
    ```

3.  **Configuration des variables d'environnement :**
    Copiez le fichier `.env.example` vers `.env` et remplissez les valeurs nécessaires (DB, Clés secrètes, etc.).
    ```bash
    cp .env.example .env
    ```

4.  **Appliquez les migrations :**
    ```bash
    python manage.py migrate
    ```

5.  **Créez un superutilisateur (Admin) :**
    ```bash
    python manage.py createsuperuser
    ```

## Lancement

Pour démarrer le serveur de développement :

```bash
python manage.py runserver
```
L'API sera accessible sur `http://localhost:8000`.

## Architecture des Apps

*   `users` : Gestion des utilisateurs et rôles.
*   `logistics` : C?ur du métier (Jobs, Offres).
*   `analytics`, `messaging`, `notifications`, `payments`... : Modules fonctionnels.
