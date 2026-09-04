import { useMemo, useState } from 'react';
import { FlatList, Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFloatingTabBarClearance } from '@/shared/ui/FloatingTabBar';
import { useTranslation } from 'react-i18next';
import { colors, spacing, fontSize, radii, shadows } from '@/shared/theme';
import { Txt } from '@/shared/ui/Txt';
import { Button } from '@/shared/ui/Button';
import { Card } from '@/shared/ui/Card';
import { Icon } from '@/shared/ui/icons';
import { SearchForm } from '@/features/search/components/SearchForm';
import { gouvernoratsVoisins } from '@/features/trips/data/governorates';
import type { GoodsFilterValues } from '@/features/search/components/GoodsFilters';
import { TripResultCard } from '@/features/search/components/TripResultCard';
import { SendRequestSheet } from '@/features/search/components/SendRequestSheet';
import { SearchEmptyState } from '@/features/search/components/SearchEmptyState';
import { ResultsMap } from '@/features/search/components/ResultsMap';
import { CorridorAlertsPanel } from '@/features/search/components/CorridorAlertsPanel';
import { useReturnTripMatch } from '@/features/search/api/useReturnTripMatch';
import { useCreateCorridorAlert } from '@/features/search/api/useCreateCorridorAlert';
import type { MatchParams, TripResultDto } from '@/features/search/api/dto';

