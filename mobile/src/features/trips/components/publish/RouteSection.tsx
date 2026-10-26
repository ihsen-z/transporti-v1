import { Controller, type Control, type FieldErrors } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { TextField } from '@/shared/ui/TextField';
import { Select } from '@/shared/ui/Select';
import { publishStyles as s } from './publishStyles';
import type { FormOption, PublishFormValues } from './publishSchema';
import { SavedAddressPicker } from '@/features/addresses/components/SavedAddressPicker';
import { Txt } from '@/shared/ui/Txt';

interface Props {
  control: Control<PublishFormValues>;
  errors: FieldErrors<PublishFormValues>;
  jobTypeOptions: FormOption[];
  govOptions: FormOption[];
  /**
   * C5.9 — remplit gouvernorat ET adresse depuis le carnet. Les deux ensemble,
   * jamais l'un sans l'autre : un gouvernorat incohérent avec l'adresse
   * affichée ferait porter l'estimation de prix sur le mauvais corridor, sans
   * aucun signal.
   */
  onChoisirAdresse: (
    cible: 'pickup' | 'dropoff',
    valeurs: { gouvernorat: string; adresse: string },
  ) => void;
}

// Type de trajet + gouvernorat/adresse de départ et d'arrivée.
export function RouteSection({
  control,
  errors,
  jobTypeOptions,
  govOptions,
  onChoisirAdresse,
}: Props) {
  const { t } = useTranslation();

  return (
    <>
      {/* Type de trajet */}
      <Controller
        control={control}
        name="jobType"
        render={({ field: { value, onChange } }) => (
          <Select
            testID="publish-jobType"
            label={t('trips.job_type')}
            placeholder={t('trips.job_type')}
            value={value}
            options={jobTypeOptions}
            onChange={onChange}
          />
        )}
      />

      {/* Départ */}
      <Txt style={s.section}>{t('trips.pickup')}</Txt>
      <Txt style={s.hint}>{t('trips.address_hint')}</Txt>
      <SavedAddressPicker
        cible="pickup"
        onChoisir={(a) =>
          onChoisirAdresse('pickup', {
            gouvernorat: a.governorate,
            adresse: a.address,
          })
        }
      />
      <Controller
        control={control}
        name="pickupGov"
        render={({ field: { value, onChange } }) => (
          <Select
            testID="publish-pickupGov"
            searchable
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
            testID="publish-pickupAddress"
            label={t('trips.address_optional')}
            placeholder={t('trips.address_ph')}
            value={value}
            onChangeText={onChange}
            onBlur={onBlur}
            error={
              errors.pickupAddress ? t(errors.pickupAddress.message ?? '') : undefined
            }
            autoCapitalize="sentences"
          />
        )}
      />

      {/* Arrivée */}
      <Txt style={s.section}>{t('trips.dropoff')}</Txt>
      <SavedAddressPicker
        cible="dropoff"
        onChoisir={(a) =>
          onChoisirAdresse('dropoff', {
            gouvernorat: a.governorate,
            adresse: a.address,
          })
        }
      />
      <Controller
        control={control}
        name="dropoffGov"
        render={({ field: { value, onChange } }) => (
          <Select
            testID="publish-dropoffGov"
            searchable
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
            testID="publish-dropoffAddress"
            label={t('trips.address_optional')}
            placeholder={t('trips.address_ph')}
            value={value}
            onChangeText={onChange}
            onBlur={onBlur}
            error={
              errors.dropoffAddress ? t(errors.dropoffAddress.message ?? '') : undefined
            }
            autoCapitalize="sentences"
          />
        )}
      />
    </>
  );
}
