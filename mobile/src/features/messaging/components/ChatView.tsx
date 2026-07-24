import { useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '@/core/auth/authStore';
import { colors, spacing, fontSize, radii } from '@/shared/theme';
import type { MessageDto } from '../api/dto';
import { useJobMessages } from '../api/useJobMessages';
import { useSendMessage } from '../api/useSendMessage';
import { MessageBubble } from './MessageBubble';

export function ChatView({ jobId }: { jobId: number }) {
  const { t } = useTranslation();
  const userId = useAuthStore((s) => s.user?.id ?? null);
  const messagesQ = useJobMessages(jobId);
  const send = useSendMessage();
  const [text, setText] = useState('');

  const locked = messagesQ.data?.conversation?.is_locked ?? false;
  const messages = messagesQ.data?.messages ?? [];

  const onSend = () => {
    const content = text.trim();
    if (!content) return;
    setText('');
    send.mutate({ jobId, content });
  };

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      {messagesQ.isLoading ? (
        <ActivityIndicator style={styles.loader} color={colors.brand[500]} />
      ) : (
        <FlatList
          data={messages}
          keyExtractor={(m: MessageDto) => String(m.id)}
          contentContainerStyle={styles.list}
          ListEmptyComponent={<Text style={styles.empty}>{t('messaging.no_messages')}</Text>}
          renderItem={({ item }) => (
            <MessageBubble message={item} mine={item.sender !== null && item.sender === userId} />
          )}
        />
      )}

      {locked ? (
        <Text style={styles.locked}>{t('messaging.locked')}</Text>
      ) : (
        <View style={styles.inputRow}>
          <TextInput
            style={styles.input}
            value={text}
            onChangeText={setText}
            placeholder={t('messaging.input_ph')}
            placeholderTextColor={colors.neutral[400]}
            multiline
          />
          <Pressable
            style={styles.sendBtn}
            onPress={onSend}
            disabled={send.isPending}
            accessibilityRole="button"
          >
            <Ionicons name="send" size={20} color={colors.neutral[0]} />
          </Pressable>
        </View>
      )}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  loader: { marginTop: spacing['2xl'] },
  list: { padding: spacing.lg, flexGrow: 1 },
  empty: { textAlign: 'center', color: colors.neutral[500], marginTop: spacing['2xl'] },
  locked: {
    textAlign: 'center',
    color: colors.neutral[500],
    fontStyle: 'italic',
    padding: spacing.lg,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: spacing.sm,
    padding: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.neutral[200],
  },
  input: {
    flex: 1,
    maxHeight: 120,
    minHeight: 44,
    borderWidth: 1,
    borderColor: colors.neutral[200],
    borderRadius: radii.lg,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    fontSize: fontSize.md,
    color: colors.neutral[900],
  },
  sendBtn: {
    width: 44,
    height: 44,
    borderRadius: radii.full,
    backgroundColor: colors.brand[500],
    alignItems: 'center',
    justifyContent: 'center',
  },
});
