import { FlatList, StyleSheet } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { spacing, SCREEN_PADDING } from '@/shared/theme';
import { AppScreen } from '@/shared/ui/AppScreen';
import { AppHeader } from '@/shared/ui/AppHeader';
import { BackButton } from '@/shared/ui/BackButton';
import { RouteUnavailable } from '@/shared/ui/RouteUnavailable';
import { EmptyState } from '@/shared/ui/EmptyState';
import { SkeletonList } from '@/shared/ui/SkeletonList';
import { queryRefreshControl } from '@/shared/ui/queryRefreshControl';
import { useJobRequests } from '@/features/requests/api/useJobRequests';
import { RequestCard } from '@/features/requests/components/RequestCard';

// Demandes reçues sur UN trajet retour — adressable (4.5), atteignable depuis
// la liste, une notification TRIP_REQUEST_RECEIVED (4.7) ou un tap de push
// (4.8). `pickup`/`dropoff` sont transmis par la liste pour le titre ; sans
// eux (arrivée directe par jobId) on retombe sur un libellé générique.
export default function JobRequestsScreen() {
  const { t } = useTranslation();
  const { jobId, pickup, dropoff } = useLocalSearchParams<{
    jobId: string;
    pickup?: string;
    dropoff?: string;
  }>();
  const numericJobId = Number(jobId);
  const valid = Number.isFinite(numericJobId) && numericJobId > 0;
  const requests = useJobRequests(valid ? numericJobId : null);

  const title = pickup && dropoff ? `${pickup} → ${dropoff}` : t('requests.title');

  return (
    <AppScreen
      testID="job-requests-screen"
      scroll={false}
      header={
        <AppHeader
          leading={<BackButton testID="requests-detail-back" fallback="/requests" />}
          title={title}
        />
      }
    >
      {/* 7.6 — sans ce cas, un identifiant invalide affichait « Aucune
          demande » : le hook etant desactive, la liste etait vide et l'ecran
          concluait a une absence de demandes au lieu d'un lien casse. Pire
          qu'un ecran blanc, parce que c'est faux. */}
      {!valid || requests.isError ? (
        <RouteUnavailable />
      ) : requests.isLoading ? (
        <SkeletonList />
      ) : (
        <FlatList
          data={requests.data ?? []}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={styles.list}
          refreshControl={queryRefreshControl(requests)}
          ListEmptyComponent={<EmptyState icon="inbox" title={t('requests.no_requests')} />}
          renderItem={({ item }) => <RequestCard request={item} jobId={numericJobId} />}
        />
      )}
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  list: {
    paddingHorizontal: SCREEN_PADDING,
    paddingTop: spacing.xl,
    paddingBottom: spacing.xl,
    gap: spacing.md,
  },
});
