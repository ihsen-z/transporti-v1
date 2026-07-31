import { Text } from 'react-native';
import { Controller, type Control, type FieldErrors } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { TextField } from '@/shared/ui/TextField';
import { Select } from '@/shared/ui/Select';
import { publishStyles as s } from './publishStyles';
import type { FormOption, PublishFormValues } from './publishSchema';

interface Props {
  control: Control<PublishFormValues>;
  errors: FieldErrors<PublishFormValues>;
  jobTypeOptions: FormOption[];
  govOptions: FormOption[];
}

// Type de trajet + gouvernorat/adresse de départ et d'arrivée.
export function RouteSection({ control, errors, jobTypeOptions, govOptions }: Props) {
  const { t } = useTranslation();

  return (
    <>
      {/* Type de trajet */}
      <Controller
        control={control}
        name="jobType"
        render={({ field: { value, onChange } }) => (
          <Select
            label={t('trips.job_type')}
            placeholder={t('trips.job_type')}
            value={value}
            options={jobTypeOptions}
            onChange={onChange}
          />
        )}
      />

      {/* Départ */}
      <Text style={s.section}>{t('trips.pickup')}</Text>
      <Controller
        control={control}
        name="pickupGov"
        render={({ field: { value, onChange } }) => (
          <Select
            label={t('trips.governorate')}
            placeholder={t('trips.governorate_ph')}
            value={value || null}
            options={govOptions}
            onChange={onChange}
            error={errors.pickupGov ? t(errors.pickupGov.message ?? '') : undefined}
          />
        )}
      />
      <Controller
        control={control}
        name="pickupAddress"
        render={({ field: { value, onChange, onBlur } }) => (
          <TextField
            label={t('trips.address')}
            placeholder={t('trips.address_ph')}
            value={value}
            onChangeText={onChange}
            onBlur={onBlur}
            error={errors.pickupAddress ? t(errors.pickupAddress.message ?? '') : undefined}
            autoCapitalize="sentences"
          />
        )}
      />

      {/* Arrivée */}
      <Text style={s.section}>{t('trips.dropoff')}</Text>
      <Controller
        control={control}
        name="dropoffGov"
        render={({ field: { value, onChange } }) => (
          <Select
            label={t('trips.governorate')}
            placeholder={t('trips.governorate_ph')}
            value={value || null}
            options={govOptions}
            onChange={onChange}
            error={errors.dropoffGov ? t(errors.dropoffGov.message ?? '') : undefined}
          />
        )}
      />
      <Controller
        control={control}
        name="dropoffAddress"
        render={({ field: { value, onChange, onBlur } }) => (
          <TextField
            label={t('trips.address')}
            placeholder={t('trips.address_ph')}
            value={value}
            onChangeText={onChange}
            onBlur={onBlur}
            error={errors.dropoffAddress ? t(errors.dropoffAddress.message ?? '') : undefined}
            autoCapitalize="sentences"
          />
        )}
      />
    </>
  );
}
