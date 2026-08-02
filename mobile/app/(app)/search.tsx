import { useState } from 'react';
import { FlatList, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { colors, spacing, fontSize, radii, shadows } from '@/shared/theme';
import { Txt } from '@/shared/ui/Txt';
import { Button } from '@/shared/ui/Button';
import { Card } from '@/shared/ui/Card';
import { SearchForm } from '@/features/search/components/SearchForm';
import { TripResultCard } from '@/features/search/components/TripResultCard';
import { SendRequestSheet } from '@/features/search/components/SendRequestSheet';
import { ResultsMap } from '@/features/search/components/ResultsMap';
import { useReturnTripMatch } from '@/features/search/api/useReturnTripMatch';
import { useCreateCorridorAlert } from '@/features/search/api/useCreateCorridorAlert';
import type { MatchParams, TripResultDto } from '@/features/search/api/dto';

// Onglet CLIENT : recherche « retour d'abord ». Header bleu (design-system),
// formulaire en carte, résultats en cartes ; Cas B = repli alerte corridor.
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
      <View style={styles.header}>
        <Txt style={styles.title}>{t('search.title')}</Txt>
        <Txt style={styles.subtitle}>{t('search.subtitle')}</Txt>
      </View>

      <FlatList
        data={results}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        ListHeaderComponent={
          <View style={styles.formWrap}>
            <Card>
              <SearchForm onSearch={onSearch} loading={match.isPending} />
            </Card>
            {match.isSuccess && match.data.count > 0 ? (
              <>
                <ResultsMap trips={results} />
                <Txt style={styles.count}>
                  {t('search.results_count', { count: match.data.count })}
                </Txt>
              </>
            ) : null}
          </View>
        }
        ListEmptyComponent={
          showEmpty ? (
            <Card style={styles.emptyCard}>
              <Txt style={styles.emptyTitle}>{t('search.no_results_title')}</Txt>
              <Txt style={styles.emptyHint}>{t('search.no_results_hint')}</Txt>
              {createAlert.isSuccess ? (
                <Txt style={styles.alertOk}>{t('search.alert_created')}</Txt>
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
            </Card>
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
  safe: { flex: 1, backgroundColor: colors.neutral[50] },
  header: {
    backgroundColor: colors.brand[600],
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.sm,
    paddingBottom: spacing.lg,
    borderBottomLeftRadius: radii.hero,
    borderBottomRightRadius: radii.hero,
    gap: spacing.xs,
    ...shadows.brand,
  },
  title: { fontSize: fontSize['2xl'], fontWeight: '800', color: colors.neutral[0] },
  subtitle: { fontSize: fontSize.md, color: colors.neutral[0], opacity: 0.85 },
  content: { padding: spacing.xl, gap: spacing.md },
  formWrap: { gap: spacing.md, marginBottom: spacing.xs },
  count: { fontSize: fontSize.sm, fontWeight: '700', color: colors.brand[600] },
  emptyCard: { gap: spacing.md, marginTop: spacing.lg },
  emptyTitle: {
    fontSize: fontSize.lg,
    fontWeight: '800',
    color: colors.neutral[900],
    textAlign: 'center',
  },
  emptyHint: { fontSize: fontSize.md, color: colors.neutral[500], textAlign: 'center' },
  alertOk: {
    fontSize: fontSize.md,
    fontWeight: '700',
    color: colors.green[700],
    textAlign: 'center',
  },
});
