"use client";

import { useEffect } from "react";

/**
 * ForceLightTheme — garantit que les écrans métier restent en clair.
 *
 * Pourquoi ce composant existe (décision du 26/08/2026, lot 0.3) :
 * le chantier mode sombre a été annulé. Or `app/(app)` ne porte aucun style
 * `dark:`, tandis que la zone d'administration, elle, est réellement stylée en
 * sombre. Comme la classe `dark` est posée sur <html>, elle survit à une
 * navigation côté client depuis l'administration vers cette zone — ce qui
 * produisait une interface hybride : barre latérale sombre sur contenu clair,
 * bordures forcées en `neutral-700` par la règle `.dark *` de globals.css.
 *
 * On retire donc la classe à l'entrée de cette zone. Le mode sombre de
 * l'administration n'est pas touché : son ThemeProvider la repose à son propre
 * montage, avec sa propre clé de stockage (`transporti-admin-theme`).
 *
 * PÉRIMÈTRE RÉEL, et il est plus étroit que ce que ce fichier annonçait
 * jusqu'au 31/08/2026 : le composant n'est monté QUE dans `app/(app)/layout`.
 * Le second montage vivait dans `app/(marketing)/layout`, un groupe de routes
 * qui ne rendait jamais — la protection qu'il décrivait n'a donc jamais tourné.
 * Les pages publiques (`/`, `/confiance`, `/devenir-transporteur`, `/login`…)
 * n'en ont pas. Sans conséquence aujourd'hui : le seul lien sortant de
 * l'administration mène à `/dashboard`, qui est dans `app/(app)` et donc
 * protégé. À monter ici le jour où un lien de l'administration pointera
 * directement vers une page publique.
 *
 * Voir docs/PLAN_ACTION_MISE_A_NIVEAU_WEB_2026-08-26.md, lot 0.3.
 */
export default function ForceLightTheme() {
  useEffect(() => {
    document.documentElement.classList.remove("dark");
  }, []);

  return null;
}
