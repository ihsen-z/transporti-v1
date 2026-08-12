import { StyleSheet, View } from 'react-native';
import { Txt } from '@/shared/ui/Txt';
import { Icon, type IconName } from '@/shared/ui/icons';
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

// Les cinq premières variantes sont les cinq tags de la charte, dans l'ordre où
// 30-composants.html les présente (t-rt, t-v, t-save, t-cod, t-urg).
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
  /** Icône optionnelle à gauche du libellé (remplace les émojis de la maquette). */
  icon?: IconName;
  testID?: string;
}

export function Badge({ label, variant = 'neutral', icon, testID }: Props) {
  const c = VARIANTS[variant];
  return (
    <View testID={testID} style={[styles.badge, { backgroundColor: c.bg }]}>
      {icon ? <Icon name={icon} size={12} color={c.fg} strokeWidth={2.5} /> : null}
      <Txt style={[styles.text, { color: c.fg }]}>{label}</Txt>
    </View>
  );
}

// Charte (.tag) : texte 12/600, padding 5/11, rayon plein.
const styles = StyleSheet.create({
  badge: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingVertical: 5,
    paddingHorizontal: 11,
    borderRadius: radii.full,
  },
  text: { fontSize: fontSize.tag, fontWeight: '600' },
});
