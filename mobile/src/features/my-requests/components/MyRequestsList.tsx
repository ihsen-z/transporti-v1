import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { colors, spacing, fontSize } from '@/shared/theme';
import type { MyRequestDto } from '../api/dto';
import { useMyRequests } from '../api/useMyRequests';
import { MyRequestCard } from './MyRequestCard';

// Liste des demandes envoyées par le client (rendue via .map car imbriquée
// dans le ScrollView de l'Accueil).
export function MyRequestsList() {
  const { t } = useTranslation();
  const requests = useMyRequests();
  const data = requests.data ?? [];

  return (
    <View style={styles.wrap}>
      <Text style={styles.title}>{t('my_requests.title')}</Text>

      {requests.isLoading ? (
        <ActivityIndicator color={colors.brand[500]} />
      ) : data.length === 0 ? (
        <Text style={styles.empty}>{t('my_requests.empty')}</Text>
      ) : (
        data.map((r: MyRequestDto) => <MyRequestCard key={r.id} request={r} />)
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: spacing.md },
  title: { fontSize: fontSize.lg, fontWeight: '800', color: colors.brand[600] },
  empty: { fontSize: fontSize.md, color: colors.neutral[500] },
});
