import { ActivityIndicator, FlatList, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { colors, spacing } from '@/shared/theme';
import { EmptyState } from '@/shared/ui/EmptyState';
import { PanelScreen } from '@/shared/ui/PanelScreen';
import { queryRefreshControl } from '@/shared/ui/queryRefreshControl';
import { useFlatInfiniteList } from '@/core/api/useFlatInfiniteList';
import { useMyDisputes } from '../api/useMyDisputes';
import { DisputeRow } from './DisputeRow';

interface Props {
  visible: boolean;
  onClose: () => void;
}

// Panneau plein écran « Mes litiges », ouvert depuis le Profil.
export function DisputesPanel({ visible, onClose }: Props) {
  const { t } = useTranslation();
  const disputes = useMyDisputes(visible); // fetch seulement à l'ouverture
  const { items, onEndReached } = useFlatInfiniteList(disputes);

  return (
    <PanelScreen
      visible={visible}
      title={t('disputes.my_title')}
      onClose={onClose}
      testID="disputes-panel"
      scroll={false}
    >
      {disputes.isLoading ? (
        <ActivityIndicator style={styles.loader} color={colors.brand[500]} />
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={styles.list}
          refreshControl={queryRefreshControl(disputes)}
          onEndReached={onEndReached}
          onEndReachedThreshold={0.5}
          ListEmptyComponent={
            <EmptyState icon="shield-check" title={t('disputes.empty')} />
          }
          ListFooterComponent={
            disputes.isFetchingNextPage ? (
              <ActivityIndicator style={styles.loader} color={colors.brand[500]} />
            ) : null
          }
          renderItem={({ item }) => <DisputeRow dispute={item} />}
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
