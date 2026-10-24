import { Pressable, StyleSheet, View } from 'react-native';
import { Icon } from '@/shared/ui/icons';
import { Card } from '@/shared/ui/Card';
import { Avatar } from '@/shared/ui/Avatar';
import { colors, spacing, fontSize, radii } from '@/shared/theme';
import type { ConversationListDto } from '../api/dto';
import { Txt } from '@/shared/ui/Txt';

interface Props {
  conv: ConversationListDto;
  onPress: () => void;
}

export function ConversationRow({ conv, onPress }: Props) {
  const hasUnread = conv.unread_count > 0;

  return (
    <Pressable testID={`conversation-${conv.id}`} onPress={onPress} accessibilityRole="button">
      <Card style={styles.card}>
        <Avatar name={conv.other_party_name} size={44} />
        <View style={styles.flex}>
          <Txt style={styles.title} numberOfLines={1}>{conv.job_title}</Txt>
          <Txt style={styles.party} numberOfLines={1}>{conv.other_party_name}</Txt>
          {conv.last_message ? (
            <Txt style={[styles.last, hasUnread && styles.lastUnread]} numberOfLines={1}>
              {conv.last_message.content}
            </Txt>
          ) : null}
        </View>

        {/* Bulle numérique (compteur non lu) — pas un tag texte, donc custom. */}
        {hasUnread ? (
          <View style={styles.badge}>
            <Txt style={styles.badgeText}>{conv.unread_count}</Txt>
          </View>
        ) : null}
        <Icon name="chevron-right" size={20} color={colors.neutral[400]} />
      </Card>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
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
