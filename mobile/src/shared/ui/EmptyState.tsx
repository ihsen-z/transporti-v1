import { StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Txt } from '@/shared/ui/Txt';
import { Button } from '@/shared/ui/Button';
import { colors, spacing, fontSize } from '@/shared/theme';

// État vide soigné : pastille + icône, titre, sous-titre optionnel et CTA
// optionnel. Remplace les simples textes « Aucun … » des listes.
interface Props {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle?: string;
  ctaLabel?: string;
  onCta?: () => void;
}

export function EmptyState({ icon, title, subtitle, ctaLabel, onCta }: Props) {
  return (
    <View style={styles.wrap}>
      <View style={styles.iconWrap}>
        <Ionicons name={icon} size={38} color={colors.brand[500]} />
      </View>
      <Txt style={styles.title}>{title}</Txt>
      {subtitle ? <Txt style={styles.subtitle}>{subtitle}</Txt> : null}
      {ctaLabel && onCta ? (
        <Button label={ctaLabel} onPress={onCta} variant="cta" size="sm" style={styles.cta} />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    paddingVertical: spacing['2xl'],
    paddingHorizontal: spacing.xl,
    gap: spacing.xs,
  },
  iconWrap: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.brand[50],
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  title: { fontSize: fontSize.lg, fontWeight: '800', color: colors.neutral[900], textAlign: 'center' },
  subtitle: { fontSize: fontSize.md, color: colors.neutral[500], textAlign: 'center' },
  cta: { marginTop: spacing.md },
});
