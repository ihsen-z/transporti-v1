import { StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Icon, type IconName } from '@/shared/ui/icons';
import { Txt } from '@/shared/ui/Txt';
import { colors, spacing, fontSize } from '@/shared/theme';

interface Props {
  title: string;
  subtitle: string;
  icon?: IconName;
}

// Écran d'attente réutilisable pour les onglets dont le contenu réel arrive
// dans un incrément ultérieur (funnel recherche/publication S1-S2).
export function PlaceholderScreen({ title, subtitle, icon = 'wrench' }: Props) {
  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.center}>
        <Icon name={icon} size={48} color={colors.brand[500]} />
        <Txt style={styles.title}>{title}</Txt>
        <Txt style={styles.subtitle}>{subtitle}</Txt>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.neutral[0] },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
    padding: spacing.xl,
  },
  title: {
    fontSize: fontSize.xl,
    fontWeight: '800',
    color: colors.neutral[900],
    textAlign: 'center',
  },
  subtitle: { fontSize: fontSize.md, color: colors.neutral[500] },
});
