import { useState } from 'react';
import { ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFloatingTabBarClearance } from '@/shared/ui/FloatingTabBar';
import { useTranslation } from 'react-i18next';
import { Txt } from '@/shared/ui/Txt';
import { MyRequestsList } from '@/features/my-requests/components/MyRequestsList';
import { MyRequestsTabs } from '@/features/my-requests/components/MyRequestsTabs';
import { useMyRequests } from '@/features/my-requests/api/useMyRequests';
import {
  compterParOnglet,
  type OngletDemande,
} from '@/features/my-requests/model/onglets';
import { queryRefreshControl } from '@/shared/ui/queryRefreshControl';
import { colors, spacing, fontSize } from '@/shared/theme';

// Onglet CLIENT dédié au suivi des demandes envoyées. Auparavant une simple
// section noyée en bas de l'Accueil, sans pull-to-refresh ni existence propre
// dans la barre de navigation.
//
// C2.1 — les demandes sont désormais triées par QUI DOIT AGIR et non par date :
// une contre-proposition qui attend la décision du client ne doit pas se perdre
// sous des demandes closes.
export default function MesDemandesScreen() {
  // Marge basse reservee sous la liste : sans elle, le dernier element
  // reste sous la barre flottante et son action devient inatteignable
  // (defaut mesure sur l'inventaire des retours, recette du 03/09).
  const margeBasse = useFloatingTabBarClearance();
  const { t } = useTranslation();
  // Même queryKey que MyRequestsList (React Query dédoublonne) : ce qui donne
  // le pull-to-refresh à l'écran est aussi ce que la liste affiche.
  const requests = useMyRequests();
  const [onglet, setOnglet] = useState<OngletDemande>('attente');

  const compteurs = compterParOnglet(requests.data ?? []);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: margeBasse }]}
        refreshControl={queryRefreshControl(requests)}
      >
        <Txt style={styles.title}>{t('my_requests.title')}</Txt>
        <MyRequestsTabs
          actif={onglet}
          compteurs={compteurs}
          onSelect={setOnglet}
        />
        <MyRequestsList onglet={onglet} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.neutral[50] },
  content: { padding: spacing.xl, gap: spacing.lg },
  title: { fontSize: fontSize['2xl'], fontWeight: '800', color: colors.neutral[900] },
});
