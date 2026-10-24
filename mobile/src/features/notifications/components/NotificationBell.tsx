import { useState } from 'react';
import { ActivityIndicator, FlatList, Modal, Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Icon } from '@/shared/ui/icons';
import { useTranslation } from 'react-i18next';
import { colors, spacing, fontSize, radii, TOUCH_TARGET } from '@/shared/theme';
import { Txt } from '@/shared/ui/Txt';
import { useOnBlue } from '@/shared/ui/SurfaceTone';
import { EmptyState } from '@/shared/ui/EmptyState';
import { SkeletonList } from '@/shared/ui/SkeletonList';
import { queryRefreshControl } from '@/shared/ui/queryRefreshControl';
import { useFlatInfiniteList } from '@/core/api/useFlatInfiniteList';
import { useAuthStore } from '@/core/auth/authStore';
import { resolveNotificationRoute } from '../data/notificationRoute';
import { useUnreadCount } from '../api/useUnreadCount';
import { useNotifications } from '../api/useNotifications';
import { useMarkRead, useMarkAllRead } from '../api/useMarkNotifications';
import type { NotificationDto } from '../api/dto';
import { NotificationRow } from './NotificationRow';

// Cloche + badge non-lus + panneau modal. Placée dans le header de l'Accueil.
export function NotificationBell() {
  const { t } = useTranslation();
  const router = useRouter();
  const role = useAuthStore((s) => s.user?.role);
  // La cloche vit dans le bandeau bleu de l'Accueil : en `brand[600]` elle y
  // était du bleu sur du bleu. Le panneau qu'elle ouvre, lui, reste clair.
  const onBlue = useOnBlue();
  const [open, setOpen] = useState(false);
  const unread = useUnreadCount();
  const list = useNotifications(open); // fetch seulement à l'ouverture
  const { items, onEndReached } = useFlatInfiniteList(list);
  const markRead = useMarkRead();
  const markAll = useMarkAllRead();

  const count = unread.data ?? 0;

  // 4.7 : le tap ouvrait déjà la notification (marquage lu) mais ne menait
  // jamais nulle part — aucun écran de détail n'était adressable avant 4.5.
  const onPressNotif = (notif: NotificationDto) => {
    if (!notif.is_read) markRead.mutate(notif.id);
    const target = resolveNotificationRoute(notif.type, notif.metadata, role);
    if (target) {
      setOpen(false);
      router.push(target);
    }
  };

  return (
    <>
      <Pressable
        testID="notification-bell"
        onPress={() => setOpen(true)}
        style={styles.bell}
        accessibilityRole="button"
        // Sans cette etiquette, Android la derivait du seul enfant texte : le
        // lecteur d'ecran annoncait « 99+, bouton » — le nombre sans l'objet.
        accessibilityLabel={t('notifications.title')}
        accessibilityValue={count > 0 ? { text: t('a11y.unread', { count }) } : undefined}
      >
        <Icon name="bell" size={26} color={onBlue ? colors.onBlue[100] : colors.brand[600]} />
        {count > 0 ? (
          <View style={styles.badge}>
            <Txt style={styles.badgeText} maxFontSizeMultiplier={1.3}>
              {count > 99 ? '99+' : count}
            </Txt>
          </View>
        ) : null}
      </Pressable>

      <Modal visible={open} animationType="slide" onRequestClose={() => setOpen(false)}>
        <SafeAreaView style={styles.modal} edges={['top', 'bottom']}>
          <View style={styles.header}>
            <Txt style={styles.title}>{t('notifications.title')}</Txt>
            <Pressable
              testID="notification-bell-close"
              onPress={() => setOpen(false)}
              accessibilityRole="button"
              accessibilityLabel={t('common.close')}
              hitSlop={12}
            >
              <Icon name="x" size={26} color={colors.neutral[700]} />
            </Pressable>
          </View>

          {count > 0 ? (
            <Pressable
              testID="notification-mark-all"
              onPress={() => markAll.mutate()}
              style={styles.markAll}
              accessibilityRole="button"
            >
              <Txt style={styles.markAllText}>{t('notifications.mark_all')}</Txt>
            </Pressable>
          ) : null}

          {list.isLoading ? (
            <SkeletonList />
          ) : (
            <FlatList
              data={items}
              keyExtractor={(item) => String(item.id)}
              contentContainerStyle={styles.list}
              refreshControl={queryRefreshControl(list)}
              onEndReached={onEndReached}
              onEndReachedThreshold={0.5}
              ListEmptyComponent={
                <EmptyState icon="bell" title={t('notifications.empty')} />
              }
              ListFooterComponent={
                list.isFetchingNextPage ? (
                  <ActivityIndicator style={styles.loader} color={colors.brand[500]} />
                ) : null
              }
              renderItem={({ item }) => (
                <NotificationRow notif={item} onPress={() => onPressNotif(item)} />
              )}
            />
          )}
        </SafeAreaView>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  // Mesuree a 34 dp en recette (icone 26 + padding 4) : sous les 44 dp de
  // la charte, pour le seul acces aux notifications de l'application.
  bell: {
    minWidth: TOUCH_TARGET,
    minHeight: TOUCH_TARGET,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badge: {
    position: 'absolute',
    top: 0,
    right: 0,
    minWidth: 18,
    minHeight: 18,
    paddingVertical: 1,
    borderRadius: radii.full,
    backgroundColor: colors.cta[500],
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  badgeText: { color: colors.neutral[0], fontSize: fontSize.meta, fontWeight: '800' },
  modal: { flex: 1, backgroundColor: colors.neutral[50] },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.xl,
  },
  title: { fontSize: fontSize['2xl'], fontWeight: '800', color: colors.neutral[900] },
  markAll: {
    minHeight: TOUCH_TARGET,
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.md,
  },
  markAllText: { color: colors.brand[500], fontWeight: '700', fontSize: fontSize.md },
  loader: { marginTop: spacing['2xl'] },
  list: { paddingHorizontal: spacing.lg, paddingBottom: spacing.xl, gap: spacing.sm },
});
