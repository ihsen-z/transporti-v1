import { Pressable, StyleSheet, View } from 'react-native';
import { Txt } from '@/shared/ui/Txt';
import { colors, radii, fontSize, spacing } from '@/shared/theme';

// En-tête de section : titre + compteur (pastille) + action « tout voir ».
interface Props {
  title: string;
  count?: number;
  actionLabel?: string;
  onAction?: () => void;
}

export function SectionHeader({ title, count, actionLabel, onAction }: Props) {
  return (
    <View style={styles.row}>
      <Txt style={styles.title}>{title}</Txt>
      {count != null && count > 0 ? (
        <View style={styles.count}>
          <Txt style={styles.countText}>{count}</Txt>
        </View>
      ) : null}
      {actionLabel && onAction ? (
        <Pressable onPress={onAction} style={styles.action} accessibilityRole="button">
          <Txt style={styles.actionText}>{actionLabel}</Txt>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  title: { fontSize: fontSize.md, fontWeight: '800', color: colors.neutral[900] },
  count: {
    minWidth: 20,
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: radii.full,
    backgroundColor: colors.error,
    alignItems: 'center',
  },
  countText: { color: colors.neutral[0], fontSize: 11, fontWeight: '800' },
  action: { marginLeft: 'auto' },
  actionText: { fontSize: fontSize.sm, color: colors.brand[500], fontWeight: '700' },
});
