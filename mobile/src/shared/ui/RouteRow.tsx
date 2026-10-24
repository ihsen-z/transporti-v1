import { StyleSheet, View } from 'react-native';
import { Txt } from '@/shared/ui/Txt';
import { colors, fontSize, spacing } from '@/shared/theme';

// Ligne d'itinéraire — la signature de la marque (charte) : point de départ
// bleu, tiret, point d'arrivée VERT, distance insérée au milieu de la ligne.
//
// Le vert d'arrivée n'est pas décoratif : c'est le même vert que la valeur.
// Un trajet qui arrive, c'est un retour à vide qui ne l'est plus.
interface Props {
  from: string;
  to: string;
  middle?: string; // ex: "≈ 294 km"
  testID?: string;
}

export function RouteRow({ from, to, middle, testID }: Props) {
  return (
    <View testID={testID} style={styles.row}>
      <View style={styles.dotBlue} />
      <Txt style={styles.city} numberOfLines={1}>
        {from}
      </Txt>
      <View style={styles.line} />
      {middle ? <Txt style={styles.km}>{middle}</Txt> : null}
      {middle ? <View style={styles.line} /> : null}
      <Txt style={styles.city} numberOfLines={1}>
        {to}
      </Txt>
      <View style={styles.dotGreen} />
    </View>
  );
}

const DOT = 9;
const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  dotBlue: {
    width: DOT,
    height: DOT,
    borderRadius: DOT / 2,
    backgroundColor: colors.brand[600],
  },
  dotGreen: {
    width: DOT,
    height: DOT,
    borderRadius: DOT / 2,
    backgroundColor: colors.green[500],
  },
  city: {
    fontSize: fontSize.md,
    fontWeight: '700',
    color: colors.neutral[900],
    flexShrink: 1,
  },
  // Charte : tiret 1,5 px en --border-strong. Le trait porte le lien entre les
  // deux villes ; à 1 px sur #E4E9F2 il disparaissait au soleil.
  line: {
    flex: 1,
    borderTopWidth: 1.5,
    borderColor: colors.borderStrong,
    borderStyle: 'dashed',
  },
  km: { fontSize: fontSize.meta, color: colors.neutral[500] },
});
