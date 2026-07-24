import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, fontSize, radii } from '@/shared/theme';
import type { ConversationListDto } from '../api/dto';

interface Props {
  conv: ConversationListDto;
  onPress: () => void;
}

export function ConversationRow({ conv, onPress }: Props) {
  const hasUnread = conv.unread_count > 0;

  return (
    <Pressable style={styles.row} onPress={onPress} accessibilityRole="button">
      <View style={styles.flex}>
        <Text style={styles.title} numberOfLines={1}>{conv.job_title}</Text>
        <Text style={styles.party} numberOfLines={1}>{conv.other_party_name}</Text>
        {conv.last_message ? (
          <Text style={[styles.last, hasUnread && styles.lastUnread]} numberOfLines={1}>
            {conv.last_message.content}
          </Text>
        ) : null}
      </View>

      {hasUnread ? (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{conv.unread_count}</Text>
        </View>
      ) : null}
      <Ionicons name="chevron-forward" size={20} color={colors.neutral[400]} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.neutral[200],
    borderRadius: radii.lg,
    backgroundColor: colors.neutral[0],
  },
  flex: { flex: 1, gap: 2 },
  title: { fontSize: fontSize.md, fontWeight: '700', color: colors.neutral[900] },
  party: { fontSize: fontSize.sm, color: colors.neutral[700] },
  last: { fontSize: fontSize.sm, color: colors.neutral[500] },
  lastUnread: { color: colors.neutral[900], fontWeight: '700' },
  badge: {
    minWidth: 22,
    height: 22,
    borderRadius: radii.full,
    backgroundColor: colors.cta[500],
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  badgeText: { color: colors.neutral[0], fontSize: fontSize.sm, fontWeight: '800' },
});
