import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Card } from '@/shared/ui/Card';
import { colors, spacing, fontSize, radii } from '@/shared/theme';
import type { NotificationDto } from '../api/dto';

interface Props {
  notif: NotificationDto;
  onPress: () => void;
}

function formatWhen(iso: string): string {
  const d = new Date(iso);
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const hh = String(d.getHours()).padStart(2, '0');
  const mi = String(d.getMinutes()).padStart(2, '0');
  return `${dd}/${mm} ${hh}:${mi}`;
}

export function NotificationRow({ notif, onPress }: Props) {
  return (
    <Pressable onPress={onPress} accessibilityRole="button">
      {/* Non lu : teinte bleue (structure) + pastille orange (CTA d'attention). */}
      <Card style={[styles.row, !notif.is_read && styles.unread]}>
        {!notif.is_read ? <View style={styles.dot} /> : <View style={styles.dotPlaceholder} />}
        <View style={styles.flex}>
          <Text style={styles.title} numberOfLines={1}>{notif.title}</Text>
          <Text style={styles.message} numberOfLines={2}>{notif.message}</Text>
          <Text style={styles.when}>{formatWhen(notif.created_at)}</Text>
        </View>
      </Card>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  unread: { backgroundColor: colors.brand[50], borderColor: colors.brand[100] },
  dot: {
    width: 8,
    height: 8,
    borderRadius: radii.full,
    backgroundColor: colors.cta[500],
    marginTop: 6,
  },
  dotPlaceholder: { width: 8 },
  flex: { flex: 1, gap: 2 },
  title: { fontSize: fontSize.md, fontWeight: '700', color: colors.neutral[900] },
  message: { fontSize: fontSize.sm, color: colors.neutral[700] },
  when: { fontSize: fontSize.sm, color: colors.neutral[400] },
});
