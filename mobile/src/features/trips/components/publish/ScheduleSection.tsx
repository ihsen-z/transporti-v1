import { Text, View } from 'react-native';
import { Controller, type Control, type FieldErrors } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { TextField } from '@/shared/ui/TextField';
import { Button } from '@/shared/ui/Button';
import { Select } from '@/shared/ui/Select';
import { publishStyles as s } from './publishStyles';
import type { FormOption, PublishFormValues } from './publishSchema';

interface Props {
  control: Control<PublishFormValues>;
  errors: FieldErrors<PublishFormValues>;
  dayOptions: FormOption[];
  timeOptions: FormOption[];
  onEstimate: () => void;
  estimatePending: boolean;
  estimateResult: string | null;
  routeHint: string | null;
}

// Date/heure + estimation serveur (guidance) + fourchette de prix.
export function ScheduleSection({
  control,
  errors,
  dayOptions,
  timeOptions,
  onEstimate,
  estimatePending,
  estimateResult,
  routeHint,
}: Props) {
  const { t } = useTranslation();

  return (
    <>
      {/* Date */}
      <Text style={s.section}>{t('trips.day')}</Text>
      <View style={s.rowGap}>
        <View style={s.flex}>
          <Controller
            control={control}
            name="day"
            render={({ field: { value, onChange } }) => (
              <Select
                label={t('trips.day')}
                placeholder={t('trips.day_ph')}
                value={value || null}
                options={dayOptions}
                onChange={onChange}
                error={errors.day ? t(errors.day.message ?? '') : undefined}
              />
            )}
          />
        </View>
        <View style={s.flex}>
          <Controller
            control={control}
            name="time"
            render={({ field: { value, onChange } }) => (
              <Select
                label={t('trips.time')}
                placeholder={t('trips.time_ph')}
                value={value || null}
                options={timeOptions}
                onChange={onChange}
                error={errors.time ? t(errors.time.message ?? '') : undefined}
              />
            )}
          />
        </View>
      </View>

      {/* Estimation serveur (guidance) */}
      <Button
        label={t('trips.estimate.button')}
        onPress={onEstimate}
        variant="primary"
        loading={estimatePending}
      />
      {estimateResult ? <Text style={s.estimate}>{estimateResult}</Text> : null}
      <Text style={s.hint}>{routeHint ?? t('trips.estimate.hint')}</Text>

      {/* Prix */}
      <View style={s.rowGap}>
        <View style={s.flex}>
          <Controller
            control={control}
            name="priceMin"
            render={({ field: { value, onChange, onBlur } }) => (
              <TextField
                label={t('trips.price_min')}
                placeholder={t('trips.price_ph')}
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                error={errors.priceMin ? t(errors.priceMin.message ?? '') : undefined}
                keyboardType="numeric"
              />
            )}
          />
        </View>
        <View style={s.flex}>
          <Controller
            control={control}
            name="priceMax"
            render={({ field: { value, onChange, onBlur } }) => (
              <TextField
                label={t('trips.price_max')}
                placeholder={t('trips.price_ph')}
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                error={errors.priceMax ? t(errors.priceMax.message ?? '') : undefined}
                keyboardType="numeric"
              />
            )}
          />
        </View>
      </View>
    </>
  );
}
