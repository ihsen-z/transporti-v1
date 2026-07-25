// Tokens de design partagés. Un seul point d'import : `@/shared/theme`.
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

// Rayons (design-system : champs 14, boutons 14, cartes 16-20, hero 22).
export const radii = {
  md: 8,
  lg: 12,
  input: 14,
  xl: 16,
  card: 18,
  '2xl': 20,
  hero: 22,
  full: 9999,
} as const;

// Tailles de police.
export const fontSize = {
  sm: 13,
  md: 15,
  lg: 17,
  xl: 22,
  '2xl': 28,
} as const;
