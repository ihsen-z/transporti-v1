import { useEffect, useMemo, useRef, useState } from 'react';
import {
  FlatList,
  Pressable,
  StyleSheet,
  View,
  type LayoutChangeEvent,
} from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useTabBarClearance } from '@/shared/ui/FloatingTabBar';
import { useTranslation } from 'react-i18next';
import {
  colors,
  spacing,
  fontSize,
  glass,
  radii,
  SCREEN_PADDING,
  TOUCH_TARGET,
} from '@/shared/theme';
import { AppScreen } from '@/shared/ui/AppScreen';
import { AppHeader } from '@/shared/ui/AppHeader';
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

// Onglet CLIENT : recherche « retour d'abord ». Bandeau bleu, carte de
// recherche qui le CHEVAUCHE (charte, §Anatomie), résultats en cartes ;
// Cas B = repli alerte corridor.
//
// Le chevauchement n'est pas décoratif ici : le formulaire est ce que la
// cliente vient faire, et le poser à cheval sur le bleu le sort de la liste
// de résultats au lieu de l'y ranger comme un élément de plus.

export default function SearchScreen() {
  // Marge basse reservee sous le contenu : sans elle, le dernier element reste
  // sous la barre de navigation et son action devient inatteignable (defaut
  // mesure sur l'inventaire des retours, recette du 03/09).
  const margeBasse = useTabBarClearance();
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
  // Lot 7.5 — l'accueil cliente porte le meme formulaire et transmet le
  // corridor ici. L'ecran s'ouvre donc DEJA rempli, et lance la recherche
  // tout seul : sans cela la cliente ressaisirait ce qu'elle vient de choisir.
  const amorce = useLocalSearchParams<{
    pickup?: string;
    dropoff?: string;
    day?: string;
  }>();
  const [pickup, setPickup] = useState<string | null>(amorce.pickup ?? null);
  const [dropoff, setDropoff] = useState<string | null>(amorce.dropoff ?? null);
  // Idem pour les filtres marchandise : l'etat vide peut proposer de les
  // retirer, et le formulaire doit suivre (lot 6.4).
  const [filtres, setFiltres] = useState<GoodsFilterValues>({
    jobType: '',
    weight: '',
    volume: '',
  });

  // Une seule fois : un `useEffect` sans garde relancerait la recherche a
  // chaque rendu, et « Voir tout le corridor » se ferait ecraser aussitot.
  const amorceJouee = useRef(false);

  // Les resultats sont accumules ici et non lus directement dans la mutation :
  // « Voir plus » ajoute une page a la liste au lieu de la remplacer (6.4).
  const [items, setItems] = useState<TripResultDto[]>([]);

  // Après une recherche, la réponse tombait SOUS le formulaire, hors de
  // l'écran : rien ne bougeait, et la cliente croyait que rien ne s'était
  // passé (audit du 10/09, revu en recette Android 16 le 25/10). À chaque
  // NOUVELLE recherche, la liste défile jusqu'au bloc de résultats, ou
  // jusqu'à l'état vide et ses issues. « Voir plus » ne fait pas défiler :
  // la cliente est déjà en bas de la liste.
  const listRef = useRef<FlatList<TripResultDto>>(null);
  const aReveler = useRef(false);
  const hautDuFormulaire = useRef(0);
  // Change à chaque recherche : remonte le bloc de résultats, donc relance
  // son onLayout même quand la réponse ne change pas sa hauteur.
  const [rechercheNo, setRechercheNo] = useState(0);

  const revelerResultats = (e: LayoutChangeEvent) => {
    if (!aReveler.current) return;
    aReveler.current = false;
    // Le bloc est dans l'en-tête de la liste : sa position est relative au
    // conteneur du formulaire, dont on ajoute le décalage.
    const offset = hautDuFormulaire.current + e.nativeEvent.layout.y - spacing.sm;
    listRef.current?.scrollToOffset({ offset: Math.max(0, offset), animated: true });
  };

  const revelerEtatVide = () => {
    if (!aReveler.current) return;
    aReveler.current = false;
    // L'état vide est le dernier élément de la liste.
    listRef.current?.scrollToEnd({ animated: true });
  };

  useEffect(() => {
    if (amorceJouee.current) return;
    if (!amorce.pickup || !amorce.dropoff) return;
    amorceJouee.current = true;
    if (amorce.day) setDay(amorce.day);
    onSearch({
      pickup_governorate: amorce.pickup,
      dropoff_governorate: amorce.dropoff,
      date: amorce.day || undefined,
    });
    // `onSearch` est stable pour ce qui compte ici (mutation + setState) et
    // l'amorce ne doit jouer qu'au montage : la liste de dependances est
    // volontairement reduite aux parametres de route.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [amorce.pickup, amorce.dropoff, amorce.day]);

  const onSearch = (params: MatchParams) => {
    setLastParams(params);
    createAlert.reset();
    match.mutate(params, {
      onSuccess: (data) => {
        setItems(data.results);
        aReveler.current = true;
        setRechercheNo((n) => n + 1);
      },
    });
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
    <AppScreen
      testID="search-screen"
      scroll={false}
      header={
        <AppHeader
          title={t('search.title')}
          trailing={
            <Pressable
              testID="search-open-alerts"
              onPress={() => setAlertsOpen(true)}
              accessibilityRole="button"
              accessibilityLabel={t('search.alerts.title')}
              style={styles.cloche}
            >
              <Icon name="bell" size={22} color={colors.onBlue[100]} />
            </Pressable>
          }
        >
          <Txt style={styles.subtitle}>{t('search.subtitle')}</Txt>
        </AppHeader>
      }
    >
      <FlatList
        ref={listRef}
        data={items}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={[styles.content, { paddingBottom: margeBasse }]}
        keyboardShouldPersistTaps="handled"
        ListHeaderComponent={
          <View
            style={styles.formWrap}
            onLayout={(e) => {
              hautDuFormulaire.current = e.nativeEvent.layout.y;
            }}
          >
            <Card>
              <SearchForm
                onSearch={onSearch}
                loading={match.isPending}
                day={day}
                onDayChange={setDay}
                filtres={filtres}
                onFiltresChange={setFiltres}
                pickup={pickup}
                dropoff={dropoff}
                onPickupChange={setPickup}
                onDropoffChange={setDropoff}
              />
            </Card>
            {match.isSuccess && total > 0 ? (
              <View
                key={rechercheNo}
                style={styles.resultats}
                onLayout={revelerResultats}
              >
                <ResultsMap trips={items} />
                <Txt style={styles.count}>
                  {t('search.results_count', { count: total })}
                </Txt>
              </View>
            ) : null}
          </View>
        }
        ListEmptyComponent={
          showEmpty && lastParams ? (
            <View key={rechercheNo} onLayout={revelerEtatVide}>
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
            </View>
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
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  // Rendus DANS le bandeau bleu.
  subtitle: {
    fontSize: fontSize.md,
    lineHeight: fontSize.md * 1.5,
    color: colors.text.onBlue,
  },
  cloche: {
    width: TOUCH_TARGET,
    height: TOUCH_TARGET,
    borderRadius: radii.chip,
    borderWidth: 1,
    borderColor: glass.chip.border,
    backgroundColor: glass.chip.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: { paddingHorizontal: SCREEN_PADDING, paddingTop: spacing.lg, gap: spacing.md },
  formWrap: { gap: spacing.md, marginBottom: spacing.xs },
  resultats: { gap: spacing.md },
  count: { fontSize: fontSize.sm, fontWeight: '700', color: colors.brand[600] },
  footer: { gap: spacing.sm, marginTop: spacing.sm },
  footerHint: { fontSize: fontSize.sm, color: colors.neutral[500], textAlign: 'center' },
});
