import { Pressable, StyleSheet, View } from 'react-native';
import { Icon } from '@/shared/ui/icons';
import { colors, spacing } from '@/shared/theme';

interface Props {
  // null = note masquée (double-aveugle) -> étoiles grisées.
  value: number | null;
  onChange?: (value: number) => void;
  size?: number;
  testID?: string;
}

// Notation 1-5. Si `onChange` est fourni -> saisie ; sinon lecture seule.
export function StarRating({ value, onChange, size = 28, testID }: Props) {
  const editable = typeof onChange === 'function';
  const masked = value === null;
  const rating = value ?? 0;

  return (
    // Le conteneur porte le testID, et pas seulement les étoiles cliquables :
    // une note en LECTURE SEULE (ReviewRow) n'a aucun Pressable, donc sans ça
    // son testID serait accepté par l'appelant puis silencieusement perdu.
    <View
      testID={testID}
      style={styles.row}
      accessibilityRole={editable ? undefined : 'text'}
      accessibilityValue={masked ? undefined : { min: 0, max: 5, now: rating }}
    >
      {[1, 2, 3, 4, 5].map((star) => {
        const filled = star <= rating;
        const color = masked
          ? colors.neutral[200]
          : filled
            ? colors.cta[500]
            : colors.neutral[200];
        // Une étoile acquise est pleine, les autres restent en contour : le
        // glyphe est le même, seul le remplissage change.
        const solid = filled && !masked;

        if (editable) {
          return (
            <Pressable
              key={star}
              testID={testID ? `${testID}-star-${star}` : undefined}
              onPress={() => onChange?.(star)}
              accessibilityRole="button"
              hitSlop={6}
            >
              <Icon name="star" size={size} color={color} filled={solid} />
            </Pressable>
          );
        }
        return <Icon key={star} name="star" size={size} color={color} filled={solid} />;
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: spacing.xs },
});
