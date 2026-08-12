import { useNetInfo } from '@react-native-community/netinfo';
import { StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { Txt } from '@/shared/ui/Txt';
import { colors, spacing, fontSize } from '@/shared/theme';

// 5.5 : React Query se croyait TOUJOURS en ligne (`onlineManager` jamais
// branché sur un signal réseau réel) — les requêtes partaient dans le vide
// hors ligne, et le cache MMKV s'affichait sans indiquer qu'il était périmé.
// Ce bandeau est le signal visible ; `onlineManager` (app/_layout.tsx) est le
// signal qui change le comportement de React Query (pause des requêtes,
// reprise au retour réseau).
export function OfflineBanner() {
  const { t } = useTranslation();
  const netInfo = useNetInfo();

  // `isConnected === null` = état pas encore déterminé (premier rendu) : ne
  // pas afficher un faux-négatif avant que NetInfo n'ait répondu.
  if (netInfo.isConnected !== false) return null;

  return (
    <SafeAreaView edges={['top']} style={styles.safe}>
      <Txt style={styles.text}>{t('common.offline')}</Txt>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { backgroundColor: colors.error },
  text: {
    textAlign: 'center',
    color: colors.neutral[0],
    fontSize: fontSize.sm,
    fontWeight: '700',
    paddingVertical: spacing.xs,
  },
});
