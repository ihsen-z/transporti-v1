import {
  ActivityIndicator,
  FlatList,
  Modal,
  Pressable,
  StyleSheet,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { Txt } from '@/shared/ui/Txt';
import { colors, spacing, fontSize } from '@/shared/theme';
import { EmptyState } from '@/shared/ui/EmptyState';
import { queryRefreshControl } from '@/shared/ui/queryRefreshControl';
import { useMyReviews } from '../api/useMyReviews';
import { ReviewRow } from './ReviewRow';

interface Props {
  visible: boolean;
  onClose: () => void;
}

// Panneau plein écran « Mes avis » (avis reçus), ouvert depuis le Profil.
export function ReviewsPanel({ visible, onClose }: Props) {
  const { t } = useTranslation();
  const reviews = useMyReviews(visible);

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <SafeAreaView style={styles.modal} edges={['top', 'bottom']}>
        <View style={styles.header}>
          <Txt style={styles.title}>{t('reviews.my_title')}</Txt>
          <Pressable onPress={onClose} accessibilityRole="button">
            <Ionicons name="close" size={26} color={colors.neutral[700]} />
          </Pressable>
        </View>

        {reviews.isLoading ? (
          <ActivityIndicator style={styles.loader} color={colors.brand[500]} />
        ) : (
          <FlatList
            data={reviews.data ?? []}
            keyExtractor={(item) => String(item.id)}
            contentContainerStyle={styles.list}
            refreshControl={queryRefreshControl(reviews)}
            ListEmptyComponent={<EmptyState icon="star-outline" title={t('reviews.empty')} />}
            renderItem={({ item }) => <ReviewRow review={item} />}
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
