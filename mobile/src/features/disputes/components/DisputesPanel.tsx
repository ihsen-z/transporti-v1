import {
  ActivityIndicator,
  FlatList,
  Modal,
  Pressable,
  StyleSheet,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Icon } from '@/shared/ui/icons';
import { useTranslation } from 'react-i18next';
import { Txt } from '@/shared/ui/Txt';
import { colors, spacing, fontSize } from '@/shared/theme';
import { EmptyState } from '@/shared/ui/EmptyState';
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
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <SafeAreaView style={styles.modal} edges={['top', 'bottom']}>
        <View style={styles.header}>
          <Txt style={styles.title}>{t('disputes.my_title')}</Txt>
          <Pressable onPress={onClose} accessibilityRole="button">
            <Icon name="x" size={26} color={colors.neutral[700]} />
          </Pressable>
        </View>

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
  empty: { textAlign: 'center', color: colors.neutral[500], marginTop: spacing['2xl'] },
});
