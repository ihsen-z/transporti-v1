import { ActivityIndicator, FlatList, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { colors, spacing, SCREEN_PADDING } from '@/shared/theme';
import { EmptyState } from '@/shared/ui/EmptyState';
import { PanelScreen } from '@/shared/ui/PanelScreen';
import { queryRefreshControl } from '@/shared/ui/queryRefreshControl';
import { useCorridorAlerts } from '../api/useCorridorAlerts';
import { CorridorAlertRow } from './CorridorAlertRow';

interface Props {
  visible: boolean;
  onClose: () => void;
}

// Panneau « Mes alertes corridor », ouvert depuis Recherche. Symétrique de
// DisputesPanel/ReviewsPanel : une alerte était créable (Cas B) mais jamais
// consultable ni supprimable — ce panneau ferme la boucle.
export function CorridorAlertsPanel({ visible, onClose }: Props) {
  const { t } = useTranslation();
  const alerts = useCorridorAlerts(visible);

  return (
    // `scroll={false}` : la liste défile elle-même. L'imbriquer dans le
    // ScrollView du panneau lui retirerait sa virtualisation.
    <PanelScreen
      visible={visible}
      title={t('search.alerts.title')}
      onClose={onClose}
      testID="corridor-alerts"
      scroll={false}
    >
      {alerts.isLoading ? (
        <ActivityIndicator style={styles.loader} color={colors.brand[500]} />
      ) : (
        <FlatList
          data={alerts.data ?? []}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={styles.list}
          refreshControl={queryRefreshControl(alerts)}
          ListEmptyComponent={<EmptyState icon="bell" title={t('search.alerts.empty')} />}
          renderItem={({ item }) => <CorridorAlertRow alert={item} />}
        />
      )}
    </PanelScreen>
  );
}

const styles = StyleSheet.create({
  loader: { marginTop: spacing['2xl'] },
  list: {
    paddingHorizontal: SCREEN_PADDING,
    paddingTop: spacing.xl,
    paddingBottom: spacing.xl,
    gap: spacing.md,
  },
});
