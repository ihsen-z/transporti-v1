import { StyleSheet, View, type ViewProps } from 'react-native';
import { colors, radii, spacing, shadows } from '@/shared/theme';

// Carte surface : blanc, radius 18, ombre douce (design-system).
export function Card({ style, ...rest }: ViewProps) {
  return <View style={[styles.card, style]} {...rest} />;
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.neutral[0],
    borderRadius: radii.card,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.neutral[200],
    ...shadows.card,
  },
});
