import { ActivityIndicator, FlatList, StyleSheet } from 'react-native';
import { useTabBarClearance } from '@/shared/ui/FloatingTabBar';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { colors, spacing, SCREEN_PADDING } from '@/shared/theme';
import { AppScreen } from '@/shared/ui/AppScreen';
import { AppHeader } from '@/shared/ui/AppHeader';
import { EmptyState } from '@/shared/ui/EmptyState';
import { SkeletonList } from '@/shared/ui/SkeletonList';
import { queryRefreshControl } from '@/shared/ui/queryRefreshControl';
import { useFlatInfiniteList } from '@/core/api/useFlatInfiniteList';
import { useConversations } from '@/features/messaging/api/useConversations';
import { ConversationRow } from '@/features/messaging/components/ConversationRow';

// Onglet Messages (les deux rôles) — liste des conversations. Le fil vit
// désormais à sa propre route adressable (`messages/[jobId]`, 4.5) : ce que
// tapote l'utilisateur, ce que rouvre une notification, et ce que le bouton
// retour Android referme sont maintenant la même chose.
export default function MessagesScreen() {
  // Marge basse reservee sous le contenu : sans elle, le dernier element reste
  // sous la barre de navigation et son action devient inatteignable (defaut
  // mesure sur l'inventaire des retours, recette du 03/09).
  const margeBasse = useTabBarClearance();
  const { t } = useTranslation();
  const router = useRouter();
  const conversations = useConversations();
  const { items, onEndReached } = useFlatInfiniteList(conversations);

  return (
    // `scroll={false}` : la liste est paginée, elle garde son propre
    // défilement (et donc sa virtualisation et son `onEndReached`).
    <AppScreen
      testID="messages-screen"
      scroll={false}
      header={<AppHeader title={t('tabs.messages')} />}
    >
      {conversations.isLoading ? (
        <SkeletonList />
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={[styles.list, { paddingBottom: margeBasse }]}
          refreshControl={queryRefreshControl(conversations)}
          onEndReached={onEndReached}
          onEndReachedThreshold={0.5}
          ListEmptyComponent={<EmptyState icon="message-circle" title={t('messaging.empty')} />}
          ListFooterComponent={
            conversations.isFetchingNextPage ? (
              <ActivityIndicator style={styles.loader} color={colors.brand[500]} />
            ) : null
          }
          renderItem={({ item }) => (
            <ConversationRow
              conv={item}
              onPress={() =>
                router.push({
                  pathname: '/messages/[jobId]',
                  params: { jobId: String(item.job), title: item.job_title },
                })
              }
            />
          )}
        />
      )}
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  list: {
    paddingHorizontal: SCREEN_PADDING,
    paddingTop: spacing.xl,
    gap: spacing.md,
  },
  loader: { marginTop: spacing.lg },
});
