import { StyleSheet, View } from 'react-native';
import { Txt } from '@/shared/ui/Txt';
import { colors, fontSize, spacing } from '@/shared/theme';

// Visualisation de trajet : point bleu (départ) → ligne pointillée → point vert
// (arrivée), avec distance optionnelle au milieu (design-system).
interface Props {
  from: string;
  to: string;
  middle?: string; // ex: "≈ 294 km"
}

export function RouteRow({ from, to, middle }: Props) {
  return (
    <View style={styles.row}>
      <View style={styles.dotBlue} />
      <Txt style={styles.city} numberOfLines={1}>{from}</Txt>
      <View style={styles.line} />
      {middle ? <Txt style={styles.km}>{middle}</Txt> : null}
      {middle ? <View style={styles.line} /> : null}
      <Txt style={styles.city} numberOfLines={1}>{to}</Txt>
      <View style={styles.dotGreen} />
    </View>
  );
}

const DOT = 9;
const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  dotBlue: { width: DOT, height: DOT, borderRadius: DOT / 2, backgroundColor: colors.brand[600] },
  dotGreen: { width: DOT, height: DOT, borderRadius: DOT / 2, backgroundColor: colors.green.logo },
  city: { fontSize: fontSize.md, fontWeight: '700', color: colors.neutral[900], flexShrink: 1 },
  line: {
    flex: 1,
    borderTopWidth: 1,
    borderColor: colors.neutral[300],
    borderStyle: 'dashed',
  },
  km: { fontSize: 11, color: colors.neutral[500] },
});
