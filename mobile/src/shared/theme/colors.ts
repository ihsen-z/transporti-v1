// Palette officielle Transporti (source: frontend/tailwind.config.ts + globals.css).
// Rôle des couleurs — non négociable :
//   BLEU  = structure / hero / navigation
//   ORANGE = le CTA UNIQUE d'un écran
//   VERT  = la valeur (économie, vérifié, montant net garanti)
export const colors = {
  // Royal Blue — structure & marque
  brand: {
    50: '#eef2ff',
    500: '#2563B3',
    600: '#1E3A8A',
    900: '#0F1D4E',
  },
  // Vert — valeur / confiance
  green: {
    600: '#10b981',
    700: '#059669',
  },
  // Orange — CTA unique
  cta: {
    500: '#f97316',
  },
  // États
  success: '#10b981',
  warning: '#f59e0b',
  error: '#ef4444',
  // Neutres (gris)
  neutral: {
    0: '#ffffff',
    50: '#f9fafb',
    100: '#f3f4f6',
    200: '#e5e7eb',
    400: '#9ca3af',
    500: '#6b7280',
    700: '#374151',
    900: '#111827',
  },
} as const;
