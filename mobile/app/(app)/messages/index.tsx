import { ActivityIndicator, FlatList, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { colors, spacing, fontSize } from '@/shared/theme';
import { Txt } from '@/shared/ui/Txt';
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
  const { t } = useTranslation();
  const router = useRouter();
  const conversations = useConversations();
  const { items, onEndReached } = useFlatInfiniteList(conversations);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <Txt style={styles.title}>{t('tabs.messages')}</Txt>
      </View>

      {conversations.isLoading ? (
        <SkeletonList />
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={styles.list}
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
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.neutral[50] },
  header: { padding: spacing.xl, gap: spacing.sm },
  title: { fontSize: fontSize['2xl'], fontWeight: '800', color: colors.neutral[900] },
  list: { paddingHorizontal: spacing.xl, paddingBottom: spacing.xl, gap: spacing.md },
  loader: { marginTop: spacing.lg },
});
