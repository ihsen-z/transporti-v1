import {
  ActivityIndicator,
  FlatList,
  Modal,
  Pressable,
  StyleSheet,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { Icon } from '@/shared/ui/icons';
import { Txt } from '@/shared/ui/Txt';
import { Card } from '@/shared/ui/Card';
import { EmptyState } from '@/shared/ui/EmptyState';
import { queryRefreshControl } from '@/shared/ui/queryRefreshControl';
import { colors, spacing, fontSize, TOUCH_TARGET } from '@/shared/theme';
import { useFavorites } from '../api/useFavorites';
import { useToggleFavorite } from '../api/useToggleFavorite';
import type { FavoriDto } from '../api/dto';

interface Props {
  visible: boolean;
  onClose: () => void;
}

/**
 * C5.3 — panneau « Mes transporteurs favoris », ouvert depuis le Profil.
 *
 * `favorites/` et `favorites/toggle/` existaient depuis P2-09 et n'étaient
 * consommés NULLE PART — ni web, ni mobile. Ce panneau et l'écran web sont
 * leur première interface.
 *
 * Réservé aux CLIENTS : les deux vues portent `RequireRole('CLIENT')` et
 * répondraient 403 à un transporteur. La requête n'est donc lancée que quand
 * le panneau est ouvert, et il n'est ouvrable que côté client.
 */
export function FavoritesPanel({ visible, onClose }: Props) {
  const { t } = useTranslation();
  const favoris = useFavorites(visible);
  const bascule = useToggleFavorite();

  const rendreFavori = ({ item }: { item: FavoriDto }) => (
    <Card>
      <View style={styles.ligne} testID="favoris-ligne">
        <View style={styles.infos}>
          <View style={styles.nomLigne}>
            <Txt style={styles.nom}>{item.transporter_name}</Txt>
            {item.is_verified && (
              <Icon name="shield-check" size={16} color={colors.brand[600]} />
            )}
          </View>
          {/* `total_jobs_completed` est ABSENT quand le transporteur n'a pas
              de profil de confiance : ne rien afficher plutôt qu'un « 0 » qui
              le dévaloriserait à tort. */}
          {item.total_jobs_completed !== undefined && (
            <Txt style={styles.detail}>
              {t('favorites.jobs_done', { count: item.total_jobs_completed })}
            </Txt>
          )}
        </View>
        <Pressable
          testID="favoris-retirer"
          accessibilityRole="button"
          accessibilityLabel={t('favorites.remove_a11y')}
          disabled={bascule.isPending}
          onPress={() => bascule.mutate(item.transporter_id)}
          style={styles.retirer}
        >
          <Icon name="heart" size={20} color={colors.error} />
        </Pressable>
      </View>
    </Card>
  );

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <SafeAreaView style={styles.modal} edges={['top', 'bottom']}>
        <View style={styles.header}>
          <Txt style={styles.titre}>{t('favorites.title')}</Txt>
          <Pressable
            testID="favoris-panneau-fermer"
            onPress={onClose}
            accessibilityRole="button"
            accessibilityLabel={t('common.close')}
            hitSlop={12}
          >
            <Icon name="x" size={26} color={colors.neutral[700]} />
          </Pressable>
        </View>

        {favoris.isLoading ? (
          <ActivityIndicator style={styles.chargement} color={colors.brand[500]} />
        ) : (
          <FlatList
            data={favoris.data ?? []}
            keyExtractor={(item) => String(item.id)}
            renderItem={rendreFavori}
            contentContainerStyle={styles.liste}
            refreshControl={queryRefreshControl(favoris)}
            ListEmptyComponent={
              <EmptyState
                icon="heart"
                title={t('favorites.empty_title')}
                subtitle={t('favorites.empty_body')}
                testID="favoris-vide"
              />
            }
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
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.lg,
  },
  titre: {
    fontSize: fontSize.xl,
    fontWeight: '800',
    color: colors.neutral[900],
  },
  chargement: { marginTop: spacing.xl },
  liste: { padding: spacing.xl, gap: spacing.md },
  ligne: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  infos: { flex: 1 },
  nomLigne: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  nom: {
    fontSize: fontSize.md,
    fontWeight: '700',
    color: colors.neutral[900],
  },
  detail: { fontSize: fontSize.sm, color: colors.neutral[500] },
  // Mesure a 36 dp, et sans etiquette : un coeur seul.
  retirer: {
    minWidth: TOUCH_TARGET,
    minHeight: TOUCH_TARGET,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
