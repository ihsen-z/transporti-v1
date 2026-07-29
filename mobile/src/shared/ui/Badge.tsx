import { StyleSheet, View } from 'react-native';
import { Txt } from '@/shared/ui/Txt';
import { colors, radii, fontSize, spacing } from '@/shared/theme';

// Pastilles/tags de la charte (design-system/30-composants).
export type BadgeVariant =
  | 'brand' // 🔄 trajet retour
  | 'verified' // ✓ vérifié
  | 'save' // −40% (valeur, plein vert)
  | 'cod' // 💵 à la livraison
  | 'warning' // ⏳ en attente / en cours (ambre)
  | 'urgent'
  | 'neutral';

const VARIANTS: Record<BadgeVariant, { bg: string; fg: string }> = {
  brand: { bg: colors.brand[50], fg: colors.brand[600] },
  verified: { bg: colors.green[50], fg: colors.green[700] },
  save: { bg: colors.green[600], fg: colors.neutral[0] },
  cod: { bg: colors.tagBg, fg: colors.slate },
  // Teintes ambre (état warning) — cohérentes avec colors.warning #f59e0b.
  warning: { bg: '#fef3c7', fg: '#b45309' },
  urgent: { bg: '#fee2e2', fg: colors.error },
  neutral: { bg: colors.tagBg, fg: colors.slate },
};

interface Props {
  label: string;
  variant?: BadgeVariant;
}

export function Badge({ label, variant = 'neutral' }: Props) {
  const c = VARIANTS[variant];
  return (
    <View style={[styles.badge, { backgroundColor: c.bg }]}>
      <Txt style={[styles.text, { color: c.fg }]}>{label}</Txt>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    alignSelf: 'flex-start',
    paddingVertical: 4,
    paddingHorizontal: spacing.sm + 1,
    borderRadius: radii.full,
  },
  text: { fontSize: 11, fontWeight: '700' },
});
