import { useState } from 'react';
import { FlatList, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { colors, spacing, fontSize, radii } from '@/shared/theme';
import { EmptyState } from '@/shared/ui/EmptyState';
import { SkeletonList } from '@/shared/ui/SkeletonList';
import { queryRefreshControl } from '@/shared/ui/queryRefreshControl';
import { useUnreadCount } from '../api/useUnreadCount';
import { useNotifications } from '../api/useNotifications';
import { useMarkRead, useMarkAllRead } from '../api/useMarkNotifications';
import { NotificationRow } from './NotificationRow';

// Cloche + badge non-lus + panneau modal. Placée dans le header de l'Accueil.
export function NotificationBell() {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const unread = useUnreadCount();
  const list = useNotifications(open); // fetch seulement à l'ouverture
  const markRead = useMarkRead();
  const markAll = useMarkAllRead();

  const count = unread.data ?? 0;

  return (
    <>
      <Pressable onPress={() => setOpen(true)} style={styles.bell} accessibilityRole="button">
        <Ionicons name="notifications-outline" size={26} color={colors.brand[600]} />
        {count > 0 ? (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{count > 99 ? '99+' : count}</Text>
          </View>
        ) : null}
      </Pressable>

      <Modal visible={open} animationType="slide" onRequestClose={() => setOpen(false)}>
        <SafeAreaView style={styles.modal} edges={['top', 'bottom']}>
          <View style={styles.header}>
            <Text style={styles.title}>{t('notifications.title')}</Text>
            <Pressable onPress={() => setOpen(false)} accessibilityRole="button">
              <Ionicons name="close" size={26} color={colors.neutral[700]} />
            </Pressable>
          </View>

          {count > 0 ? (
            <Pressable onPress={() => markAll.mutate()} style={styles.markAll}>
              <Text style={styles.markAllText}>{t('notifications.mark_all')}</Text>
            </Pressable>
          ) : null}

          {list.isLoading ? (
            <SkeletonList />
          ) : (
            <FlatList
              data={list.data ?? []}
              keyExtractor={(item) => String(item.id)}
              contentContainerStyle={styles.list}
              refreshControl={queryRefreshControl(list)}
              ListEmptyComponent={
                <EmptyState icon="notifications-outline" title={t('notifications.empty')} />
              }
              renderItem={({ item }) => (
                <NotificationRow
                  notif={item}
                  onPress={() => {
                    if (!item.is_read) markRead.mutate(item.id);
                  }}
                />
              )}
            />
          )}
        </SafeAreaView>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  bell: { padding: spacing.xs },
  badge: {
    position: 'absolute',
    top: 0,
    right: 0,
    minWidth: 18,
    height: 18,
    borderRadius: radii.full,
    backgroundColor: colors.cta[500],
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  badgeText: { color: colors.neutral[0], fontSize: 11, fontWeight: '800' },
  modal: { flex: 1, backgroundColor: colors.neutral[0] },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.xl,
  },
  title: { fontSize: fontSize['2xl'], fontWeight: '800', color: colors.neutral[900] },
  markAll: { paddingHorizontal: spacing.xl, paddingBottom: spacing.md },
  markAllText: { color: colors.brand[500], fontWeight: '700', fontSize: fontSize.md },
  loader: { marginTop: spacing['2xl'] },
  list: { paddingHorizontal: spacing.lg, paddingBottom: spacing.xl, gap: spacing.sm },
  empty: { textAlign: 'center', color: colors.neutral[500], marginTop: spacing['2xl'] },
});
