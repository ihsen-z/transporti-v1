import { StyleSheet, Text, View } from 'react-native';
import { colors, spacing, fontSize, radii } from '@/shared/theme';
import type { MessageDto } from '../api/dto';

interface Props {
  message: MessageDto;
  mine: boolean;
}

export function MessageBubble({ message, mine }: Props) {
  // Message système : centré, discret.
  if (message.is_system) {
    return (
      <View style={styles.systemWrap}>
        <Text style={styles.system}>{message.content}</Text>
      </View>
    );
  }

  return (
    <View style={[styles.wrap, mine ? styles.mineWrap : styles.otherWrap]}>
      <View style={[styles.bubble, mine ? styles.mine : styles.other]}>
        {!mine ? <Text style={styles.sender}>{message.sender_name}</Text> : null}
        <Text style={mine ? styles.textMine : styles.textOther}>{message.content}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginVertical: spacing.xs, maxWidth: '82%' },
  mineWrap: { alignSelf: 'flex-end' },
  otherWrap: { alignSelf: 'flex-start' },
  bubble: { paddingVertical: spacing.sm, paddingHorizontal: spacing.md, borderRadius: radii.lg },
  mine: { backgroundColor: colors.brand[600], borderBottomRightRadius: radii.md },
  other: { backgroundColor: colors.neutral[100], borderBottomLeftRadius: radii.md },
  sender: { fontSize: fontSize.sm, fontWeight: '700', color: colors.brand[600], marginBottom: 2 },
  textMine: { fontSize: fontSize.md, color: colors.neutral[0] },
  textOther: { fontSize: fontSize.md, color: colors.neutral[900] },
  systemWrap: { alignSelf: 'center', marginVertical: spacing.sm, paddingHorizontal: spacing.lg },
  system: { fontSize: fontSize.sm, color: colors.neutral[500], textAlign: 'center', fontStyle: 'italic' },
});
