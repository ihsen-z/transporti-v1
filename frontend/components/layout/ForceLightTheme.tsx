"use client";

import { useEffect } from "react";

/**
 * ForceLightTheme — garantit que les écrans métier et public restent en clair.
 *
 * Pourquoi ce composant existe (décision du 26/08/2026, lot 0.3) :
 * le chantier mode sombre a été annulé. Or `app/(app)` et `app/(marketing)` ne
 * portent aucun style `dark:`, tandis que la zone d'administration, elle, est
 * réellement stylée en sombre. Comme la classe `dark` est posée sur <html>, elle
 * survit à une navigation côté client depuis l'administration vers ces zones —
 * ce qui produisait une interface hybride : barre latérale sombre sur contenu
 * clair, bordures forcées en `neutral-700` par la règle `.dark *` de globals.css.
 *
 * On retire donc la classe à l'entrée de ces zones. Le mode sombre de
 * l'administration n'est pas touché : son ThemeProvider la repose à son propre
 * montage, avec sa propre clé de stockage (`transporti-admin-theme`).
 *
 * Voir docs/PLAN_ACTION_MISE_A_NIVEAU_WEB_2026-08-26.md, lot 0.3.
 */
export default function ForceLightTheme() {
  useEffect(() => {
    document.documentElement.classList.remove("dark");
  }, []);

  return null;
}
