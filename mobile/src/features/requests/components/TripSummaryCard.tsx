import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Icon } from '@/shared/ui/icons';
import { Card } from '@/shared/ui/Card';
import { RouteRow } from '@/shared/ui/RouteRow';
import { colors, spacing, fontSize } from '@/shared/theme';
import type { ReturnTripDto } from '@/features/trips/api/dto';

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
  trip: ReturnTripDto;
  onPress: () => void;
}

export function TripSummaryCard({ trip, onPress }: Props) {
  return (
    <Pressable testID={`trip-summary-${trip.id}`} onPress={onPress} accessibilityRole="button">
      <Card style={styles.card}>
        <View style={styles.flex}>
          <RouteRow from={trip.pickup_governorate} to={trip.dropoff_governorate} />
          <Text style={styles.when}>{formatWhen(trip.scheduled_time)}</Text>
        </View>
        <Icon name="chevron-right" size={20} color={colors.neutral[400]} />
      </Card>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  flex: { flex: 1, gap: spacing.sm },
  when: { fontSize: fontSize.sm, color: colors.neutral[500] },
});
