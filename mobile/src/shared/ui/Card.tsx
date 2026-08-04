import { StyleSheet, View, type ViewProps } from 'react-native';
import { colors, radii, spacing, shadows } from '@/shared/theme';

// Carte surface. Charte (.card) : blanc, rayon 16, bordure 1 px #e5e7eb,
// padding 16, ombre douce. La bordure porte le contour ; l'ombre ne fait que
// détacher la carte du fond — les deux, jamais l'ombre seule.
export function Card({ style, ...rest }: ViewProps) {
  return <View style={[styles.card, style]} {...rest} />;
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.neutral[0],
    borderRadius: radii.card,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.neutral[300], // #e5e7eb — --line de la charte
    ...shadows.card,
  },
});
