import { Platform, type ViewStyle } from 'react-native';

// Ombres douces (design-system : "ombres douces"). Multiplateforme :
// iOS = shadow*, Android = elevation, web = box-shadow (via react-native-web).
function shadow(
  color: string,
  height: number,
  radius: number,
  opacity: number,
  elevation: number,
): ViewStyle {
  return Platform.select({
    android: { elevation, shadowColor: color },
    default: {
      shadowColor: color,
      shadowOffset: { width: 0, height },
      shadowOpacity: opacity,
      shadowRadius: radius,
    },
  }) as ViewStyle;
}

// Valeurs transcrites de design-system/30-composants.html. Le mapping CSS→RN
// est direct : `0 <height>px <radius>px rgba(_, <opacity>)`.
export const shadows = {
  // Carte surélevée douce (.card de l'écran transporteur : 0 4px 14px /.04).
  card: shadow('#111827', 4, 14, 0.06, 3),
  // .b-cta — 0 6px 14px rgba(249,115,22,.35)
  cta: shadow('#f97316', 6, 14, 0.35, 6),
  // .b-pri — 0 6px 14px rgba(30,58,138,.28)
  brand: shadow('#1E3A8A', 6, 14, 0.28, 6),
  // .fab — 0 6px 14px rgba(249,115,22,.4) : même géométrie, un ton plus dense.
  fab: shadow('#f97316', 6, 14, 0.4, 8),
  // .hero — 0 12px 26px rgba(30,58,138,.35)
  hero: shadow('#1E3A8A', 12, 26, 0.35, 10),
} as const;
