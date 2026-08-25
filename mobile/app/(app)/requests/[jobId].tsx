import { FlatList, Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { colors, spacing, fontSize } from '@/shared/theme';
import { Txt } from '@/shared/ui/Txt';
import { Icon } from '@/shared/ui/icons';
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
  const router = useRouter();
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
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <Pressable
          testID="requests-detail-back"
          onPress={() => router.back()}
          accessibilityRole="button"
          accessibilityLabel={t('common.back')}
          hitSlop={12}
        >
          <Icon name="chevron-left" size={24} color={colors.neutral[900]} />
        </Pressable>
        <Txt style={styles.title} numberOfLines={1}>
          {title}
        </Txt>
      </View>

      {requests.isLoading ? (
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
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.neutral[50] },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
  },
  title: { flex: 1, fontSize: fontSize.xl, fontWeight: '800', color: colors.neutral[900] },
  list: { paddingHorizontal: spacing.xl, paddingBottom: spacing.xl, gap: spacing.md },
});
