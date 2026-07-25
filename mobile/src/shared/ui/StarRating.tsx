import { Pressable, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing } from '@/shared/theme';

interface Props {
  // null = note masquée (double-aveugle) -> étoiles grisées.
  value: number | null;
  onChange?: (value: number) => void;
  size?: number;
}

// Notation 1-5. Si `onChange` est fourni -> saisie ; sinon lecture seule.
export function StarRating({ value, onChange, size = 28 }: Props) {
  const editable = typeof onChange === 'function';
  const masked = value === null;
  const rating = value ?? 0;

  return (
    <View style={styles.row}>
      {[1, 2, 3, 4, 5].map((star) => {
        const filled = star <= rating;
        const color = masked
          ? colors.neutral[200]
          : filled
            ? colors.cta[500]
            : colors.neutral[200];
        const icon = filled && !masked ? 'star' : 'star-outline';

        if (editable) {
          return (
            <Pressable
              key={star}
              onPress={() => onChange?.(star)}
              accessibilityRole="button"
              hitSlop={6}
            >
              <Ionicons name={icon} size={size} color={color} />
            </Pressable>
          );
        }
        return <Ionicons key={star} name={icon} size={size} color={color} />;
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: spacing.xs },
});
