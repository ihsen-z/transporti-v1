import { StyleSheet, View } from 'react-native';
import { Txt } from '@/shared/ui/Txt';
import { BrandLockup } from '@/shared/ui/BrandLockup';
import { colors, spacing, fontSize, tracking } from '@/shared/theme';

// En-tête commun aux quatre écrans d'authentification : marque, titre, phrase.
// Les quatre l'écrivaient chacun de leur côté, avec des tailles qui avaient
// déjà divergé (logo 40 sur la connexion, 36 sur les trois autres).
interface Props {
  title: string;
  subtitle?: string;
  testID?: string;
}

export function AuthHeading({ title, subtitle, testID }: Props) {
  return (
    <View testID={testID} style={styles.wrap}>
      <BrandLockup />
      <View style={styles.titleBlock}>
        <Txt style={styles.title}>{title}</Txt>
        {subtitle ? <Txt style={styles.subtitle}>{subtitle}</Txt> : null}
      </View>
    </View>
  );
}

// Charte : titre 27–30/800 en -0,03em, interligne 1,2 ; sous-titre 14,5.
const styles = StyleSheet.create({
  wrap: { gap: spacing.xl },
  titleBlock: { gap: spacing.sm },
  title: {
    fontSize: fontSize['2xl'],
    lineHeight: fontSize['2xl'] * 1.2,
    fontWeight: '800',
    color: colors.onBlue[100],
    letterSpacing: tracking.hero,
  },
  subtitle: { fontSize: fontSize.md, lineHeight: fontSize.md * 1.5, color: colors.text.onBlue },
});
