import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, fontSize, radii } from '@/shared/theme';
import type { TransporterTripDto } from '../api/dto';

// Format court JJ/MM HH:mm (heure locale).
function formatWhen(iso: string): string {
  const d = new Date(iso);
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const hh = String(d.getHours()).padStart(2, '0');
  const mi = String(d.getMinutes()).padStart(2, '0');
  return `${dd}/${mm} ${hh}:${mi}`;
}

interface Props {
  trip: TransporterTripDto;
  onPress: () => void;
}

export function TripSummaryCard({ trip, onPress }: Props) {
  return (
    <Pressable style={styles.card} onPress={onPress} accessibilityRole="button">
      <View style={styles.flex}>
        <Text style={styles.route} numberOfLines={1}>
          {trip.pickup_governorate} → {trip.dropoff_governorate}
        </Text>
        <Text style={styles.when}>{formatWhen(trip.scheduled_time)}</Text>
      </View>
      <Ionicons name="chevron-forward" size={20} color={colors.neutral[400]} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.neutral[200],
    borderRadius: radii.lg,
    backgroundColor: colors.neutral[0],
  },
  flex: { flex: 1, gap: spacing.xs },
  route: { fontSize: fontSize.md, fontWeight: '700', color: colors.neutral[900] },
  when: { fontSize: fontSize.sm, color: colors.neutral[500] },
});
