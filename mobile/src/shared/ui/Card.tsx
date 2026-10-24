import { StyleSheet, View, type ViewProps } from 'react-native';
import { colors, radii, spacing, shadows } from '@/shared/theme';

// Carte surface de la famille APPLICATIVE : blanc opaque sur `neutral[50]`.
//
// Charte (.card) : rayon 22, padding 16, ombre `0 10px 26px rgba(15,29,78,.08)`
// — et PAS de bordure. C'est le changement : la carte ne portait son contour
// que parce que son ombre d'avant (0 4px 14px) était trop courte pour la
// détacher seule. L'ombre de la charte est plus ample et plus basse ; elle
// suffit, et la bordure ne faisait plus que salir le bord arrondi.
interface Props extends ViewProps {
  /** État sélectionné (charte : .card--selected, liseré bleu 1,5 px). */
  selected?: boolean;
}

export function Card({ style, selected = false, ...rest }: Props) {
  return (
    <View style={[styles.card, selected ? styles.selected : null, style]} {...rest} />
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.neutral[0],
    borderRadius: radii.card,
    padding: spacing.lg,
    ...shadows.card,
  },
  // Le liseré n'apparaît QU'À la sélection : il est alors porteur d'une
  // information, pas décoratif.
  selected: {
    borderWidth: 1.5,
    borderColor: colors.brand[600],
  },
});
