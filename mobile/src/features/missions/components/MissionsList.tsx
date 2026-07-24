import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { colors, spacing, fontSize } from '@/shared/theme';
import type { MissionDto } from '../api/dto';
import { useMyMissions } from '../api/useMyMissions';
import { MissionCard } from './MissionCard';

// Liste des missions actives du transporteur. Rendue via .map (et non FlatList)
// car imbriquée dans le ScrollView de l'Accueil.
export function MissionsList() {
  const { t } = useTranslation();
  const missions = useMyMissions();
  const data = missions.data ?? [];

  return (
    <View style={styles.wrap}>
      <Text style={styles.title}>{t('missions.title')}</Text>

      {missions.isLoading ? (
        <ActivityIndicator color={colors.brand[500]} />
      ) : data.length === 0 ? (
        <Text style={styles.empty}>{t('missions.empty')}</Text>
      ) : (
        data.map((m: MissionDto) => <MissionCard key={m.id} mission={m} />)
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: spacing.md },
  title: { fontSize: fontSize.lg, fontWeight: '800', color: colors.brand[600] },
  empty: { fontSize: fontSize.md, color: colors.neutral[500] },
});
