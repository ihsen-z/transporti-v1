import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Txt } from '@/shared/ui/Txt';
import { colors, spacing, fontSize, tracking, SCREEN_PADDING } from '@/shared/theme';

// Barre d'action fixe d'un écran de détail (charte) : le total à gauche,
// l'action unique à droite. Elle existe pour que le prix et le bouton qui
// l'engage ne soient jamais séparés par un défilement — c'est le dernier
// endroit où l'on peut encore changer d'avis en connaissance de cause.
//
// L'inset du bas passe par `SafeAreaView` et pas par le hook, pour la même
// raison qu'AppHeader : c'est le composant natif qui lit les vraies insets sur
// cet Android. Ici l'enjeu est direct — un CTA sous la barre de navigation
// système est un CTA qu'on ne peut pas presser.
interface Props {
  /** Libellé au-dessus du montant : « Total », « À payer ». */
  label: string;
  /** Montant déjà formaté, unité comprise. */
  amount: string;
  /** Le CTA. Un seul — la charte n'en autorise qu'un par écran. */
  children: ReactNode;
  testID?: string;
}

export function ActionBar({ label, amount, children, testID }: Props) {
  return (
    <SafeAreaView edges={['bottom']} testID={testID} style={styles.bar}>
      <View style={styles.row}>
        <View>
          <Txt style={styles.label}>{label}</Txt>
          <Txt style={styles.amount}>{amount}</Txt>
        </View>
        {/* `flex: 1` : le CTA prend tout ce que le total lui laisse. */}
        <View style={styles.cta}>{children}</View>
      </View>
    </SafeAreaView>
  );
}

// Charte : blanc à 96 %, liseré haut --border, padding 14/20/22.
const styles = StyleSheet.create({
  bar: {
    backgroundColor: 'rgba(255,255,255,0.96)',
    borderTopWidth: 1,
    borderTopColor: colors.neutral[200],
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.lg,
    paddingTop: 14,
    paddingBottom: spacing.xl - 2,
    paddingHorizontal: SCREEN_PADDING,
  },
  label: { fontSize: fontSize.meta, fontWeight: '600', color: colors.neutral[500] },
  amount: {
    fontSize: fontSize.title,
    fontWeight: '800',
    color: colors.neutral[900],
    letterSpacing: tracking.title,
  },
  cta: { flex: 1 },
});
