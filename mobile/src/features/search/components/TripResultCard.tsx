import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Button } from '@/shared/ui/Button';
import { Card } from '@/shared/ui/Card';
import { Avatar } from '@/shared/ui/Avatar';
import { Badge } from '@/shared/ui/Badge';
import { RouteRow } from '@/shared/ui/RouteRow';
import { colors, spacing, fontSize, radii } from '@/shared/theme';
import type { TripResultDto } from '../api/dto';

interface Props {
  trip: TripResultDto;
  onRequest: () => void;
}

export function TripResultCard({ trip, onRequest }: Props) {
  const { t } = useTranslation();
  const router = useRouter();
  const km = trip.distance_km ? `≈ ${Math.round(Number(trip.distance_km))} km` : undefined;

  return (
    <Card>
      <Pressable
        testID={`trip-${trip.id}-owner`}
        style={styles.top}
        onPress={() => router.push({ pathname: '/transporteur/[id]', params: { id: String(trip.owner_id) } })}
        accessibilityRole="button"
      >
        <Avatar name={trip.owner_name} size={42} />
        <View style={styles.ownerBlock}>
          <Text style={styles.owner} numberOfLines={1}>{trip.owner_name}</Text>
          {trip.owner_rating !== null ? (
            <Text style={styles.rating}>
              ★ {trip.owner_rating.toFixed(1)} ({trip.owner_review_count})
            </Text>
          ) : null}
        </View>
        {trip.owner_verification_status === 'VERIFIED' ? (
          <Badge label={t('trust.status.VERIFIED')} variant="verified" icon="shield-check" />
        ) : null}
        {trip.instant_booking ? <Badge label={t('search.instant')} variant="save" /> : null}
      </Pressable>

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

        {/* C1.2 — l'argument de conversion du pivot : « vous payez moins parce
            que le camion roulait deja ». Ligne DEDIEE et non mention noyee
            (IA-5), et jamais un montant nu : la base de comparaison
            l'accompagne, sans quoi le chiffre n'est pas verifiable. */}
        {trip.estimated_savings !== null && trip.savings_basis !== null ? (
          <View style={styles.economie} testID="recherche-trajet-economie">
            <Text style={styles.economieMontant}>
              {t('search.savings', { amount: Math.round(trip.estimated_savings) })}
            </Text>
            <Text
              style={styles.economieBase}
              testID="recherche-trajet-economie-base"
            >
              {t('search.savings_basis', { amount: Math.round(trip.savings_basis) })}
            </Text>
          </View>
        ) : null}
        <Button
          testID={`trip-${trip.id}-request`}
          label={t('search.request.title')}
          onPress={onRequest}
          variant="cta"
          size="sm"
        />
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  top: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  ownerBlock: { flex: 1, gap: 2 },
  owner: { fontSize: fontSize.md, fontWeight: '700', color: colors.neutral[900] },
  rating: { fontSize: fontSize.sm, color: colors.neutral[500] },
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
  economie: {
    marginTop: spacing.sm,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radii.md,
    backgroundColor: colors.green[50],
    borderWidth: 1,
    borderColor: colors.green[600],
    gap: 2,
  },
  economieMontant: {
    fontSize: fontSize.md,
    fontWeight: '800',
    color: colors.green[700],
  },
  economieBase: { fontSize: fontSize.sm, color: colors.green[700] },
});
