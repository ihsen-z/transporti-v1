import { useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { colors, spacing, fontSize } from '@/shared/theme';
import { useConversations } from '@/features/messaging/api/useConversations';
import { ConversationRow } from '@/features/messaging/components/ConversationRow';
import { ChatView } from '@/features/messaging/components/ChatView';

interface Selected {
  jobId: number;
  title: string;
}

// Onglet Messages (les deux rôles). Master-détail via état local : inbox des
// conversations <-> fil d'un job. Polling assuré par React Query.
export default function MessagesScreen() {
  const { t } = useTranslation();
  const [selected, setSelected] = useState<Selected | null>(null);
  const conversations = useConversations();

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        {selected ? (
          <Pressable onPress={() => setSelected(null)} accessibilityRole="button">
            <Text style={styles.back}>{t('messaging.back')}</Text>
          </Pressable>
        ) : null}
        <Text style={styles.title} numberOfLines={1}>
          {selected ? selected.title : t('tabs.messages')}
        </Text>
      </View>

      {!selected ? (
        conversations.isLoading ? (
          <ActivityIndicator style={styles.loader} color={colors.brand[500]} />
        ) : (
          <FlatList
            data={conversations.data ?? []}
            keyExtractor={(item) => String(item.id)}
            contentContainerStyle={styles.list}
            ListEmptyComponent={<Text style={styles.empty}>{t('messaging.empty')}</Text>}
            renderItem={({ item }) => (
              <ConversationRow
                conv={item}
                onPress={() => setSelected({ jobId: item.job, title: item.job_title })}
              />
            )}
          />
        )
      ) : (
        <ChatView jobId={selected.jobId} />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.neutral[0] },
  header: { padding: spacing.xl, gap: spacing.sm },
  back: { color: colors.brand[500], fontWeight: '700', fontSize: fontSize.md },
  title: { fontSize: fontSize['2xl'], fontWeight: '800', color: colors.neutral[900] },
  list: { paddingHorizontal: spacing.xl, paddingBottom: spacing.xl, gap: spacing.md },
  empty: { fontSize: fontSize.md, color: colors.neutral[500], textAlign: 'center', marginTop: spacing.xl },
  loader: { marginTop: spacing['2xl'] },
});
