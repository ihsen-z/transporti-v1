// Tokens de design partagés. Un seul point d'import : `@/shared/theme`.
export { colors } from './colors';

// Espacements (échelle 4pt).
export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  '2xl': 32,
} as const;

// Rayons (charte : lg 12 / xl 16 / 2xl 24).
export const radii = {
  md: 8,
  lg: 12,
  xl: 16,
  '2xl': 24,
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
