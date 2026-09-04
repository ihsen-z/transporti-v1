import { useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Select } from '@/shared/ui/Select';
import { Button } from '@/shared/ui/Button';
import { colors, spacing, fontSize } from '@/shared/theme';
import { GOVERNORATES } from '@/features/trips/data/governorates';
import { nextDays } from '@/features/trips/data/schedule';
import type { MatchParams } from '../api/dto';

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
}

export function SearchForm({ onSearch, loading, day, onDayChange }: Props) {
  const { t, i18n } = useTranslation();
  const isAr = i18n.language === 'ar';
  const [pickup, setPickup] = useState<string | null>(null);
  const [dropoff, setDropoff] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const govOptions = useMemo(
    () => GOVERNORATES.map((g) => ({ value: g.code, label: isAr ? g.nameAr : g.nameFr })),
    [isAr],
  );
  const dayOptions = useMemo(() => nextDays(14), []);

  const submit = () => {
    if (!pickup || !dropoff) {
      setError(t('search.errors.route_required'));
      return;
    }
    if (pickup === dropoff) {
      setError(t('search.errors.same'));
      return;
    }
    setError(null);
    onSearch({
      pickup_governorate: pickup,
      dropoff_governorate: dropoff,
      date: day ?? undefined,
    });
  };

  return (
    <View style={styles.form}>
      <Select
        testID="search-from"
        label={t('search.from')}
        placeholder={t('trips.governorate_ph')}
        value={pickup}
        options={govOptions}
        onChange={setPickup}
      />
      <Select
        testID="search-to"
        label={t('search.to')}
        placeholder={t('trips.governorate_ph')}
        value={dropoff}
        options={govOptions}
        onChange={setDropoff}
      />
      <Select
        testID="search-date"
        label={t('search.date_optional')}
        placeholder={t('trips.day_ph')}
        value={day}
        options={dayOptions}
        onChange={onDayChange}
      />
      {error ? (
        <Text testID="search-error" style={styles.error}>
          {error}
        </Text>
      ) : null}
      <Button
        testID="search-submit"
        label={t('search.button')}
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
