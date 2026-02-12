# Transporti V1 - Frontend

Ce dossier contient l'interface utilisateur de Transporti V1, développée avec **Next.js 14** et **TailwindCSS**.

## Prérequis

*   Node.js 18+
*   npm ou yarn

## Installation

1.  **Installez les dépendances :**
    ```bash
    npm install
    # ou
    yarn install
    ```

2.  **Configuration :**
    Assurez-vous que le backend est lancé sur `http://localhost:8000` (ou configurez `.env.local` si nécessaire).

## Lancement

Pour démarrer le serveur de développement :

```bash
npm run dev
```

L'application sera accessible sur `http://localhost:3000`.

## Structure

*   `app/` : Pages et routing (App Router).
*   `components/` : Composants UI réutilisables.
*   `contexts/` : Gestion d'état global (Auth, etc.).
*   `hooks/` : Hooks personnalisés.
*   `lib/` : Utilitaires et configuration API.
