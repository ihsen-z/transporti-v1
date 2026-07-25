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

export const shadows = {
  // Carte surélevée douce.
  card: shadow('#111827', 6, 16, 0.08, 3),
  // Ombre colorée sous le CTA orange.
  cta: shadow('#f97316', 6, 12, 0.35, 6),
  // Ombre colorée sous les boutons/hero bleus.
  brand: shadow('#1E3A8A', 8, 20, 0.3, 8),
} as const;
