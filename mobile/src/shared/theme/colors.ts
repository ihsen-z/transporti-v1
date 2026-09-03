// Palette officielle Transporti (source: design-system/00-foundations.html).
// Rôle des couleurs — non négociable :
//   BLEU  = structure / hero / navigation
//   ORANGE = le CTA UNIQUE d'un écran
//   VERT  = la valeur (économie, vérifié, montant net garanti)
export const colors = {
  // Royal Blue — structure & marque
  brand: {
    50: '#eef2ff',
    100: '#dce4fd',
    500: '#2563B3', // bleu logo / clair
    600: '#1E3A8A', // bleu royal principal
    900: '#0F1D4E', // bleu profond
  },
  // Vert — valeur / confiance
  green: {
    50: '#f0fdf4',
    600: '#10b981',
    700: '#059669',
    logo: '#2FAC55', // vert de la flèche du logo
  },
  // Orange — CTA unique
  cta: {
    50: '#fff7ed',
    500: '#f97316',
    600: '#ea580c',
  },
  // États
  success: '#10b981',
  warning: '#f59e0b',
  error: '#ef4444',
  errorBorder: '#fecaca',
  // Neutres (gris)
  neutral: {
    0: '#ffffff',
    50: '#f9fafb', // fond d'app
    100: '#f3f4f6',
    200: '#eef0f3', // séparateurs (line)
    300: '#e5e7eb',
    400: '#9ca3af',
    500: '#6b7280', // texte doux
    700: '#374151',
    900: '#111827', // encre
  },
  // Neutres additionnels pour tags/slate
  slate: '#475569',
  tagBg: '#f1f4f7',

  // ── Variantes TEXTE ──────────────────────────────────────────────────
  // Les couleurs ci-dessus restent celles des fonds, des liserés et des
  // icônes. Mais sous 18 px, cinq d'entre elles passaient sous le seuil AA
  // de WCAG 2.1 (4,5:1) — et c'étaient précisément les blocs qui portent la
  // promesse commerciale, mesurés en recette du 03/09 :
  //
  //   amorce de retour à vide   cta[600] sur cta[50]      3,35:1
  //   économie estimée          green[700] sur green[50]  3,60:1
  //   km à vide valorisés       green[700] sur green[50]  3,60:1
  //   expiration urgente        warning sur blanc         2,15:1
  //   « Expiré », « Dépublier » error sur blanc           3,76:1
  //
  // Un chiffre d'économie qu'on ne lit pas au soleil, dans une cabine, ne
  // convertit pas. Ces quatre valeurs sont le même ton un cran plus foncé :
  // la teinte ne change pas, l'identité de la charte est préservée.
  //
  // Ratios obtenus (garde-fou vérifié par colors.test.ts) :
  //   green   5,24 sur green[50]  ·  5,48 sur blanc
  //   cta     4,88 sur cta[50]
  //   warning 5,02 sur blanc
  //   error   4,83 sur blanc      ·  4,62 sur neutral[50]
  text: {
    green: '#047857',
    cta: '#c2410c',
    warning: '#b45309',
    error: '#dc2626',
  },
} as const;

// Dégradés (expo-linear-gradient). Tuples de couleurs.
export const gradients = {
  brand: ['#1E3A8A', '#2563B3'] as const, // hero, avatars
};
