import { StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Button } from '@/shared/ui/Button';
import { colors, spacing, fontSize, radii } from '@/shared/theme';
import type { TripResultDto } from '../api/dto';

function formatWhen(iso: string): string {
  const d = new Date(iso);
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const hh = String(d.getHours()).padStart(2, '0');
  const mi = String(d.getMinutes()).padStart(2, '0');
  return `${dd}/${mm} ${hh}:${mi}`;
}

interface Props {
  trip: TripResultDto;
  onRequest: () => void;
}

export function TripResultCard({ trip, onRequest }: Props) {
  const { t } = useTranslation();

  return (
    <View style={styles.card}>
      <View style={styles.headerRow}>
        <Text style={styles.route} numberOfLines={1}>
          {trip.pickup_governorate} → {trip.dropoff_governorate}
        </Text>
        {trip.instant_booking ? (
          <View style={styles.instantBadge}>
            <Text style={styles.instantText}>{t('search.instant')}</Text>
          </View>
        ) : null}
      </View>

      <Text style={styles.when}>{formatWhen(trip.scheduled_time)}</Text>
      <Text style={styles.owner}>{trip.owner_name}</Text>

      {/* VERT = valeur : la fourchette de prix serveur. */}
      <Text style={styles.price}>
        {t('search.price_range', { min: trip.price_tnd_min, max: trip.price_tnd_max })}
      </Text>

      <Button label={t('search.request.title')} onPress={onRequest} variant="cta" style={styles.btn} />
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.neutral[200],
    borderRadius: radii.lg,
    backgroundColor: colors.neutral[0],
    gap: spacing.xs,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  route: { flex: 1, fontSize: fontSize.md, fontWeight: '700', color: colors.neutral[900] },
  instantBadge: {
    backgroundColor: colors.green[600],
    paddingVertical: 2,
    paddingHorizontal: spacing.sm,
    borderRadius: radii.full,
  },
  instantText: { color: colors.neutral[0], fontSize: fontSize.sm, fontWeight: '700' },
  when: { fontSize: fontSize.sm, color: colors.neutral[500] },
  owner: { fontSize: fontSize.sm, color: colors.neutral[700] },
  price: { fontSize: fontSize.lg, fontWeight: '800', color: colors.green[700] },
  btn: { marginTop: spacing.sm },
});
