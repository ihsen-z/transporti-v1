import { Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { ChatView } from '@/features/messaging/components/ChatView';
import { Icon } from '@/shared/ui/icons';
import { Txt } from '@/shared/ui/Txt';
import { RouteUnavailable } from '@/shared/ui/RouteUnavailable';
import { colors, spacing, fontSize } from '@/shared/theme';

// Fil d'une conversation — adressable (4.5), atteignable depuis la liste, une
// notification (4.7) ou un futur tap de push (4.8). `title` est un paramètre
// optionnel transmis par la liste (déjà en mémoire, pas d'aller-retour réseau
// supplémentaire) ; sans lui (arrivée directe par jobId) on retombe sur le
// libellé générique de l'onglet.
export default function ConversationScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { jobId, title } = useLocalSearchParams<{ jobId: string; title?: string }>();
  const numericJobId = Number(jobId);
  const valid = Number.isFinite(numericJobId) && numericJobId > 0;

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <Pressable
          testID="messages-detail-back"
          onPress={() => router.back()}
          accessibilityRole="button"
          accessibilityLabel={t('common.back')}
          hitSlop={12}
        >
          <Icon name="chevron-left" size={24} color={colors.neutral[900]} />
        </Pressable>
        <Txt style={styles.title} numberOfLines={1}>
          {title || t('tabs.messages')}
        </Txt>
      </View>

      {/* 7.6 — un identifiant invalide rendait l'en-tete puis `null` : un
          ecran vide, sans message ni sortie, atteignable d'un tap de
          notification. */}
      {valid ? <ChatView jobId={numericJobId} /> : <RouteUnavailable />}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.neutral[50] },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
  },
  title: { flex: 1, fontSize: fontSize.xl, fontWeight: '800', color: colors.neutral[900] },
});