// Onglet CLIENT : recherche « retour d'abord ». Header bleu (design-system),
// formulaire en carte, résultats en cartes ; Cas B = repli alerte corridor.
export default function SearchScreen() {
  // Marge basse reservee sous la liste : sans elle, le dernier element
  // reste sous la barre flottante et son action devient inatteignable
  // (defaut mesure sur l'inventaire des retours, recette du 03/09).
  const margeBasse = useFloatingTabBarClearance();
  const { t, i18n } = useTranslation();
  const isAr = i18n.language === 'ar';
  const match = useReturnTripMatch();
  const createAlert = useCreateCorridorAlert();
  const [selected, setSelected] = useState<TripResultDto | null>(null);
  const [lastParams, setLastParams] = useState<MatchParams | null>(null);
  const [alertsOpen, setAlertsOpen] = useState(false);
  // Le jour vit ici et non dans le formulaire : « Voir tout le corridor »
  // rejoue la recherche sans date, et le formulaire doit suivre (lot 6.3).
  const [day, setDay] = useState<string | null>(null);
  // Idem pour les filtres marchandise : l'etat vide peut proposer de les
  // retirer, et le formulaire doit suivre (lot 6.4).
  const [filtres, setFiltres] = useState<GoodsFilterValues>({
    jobType: '',
    weight: '',
    volume: '',
  });

  // Les resultats sont accumules ici et non lus directement dans la mutation :
  // « Voir plus » ajoute une page a la liste au lieu de la remplacer (6.4).
  const [items, setItems] = useState<TripResultDto[]>([]);

  const onSearch = (params: MatchParams) => {
    setLastParams(params);
    createAlert.reset();
    match.mutate(params, { onSuccess: (data) => setItems(data.results) });
  };

  const onVoirPlus = () => {
    if (!lastParams) return;
    match.mutate(
      { ...lastParams, offset: items.length },
      { onSuccess: (data) => setItems((precedents) => [...precedents, ...data.results]) },
    );
  };

  // Sorties immédiates de l'état vide : la même requête, moins la contrainte
  // qui a probablement mordu. Le serveur traite date et filtres comme
  // facultatifs, donc il n'y a rien d'autre à câbler.
  const onVoirCorridor = () => {
    if (!lastParams) return;
    setDay(null);
    onSearch({
      pickup_governorate: lastParams.pickup_governorate,
      dropoff_governorate: lastParams.dropoff_governorate,
      job_type: lastParams.job_type,
      weight_kg: lastParams.weight_kg,
      volume_m3: lastParams.volume_m3,
    });
  };

  // Voisins proposables : aucun si on a deja elargi (le parametre porte alors
  // plusieurs gouvernorats), aucun s'il n'y en a pas dans le rayon.
  const voisins = useMemo(() => {
    if (!lastParams || lastParams.pickup_governorate.includes(',')) return [];
    return gouvernoratsVoisins(lastParams.pickup_governorate);
  }, [lastParams]);

  const onElargirVoisins = () => {
    if (!lastParams || voisins.length === 0) return;
    const departs = [lastParams.pickup_governorate, ...voisins.map((v) => v.code)];
    onSearch({
      pickup_governorate: departs.join(','),
      dropoff_governorate: lastParams.dropoff_governorate,
    });
  };

  const onRetirerFiltres = () => {
    if (!lastParams) return;
    setFiltres({ jobType: '', weight: '', volume: '' });
    onSearch({
      pickup_governorate: lastParams.pickup_governorate,
      dropoff_governorate: lastParams.dropoff_governorate,
      date: lastParams.date,
    });
  };

  const total = match.data?.count ?? 0;
  const showEmpty = match.isSuccess && total === 0;
  const resteAVoir = match.isSuccess && items.length < total;

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <View style={styles.headerRow}>
          <Txt style={styles.title}>{t('search.title')}</Txt>
          <Pressable
            testID="search-open-alerts"
            onPress={() => setAlertsOpen(true)}
            accessibilityRole="button"
            accessibilityLabel={t('search.alerts.title')}
            hitSlop={12}
          >
            <Icon name="bell" size={22} color={colors.neutral[0]} />
          </Pressable>
        </View>
        <Txt style={styles.subtitle}>{t('search.subtitle')}</Txt>
      </View>

      <FlatList
        data={items}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={[styles.content, { paddingBottom: margeBasse }]}
        keyboardShouldPersistTaps="handled"
        ListHeaderComponent={
          <View style={styles.formWrap}>
            <Card>
              <SearchForm
                onSearch={onSearch}
                loading={match.isPending}
                day={day}
                onDayChange={setDay}
                filtres={filtres}
                onFiltresChange={setFiltres}
              />
            </Card>
            {match.isSuccess && total > 0 ? (
              <>
                <ResultsMap trips={items} />
                <Txt style={styles.count}>
                  {t('search.results_count', { count: total })}
                </Txt>
              </>
            ) : null}
          </View>
        }
        ListEmptyComponent={
          showEmpty && lastParams ? (
            <SearchEmptyState
              params={lastParams}
              onVoirCorridor={onVoirCorridor}
              onRetirerFiltres={onRetirerFiltres}
              onElargirVoisins={onElargirVoisins}
              voisins={voisins.map((v) => (isAr ? v.nameAr : v.nameFr))}
              onCreerAlerte={() =>
                createAlert.mutate({
                  pickup_governorate: lastParams.pickup_governorate,
                  dropoff_governorate: lastParams.dropoff_governorate,
                })
              }
              alerteCreee={createAlert.isSuccess}
              alertePending={createAlert.isPending}
            />
          ) : null
        }
        renderItem={({ item }) => (
          <TripResultCard trip={item} onRequest={() => setSelected(item)} />
        )}
        ListFooterComponent={
          // 6.4 — le plafond serveur (10 par page) n'est plus une impasse.
          // L'ecran invitait a « affiner » ; il propose desormais de voir la
          // suite, ce qui est l'action que la cliente cherchait.
          resteAVoir ? (
            <View style={styles.footer}>
              <Txt style={styles.footerHint}>
                {t('search.shown_of', { affiches: items.length, total })}
              </Txt>
              <Button
                testID="search-voir-plus"
                label={t('search.see_more')}
                onPress={onVoirPlus}
                variant="ghost"
                loading={match.isPending}
              />
            </View>
          ) : null
        }
      />

      <SendRequestSheet trip={selected} onClose={() => setSelected(null)} />
      <CorridorAlertsPanel visible={alertsOpen} onClose={() => setAlertsOpen(false)} />
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
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  title: { fontSize: fontSize['2xl'], fontWeight: '800', color: colors.neutral[0] },
  subtitle: { fontSize: fontSize.md, color: colors.neutral[0], opacity: 0.85 },
  content: { padding: spacing.xl, gap: spacing.md },
  formWrap: { gap: spacing.md, marginBottom: spacing.xs },
  count: { fontSize: fontSize.sm, fontWeight: '700', color: colors.brand[600] },
  footer: { gap: spacing.sm, marginTop: spacing.sm },
  footerHint: { fontSize: fontSize.sm, color: colors.neutral[500], textAlign: 'center' },
});
