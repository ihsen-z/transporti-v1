import { useState } from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { colors, spacing, fontSize } from '@/shared/theme';
import { Button } from '@/shared/ui/Button';
import { SearchForm } from '@/features/search/components/SearchForm';
import { TripResultCard } from '@/features/search/components/TripResultCard';
import { SendRequestSheet } from '@/features/search/components/SendRequestSheet';
import { useReturnTripMatch } from '@/features/search/api/useReturnTripMatch';
import { useCreateCorridorAlert } from '@/features/search/api/useCreateCorridorAlert';
import type { MatchParams, TripResultDto } from '@/features/search/api/dto';

// Onglet CLIENT : funnel « recherche du trajet retour d'abord ».
//   Cas A : des résultats -> envoyer une demande.
//   Cas B : aucun résultat -> repli = alerte corridor (D14).
export default function SearchScreen() {
  const { t } = useTranslation();
  const match = useReturnTripMatch();
  const createAlert = useCreateCorridorAlert();
  const [selected, setSelected] = useState<TripResultDto | null>(null);
  const [lastParams, setLastParams] = useState<MatchParams | null>(null);

  const onSearch = (params: MatchParams) => {
    setLastParams(params);
    createAlert.reset();
    match.mutate(params);
  };

  const results = match.data?.results ?? [];
  const showEmpty = match.isSuccess && match.data.count === 0;

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <FlatList
        data={results}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        ListHeaderComponent={
          <View style={styles.header}>
            <Text style={styles.title}>{t('search.title')}</Text>
            <Text style={styles.subtitle}>{t('search.subtitle')}</Text>
            <SearchForm onSearch={onSearch} loading={match.isPending} />
            {match.isSuccess && match.data.count > 0 ? (
              <Text style={styles.count}>
                {t('search.results_count', { count: match.data.count })}
              </Text>
            ) : null}
          </View>
        }
        ListEmptyComponent={
          showEmpty ? (
            <View style={styles.empty}>
              <Text style={styles.emptyTitle}>{t('search.no_results_title')}</Text>
              <Text style={styles.emptyHint}>{t('search.no_results_hint')}</Text>
              {createAlert.isSuccess ? (
                <Text style={styles.alertOk}>{t('search.alert_created')}</Text>
              ) : (
                <Button
                  label={t('search.create_alert')}
                  onPress={() =>
                    lastParams &&
                    createAlert.mutate({
                      pickup_governorate: lastParams.pickup_governorate,
                      dropoff_governorate: lastParams.dropoff_governorate,
                    })
                  }
                  variant="primary"
                  loading={createAlert.isPending}
                />
              )}
            </View>
          ) : null
        }
        renderItem={({ item }) => (
          <TripResultCard trip={item} onRequest={() => setSelected(item)} />
        )}
      />

      <SendRequestSheet trip={selected} onClose={() => setSelected(null)} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.neutral[0] },
  content: { padding: spacing.xl, gap: spacing.md },
  header: { gap: spacing.md, marginBottom: spacing.sm },
  title: { fontSize: fontSize['2xl'], fontWeight: '800', color: colors.neutral[900] },
  subtitle: { fontSize: fontSize.md, color: colors.neutral[500] },
  count: { fontSize: fontSize.sm, fontWeight: '700', color: colors.brand[600] },
  empty: { gap: spacing.md, paddingTop: spacing.lg, alignItems: 'stretch' },
  emptyTitle: { fontSize: fontSize.lg, fontWeight: '800', color: colors.neutral[900], textAlign: 'center' },
  emptyHint: { fontSize: fontSize.md, color: colors.neutral[500], textAlign: 'center' },
  alertOk: { fontSize: fontSize.md, fontWeight: '700', color: colors.green[700], textAlign: 'center' },
});
