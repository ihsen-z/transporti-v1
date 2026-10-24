import { ActivityIndicator, FlatList, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { colors, spacing } from '@/shared/theme';
import { EmptyState } from '@/shared/ui/EmptyState';
import { PanelScreen } from '@/shared/ui/PanelScreen';
import { queryRefreshControl } from '@/shared/ui/queryRefreshControl';
import { useFlatInfiniteList } from '@/core/api/useFlatInfiniteList';
import { useMyReviews } from '../api/useMyReviews';
import { ReviewRow } from './ReviewRow';
import { useMyTrustScore } from '@/features/trust/api/useMyTrustScore';
import { ReputationCard } from '@/features/trust/components/ReputationCard';

interface Props {
  visible: boolean;
  onClose: () => void;
}

// Panneau plein écran « Mes avis » (avis reçus), ouvert depuis le Profil.
export function ReviewsPanel({ visible, onClose }: Props) {
  const { t } = useTranslation();
  const reviews = useMyReviews(visible);
  const { items, onEndReached } = useFlatInfiniteList(reviews);
  // T5.3 — la reputation est l'agregat, les avis en sont le detail : un seul
  // panneau, pas deux. Charge seulement a l'ouverture.
  const score = useMyTrustScore(visible);

  return (
    <PanelScreen
      visible={visible}
      title={t('reviews.my_title')}
      onClose={onClose}
      testID="reviews-panel"
      scroll={false}
    >
      {reviews.isLoading ? (
        <ActivityIndicator style={styles.loader} color={colors.brand[500]} />
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={styles.list}
          refreshControl={queryRefreshControl(reviews)}
          ListHeaderComponent={score.data ? <ReputationCard score={score.data} /> : null}
          onEndReached={onEndReached}
          onEndReachedThreshold={0.5}
          ListEmptyComponent={<EmptyState icon="star" title={t('reviews.empty')} />}
          ListFooterComponent={
            reviews.isFetchingNextPage ? (
              <ActivityIndicator style={styles.loader} color={colors.brand[500]} />
            ) : null
          }
          renderItem={({ item }) => <ReviewRow review={item} />}
        />
      )}
    </PanelScreen>
  );
}

const styles = StyleSheet.create({
  loader: { marginTop: spacing['2xl'] },
  list: { paddingHorizontal: spacing.xl, paddingBottom: spacing.xl, gap: spacing.md },
  empty: { textAlign: 'center', color: colors.neutral[500], marginTop: spacing['2xl'] },
});
