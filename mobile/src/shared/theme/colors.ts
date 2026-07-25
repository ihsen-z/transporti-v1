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
} as const;

// Dégradés (expo-linear-gradient). Tuples de couleurs.
export const gradients = {
  brand: ['#1E3A8A', '#2563B3'] as const, // hero, avatars
};
