import { FlatList, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { colors, spacing, fontSize } from '@/shared/theme';
import { Txt } from '@/shared/ui/Txt';
import { EmptyState } from '@/shared/ui/EmptyState';
import { SkeletonList } from '@/shared/ui/SkeletonList';
import { queryRefreshControl } from '@/shared/ui/queryRefreshControl';
import { useMyReturnTrips } from '@/features/trips/api/useMyReturnTrips';
import type { ReturnTripDto } from '@/features/trips/api/dto';
import { TripSummaryCard } from '@/features/requests/components/TripSummaryCard';

// Onglet TRANSPORTEUR « Demandes reçues » — liste de mes trajets retour
// publiés. Le détail (demandes reçues sur UN trajet) vit désormais à sa
// propre route adressable (`requests/[jobId]`, 4.5) au lieu d'un `useState`
// local : une notification « nouvelle demande » (4.7) peut maintenant y
// mener directement.
export default function RequestsScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const trips = useMyReturnTrips();

  // Seuls les trajets PUBLIES peuvent recevoir des demandes. Le filtre vit ici
  // et non dans le hook : celui-ci est partage avec l'inventaire (T1.3), qui a
  // besoin de TOUS les trajets, y compris annules et expires.
  //
  // Il existait auparavant un second hook dans requests/api/ portant le meme
  // nom ET la meme cle react-query ['myReturnTrips'], avec un filtre different
  // et sans gestion de la pagination. Deux hooks sur une meme cle, c'est le
  // premier monte qui gagne le cache et l'autre qui recoit des donnees mal
  // filtrees. Consolide le 27/08.
  // `data ?? []` produit une union `ReturnTripDto[] | never[]` : TypeScript ne
  // resout pas `.filter` sur une union de types tableau. D'ou la variable
  // intermediaire typee.
  const tous: ReturnTripDto[] = trips.data ?? [];
  const publies = tous.filter((trajet) => trajet.status === 'PUBLISHED');

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <Txt style={styles.title}>{t('requests.title')}</Txt>
      </View>

      {trips.isLoading ? (
        <SkeletonList />
      ) : (
        <FlatList
          data={publies}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={styles.list}
          refreshControl={queryRefreshControl(trips)}
          ListHeaderComponent={
            publies.length > 0 ? (
              <Txt style={styles.hint}>{t('requests.select_trip')}</Txt>
            ) : null
          }
          ListEmptyComponent={
            <EmptyState
              icon="package"
              title={t('requests.trips_empty')}
              subtitle={t('requests.trips_empty_hint')}
              ctaLabel={t('requests.trips_empty_cta')}
              onCta={() => router.push('/publish')}
            />
          }
          renderItem={({ item }) => (
            <TripSummaryCard
              trip={item}
              onPress={() =>
                router.push({
                  pathname: '/requests/[jobId]',
                  params: {
                    jobId: String(item.id),
                    pickup: item.pickup_governorate,
                    dropoff: item.dropoff_governorate,
                  },
                })
              }
            />
          )}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.neutral[50] },
  header: { padding: spacing.xl, gap: spacing.sm },
  title: { fontSize: fontSize['2xl'], fontWeight: '800', color: colors.neutral[900] },
  list: { paddingHorizontal: spacing.xl, paddingBottom: spacing.xl, gap: spacing.md },
  hint: { fontSize: fontSize.sm, color: colors.neutral[500], marginBottom: spacing.sm },
});
