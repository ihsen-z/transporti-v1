import { Pressable, StyleSheet, type AccessibilityRole } from 'react-native';
import { Txt } from '@/shared/ui/Txt';
import { colors, fontSize, radii, spacing, TOUCH_TARGET } from '@/shared/theme';

// Pastille sélectionnable : un onglet de filtre. Bleu plein quand elle est
// active, blanche bordée sinon — la charte réserve le plein bleu à la
// structure, et c'est bien de ça qu'il s'agit : où l'on se trouve dans une
// liste.
//
// Elle existe parce que deux écrans (« Mes demandes » et « Demandes reçues »)
// portaient chacun leur propre rangée d'onglets, avec des rayons et des
// bordures qui avaient divergé — l'un en 999, l'autre en 12.
interface Props {
  label: string;
  selected: boolean;
  onPress: () => void;
  role?: AccessibilityRole;
  /** Partage la largeur disponible à parts égales (rangée de 2 ou 3 onglets). */
  fill?: boolean;
  testID?: string;
}

export function Pill({
  label,
  selected,
  onPress,
  role = 'tab',
  fill = false,
  testID,
}: Props) {
  return (
    <Pressable
      testID={testID}
      accessibilityRole={role}
      accessibilityState={{ selected }}
      onPress={onPress}
      style={[styles.pill, fill ? styles.fill : null, selected ? styles.selected : null]}
    >
      <Txt style={[styles.label, selected ? styles.labelSelected : null]}>{label}</Txt>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pill: {
    minHeight: TOUCH_TARGET,
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: radii.full,
    borderWidth: 1,
    borderColor: colors.neutral[200],
    backgroundColor: colors.neutral[0],
  },
  fill: { flex: 1, alignItems: 'center' },
  selected: { backgroundColor: colors.brand[600], borderColor: colors.brand[600] },
  label: { fontSize: fontSize.sm, fontWeight: '600', color: colors.neutral[700] },
  labelSelected: { color: colors.neutral[0] },
});
