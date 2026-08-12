import { StyleSheet, type StyleProp, type ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import type { ReactNode } from 'react';
import { gradients, radii, spacing, shadows } from '@/shared/theme';

// Carte hero dégradé bleu royal (design-system) — revenus, mise en avant.
interface Props {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

export function GradientCard({ children, style, testID }: Props) {
  return (
    <LinearGradient
      testID={testID}
      colors={gradients.brand}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[styles.hero, style]}
    >
      {children}
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  hero: {
    borderRadius: radii.hero,
    padding: spacing.lg + 2,
    // Le hero porte son ombre propre (0 12px 26px), plus ample que celle d'un
    // bouton bleu : c'est une surface, pas une commande.
    ...shadows.hero,
  },
});
