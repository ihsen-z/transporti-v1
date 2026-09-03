import { ActivityIndicator, FlatList, Modal, Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Icon } from '@/shared/ui/icons';
import { useTranslation } from 'react-i18next';
import { Txt } from '@/shared/ui/Txt';
import { colors, spacing, fontSize } from '@/shared/theme';
import { EmptyState } from '@/shared/ui/EmptyState';
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
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <SafeAreaView style={styles.modal} edges={['top', 'bottom']}>
        <View style={styles.header}>
          <Txt style={styles.title}>{t('search.alerts.title')}</Txt>
          <Pressable testID="corridor-alerts-close" onPress={onClose} accessibilityRole="button"
            accessibilityLabel={t('common.close')}
            hitSlop={12}>
            <Icon name="x" size={26} color={colors.neutral[700]} />
          </Pressable>
        </View>

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
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modal: { flex: 1, backgroundColor: colors.neutral[50] },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.xl,
  },
  title: { fontSize: fontSize['2xl'], fontWeight: '800', color: colors.neutral[900] },
  loader: { marginTop: spacing['2xl'] },
  list: { paddingHorizontal: spacing.xl, paddingBottom: spacing.xl, gap: spacing.md },
});
