import { useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { colors, spacing, fontSize } from '@/shared/theme';
import { Txt } from '@/shared/ui/Txt';
import { queryRefreshControl } from '@/shared/ui/queryRefreshControl';
import { useMyReturnTrips } from '@/features/requests/api/useMyReturnTrips';
import { useJobRequests } from '@/features/requests/api/useJobRequests';
import { TripSummaryCard } from '@/features/requests/components/TripSummaryCard';
import { RequestCard } from '@/features/requests/components/RequestCard';
import type { TransporterTripDto } from '@/features/requests/api/dto';

// Onglet TRANSPORTEUR « Demandes reçues ». Master-détail via état local
// (liste de mes retours <-> demandes du trajet sélectionné) — pas de route
// détail dédiée pour rester dans la navigation à onglets.
export default function RequestsScreen() {
  const { t } = useTranslation();
  const [selected, setSelected] = useState<TransporterTripDto | null>(null);
  const trips = useMyReturnTrips();
  const requests = useJobRequests(selected?.id ?? null);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        {selected ? (
          <Pressable onPress={() => setSelected(null)} accessibilityRole="button">
            <Txt style={styles.back}>{t('requests.back')}</Txt>
          </Pressable>
        ) : null}
        <Txt style={styles.title}>
          {selected
            ? `${selected.pickup_governorate} → ${selected.dropoff_governorate}`
            : t('requests.title')}
        </Txt>
      </View>

      {!selected ? (
        trips.isLoading ? (
          <ActivityIndicator style={styles.loader} color={colors.brand[500]} />
        ) : (
          <FlatList
            data={trips.data ?? []}
            keyExtractor={(item) => String(item.id)}
            contentContainerStyle={styles.list}
            refreshControl={queryRefreshControl(trips)}
            ListHeaderComponent={<Txt style={styles.hint}>{t('requests.select_trip')}</Txt>}
            ListEmptyComponent={<Txt style={styles.empty}>{t('requests.trips_empty')}</Txt>}
            renderItem={({ item }) => (
              <TripSummaryCard trip={item} onPress={() => setSelected(item)} />
            )}
          />
        )
      ) : requests.isLoading ? (
        <ActivityIndicator style={styles.loader} color={colors.brand[500]} />
      ) : (
        <FlatList
          data={requests.data ?? []}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={styles.list}
          refreshControl={queryRefreshControl(requests)}
          ListEmptyComponent={<Txt style={styles.empty}>{t('requests.no_requests')}</Txt>}
          renderItem={({ item }) => <RequestCard request={item} jobId={selected.id} />}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.neutral[50] },
  header: { padding: spacing.xl, gap: spacing.sm },
  back: { color: colors.brand[500], fontWeight: '700', fontSize: fontSize.md },
  title: { fontSize: fontSize['2xl'], fontWeight: '800', color: colors.neutral[900] },
  list: { paddingHorizontal: spacing.xl, paddingBottom: spacing.xl, gap: spacing.md },
  hint: { fontSize: fontSize.sm, color: colors.neutral[500], marginBottom: spacing.sm },
  empty: { fontSize: fontSize.md, color: colors.neutral[500], textAlign: 'center', marginTop: spacing.xl },
  loader: { marginTop: spacing['2xl'] },
});
