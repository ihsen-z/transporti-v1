// Tokens de design partagés. Un seul point d'import : `@/shared/theme`.
import { colors } from './colors';

export { colors, gradients } from './colors';
export { shadows } from './shadows';

// Espacements (échelle 4pt).
export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  '2xl': 32,
} as const;

// Rayons. Source canonique : design-system/30-composants.html (la charte des
// composants). Note : 10-transporteur-dashboard.html dessine la carte en 18 et
// le FAB en 52/18 — divergence assumée, la charte des composants gagne.
export const radii = {
  md: 8,
  lg: 12,
  input: 14, // champs ET boutons (.b border-radius:14px)
  buttonSm: 12, // .b-sm
  card: 16, // .card border-radius:16px
  fab: 16, // .fab 48×48 border-radius:16px — carré arrondi, pas un cercle
  tabbar: 20, // .tabbar border-radius:20px
  sheet: 20, // coins hauts des panneaux modaux (bottom sheets)
  hero: 22, // hero dégradé de l'écran d'accueil
  full: 9999,
} as const;

// Cible tactile minimale. Exigence écrite de la charte : « Cibles ≥ 44 px ».
export const TOUCH_TARGET = 44;

// Anneau de focus des champs — traduction de `box-shadow: 0 0 0 4px #eef2ff`.
// RN n'a pas de `spread` d'ombre : les champs dessinent cet anneau avec une vue
// absolue en retrait négatif (voir TextField), ce qui évite tout décalage de
// mise en page à la prise de focus.
export const focusRing = {
  width: 4,
  color: colors.brand[50],
  borderColor: colors.brand[600],
} as const;

// Tailles de police.
export const fontSize = {
  xs: 10, // libellés d'onglets (.tab font-size:10px)
  tag: 12, // pastilles (.tag font-size:12px)
  sm: 13, // .b-sm
  base: 14, // .b — libellé de bouton
  md: 15, // corps de texte / champs
  lg: 17,
  xl: 22,
  '2xl': 28,
  hero: 30, // .hero .big du tableau de bord transporteur
} as const;
