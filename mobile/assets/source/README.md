# Sources des icônes

Les PNG de `assets/` sont **générés**, pas dessinés à la main. Les fichiers
`.svg` de ce dossier en sont la source ; ils dérivent du logo officiel
(`frontend/public/images/logo.svg`) et ne diffèrent que par l'échelle et le
fond, selon les contraintes de chaque plateforme :

| Fichier | Sortie | Contrainte respectée |
|---|---|---|
| `icon.svg` | `icon.png` 1024×1024 | Fond **opaque** — l'App Store refuse la transparence sur l'icône |
| `adaptive-icon.svg` | `adaptive-icon.png` 1024×1024 | Marque réduite : Android recadre en cercle, le contenu doit tenir dans les ~66 % centraux. Fond transparent, la couleur vient de `android.adaptiveIcon.backgroundColor` |
| `splash-icon.svg` | `splash-icon.png` 1024×1024 | Marque discrète, affichée à 180 px par `expo-splash-screen` |

Régénérer après modification :

```bash
cd mobile
npx --yes sharp-cli -i assets/source/icon.svg -o assets/icon.png resize 1024 1024
npx --yes sharp-cli -i assets/source/adaptive-icon.svg -o assets/adaptive-icon.png resize 1024 1024
npx --yes sharp-cli -i assets/source/splash-icon.svg -o assets/splash-icon.png resize 1024 1024
npx --yes sharp-cli -i assets/source/icon.svg -o assets/favicon.png resize 48 48
```

Le logo change ? Modifier `frontend/public/images/logo.svg` d'abord, puis
reporter les tracés ici — les deux doivent rester identiques.
