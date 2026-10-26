import { useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Select } from '@/shared/ui/Select';
import { Button } from '@/shared/ui/Button';
import { colors, spacing, fontSize } from '@/shared/theme';
import { GOVERNORATES } from '@/features/trips/data/governorates';
import { nextDays } from '@/features/trips/data/schedule';
import { GoodsFilters, type GoodsFilterValues } from './GoodsFilters';
import type { MatchParams } from '../api/dto';
import { Txt } from '@/shared/ui/Txt';

interface Props {
  onSearch: (params: MatchParams) => void;
  loading: boolean;
  /**
   * Le jour est porté par l'écran, pas par le formulaire : l'état vide peut
   * proposer « Voir tout le corridor », qui rejoue la recherche SANS date. Si
   * le formulaire gardait sa propre copie, il continuerait d'afficher un jour
   * que les résultats ne respectent plus.
   */
  day: string | null;
  onDayChange: (day: string | null) => void;
  /**
   * Les filtres marchandise vivent aussi dans l'ecran : l'etat vide peut
   * proposer « Voir sans filtre marchandise », qui les retire. Meme raison que
   * le jour.
   */
  filtres: GoodsFilterValues;
  onFiltresChange: (filtres: GoodsFilterValues) => void;
  /**
   * Le corridor est porté par l'écran, comme le jour et les filtres. Lot 7.5 —
   * l'accueil cliente embarque ce même formulaire et transmet le corridor à
   * l'écran de recherche : celui-ci doit pouvoir s'ouvrir DÉJÀ rempli, sinon
   * la cliente ressaisirait ce qu'elle vient de choisir.
   */
  pickup: string | null;
  dropoff: string | null;
  onPickupChange: (v: string | null) => void;
  onDropoffChange: (v: string | null) => void;
  /** Libellé du bouton, « Rechercher » par défaut. */
  labelBouton?: string;
}

export function SearchForm({
  onSearch,
  loading,
  day,
  onDayChange,
  filtres,
  onFiltresChange,
  pickup,
  dropoff,
  onPickupChange,
  onDropoffChange,
  labelBouton,
}: Props) {
  const { t, i18n } = useTranslation();
  const isAr = i18n.language === 'ar';
  const [error, setError] = useState<string | null>(null);
  // Lot 6.4 — filtres marchandise, repliés par défaut.
  const [filtresOuverts, setFiltresOuverts] = useState(false);
  const [erreurFiltres, setErreurFiltres] = useState<string | null>(null);

  const govOptions = useMemo(
    () => GOVERNORATES.map((g) => ({ value: g.code, label: isAr ? g.nameAr : g.nameFr })),
    [isAr],
  );
  const dayOptions = useMemo(() => nextDays(14), []);

  /** Décimal positif ou vide, comme le serveur l'attend. */
  const nombreOuVide = (v: string): boolean =>
    v === '' || (/^\d+(\.\d{1,2})?$/.test(v) && Number(v) > 0);

  const submit = () => {
    if (!pickup || !dropoff) {
      setError(t('search.errors.route_required'));
      return;
    }
    if (pickup === dropoff) {
      setError(t('search.errors.same'));
      return;
    }
    // Le serveur refuse un filtre illisible plutôt que de l'ignorer : on
    // l'attrape ici pour que la cliente corrige au bon endroit, et on ouvre
    // le dépliant si elle l'avait replié sur une valeur fautive.
    if (!nombreOuVide(filtres.weight) || !nombreOuVide(filtres.volume)) {
      setErreurFiltres(t('search.filters.invalid'));
      setFiltresOuverts(true);
      return;
    }
    setError(null);
    setErreurFiltres(null);
    onSearch({
      pickup_governorate: pickup,
      dropoff_governorate: dropoff,
      date: day ?? undefined,
      job_type: filtres.jobType || undefined,
      weight_kg: filtres.weight ? Number(filtres.weight) : undefined,
      volume_m3: filtres.volume ? Number(filtres.volume) : undefined,
    });
  };

  return (
    <View style={styles.form}>
      <Select
        testID="search-from"
        searchable
        label={t('search.from')}
        placeholder={t('trips.governorate_ph')}
        value={pickup}
        options={govOptions}
        onChange={onPickupChange}
      />
      <Select
        testID="search-to"
        searchable
        label={t('search.to')}
        placeholder={t('trips.governorate_ph')}
        value={dropoff}
        options={govOptions}
        onChange={onDropoffChange}
      />
      <Select
        testID="search-date"
        label={t('search.date_optional')}
        placeholder={t('trips.day_ph')}
        value={day}
        options={dayOptions}
        onChange={onDayChange}
      />
      <GoodsFilters
        ouvert={filtresOuverts}
        onBasculer={() => setFiltresOuverts((o) => !o)}
        valeurs={filtres}
        onChange={onFiltresChange}
        erreur={erreurFiltres}
      />
      {error ? (
        <Txt testID="search-error" style={styles.error}>
          {error}
        </Txt>
      ) : null}
      <Button
        testID="search-submit"
        label={labelBouton ?? t('search.button')}
        onPress={submit}
        variant="cta"
        loading={loading}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  form: { gap: spacing.md },
  error: { color: colors.text.error, fontSize: fontSize.sm, fontWeight: '600' },
});
