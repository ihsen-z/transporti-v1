import { ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { Txt } from '@/shared/ui/Txt';
import { MyRequestsList } from '@/features/my-requests/components/MyRequestsList';
import { useMyRequests } from '@/features/my-requests/api/useMyRequests';
import { queryRefreshControl } from '@/shared/ui/queryRefreshControl';
import { colors, spacing, fontSize } from '@/shared/theme';

// Onglet CLIENT dédié au suivi des demandes envoyées. Auparavant une simple
// section noyée en bas de l'Accueil, sans pull-to-refresh ni existence propre
// dans la barre de navigation.
export default function MesDemandesScreen() {
  const { t } = useTranslation();
  // Même queryKey que MyRequestsList (React Query dédoublonne) : ce qui donne
  // le pull-to-refresh à l'écran est aussi ce que la liste affiche.
  const requests = useMyRequests();

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={queryRefreshControl(requests)}
      >
        <Txt style={styles.title}>{t('my_requests.title')}</Txt>
        <MyRequestsList />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.neutral[50] },
  content: { padding: spacing.xl, gap: spacing.lg },
  title: { fontSize: fontSize['2xl'], fontWeight: '800', color: colors.neutral[900] },
});
