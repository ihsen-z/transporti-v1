import { StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Button } from '@/shared/ui/Button';
import { Card } from '@/shared/ui/Card';
import { Avatar } from '@/shared/ui/Avatar';
import { Badge } from '@/shared/ui/Badge';
import { RouteRow } from '@/shared/ui/RouteRow';
import { colors, spacing, fontSize } from '@/shared/theme';
import type { TripResultDto } from '../api/dto';

interface Props {
  trip: TripResultDto;
  onRequest: () => void;
}

export function TripResultCard({ trip, onRequest }: Props) {
  const { t } = useTranslation();
  const km = trip.distance_km ? `≈ ${Math.round(Number(trip.distance_km))} km` : undefined;

  return (
    <Card>
      <View style={styles.top}>
        <Avatar name={trip.owner_name} size={42} />
        <Text style={styles.owner} numberOfLines={1}>{trip.owner_name}</Text>
        {trip.instant_booking ? <Badge label={t('search.instant')} variant="save" /> : null}
      </View>

      <View style={styles.route}>
        <RouteRow from={trip.pickup_governorate} to={trip.dropoff_governorate} middle={km} />
      </View>

      <View style={styles.meta}>
        <Badge label={t('search.badge_return')} variant="brand" />
      </View>

      <View style={styles.foot}>
        {/* VERT = valeur : fourchette de prix serveur. */}
        <Text style={styles.price}>
          {t('search.price_range', { min: trip.price_tnd_min, max: trip.price_tnd_max })}
        </Text>
        <Button label={t('search.request.title')} onPress={onRequest} variant="cta" size="sm" />
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  top: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  owner: { flex: 1, fontSize: fontSize.md, fontWeight: '700', color: colors.neutral[900] },
  route: { marginTop: spacing.md },
  meta: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md, flexWrap: 'wrap' },
  foot: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.lg,
    gap: spacing.md,
  },
  price: { fontSize: fontSize.xl, fontWeight: '800', color: colors.green[700] },
});
