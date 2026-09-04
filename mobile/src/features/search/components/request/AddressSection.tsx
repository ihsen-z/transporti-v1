import { Controller, type Control, type FieldErrors, type UseFormSetValue } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { Txt } from '@/shared/ui/Txt';
import { TextField } from '@/shared/ui/TextField';
import { Select } from '@/shared/ui/Select';
import { SavedAddressPicker } from '@/features/addresses/components/SavedAddressPicker';
import { requestStyles as s } from './requestStyles';
import type { RequestFormValues, RequestOption } from './requestSchema';

interface Props {
  control: Control<RequestFormValues>;
  errors: FieldErrors<RequestFormValues>;
  govOptions: RequestOption[];
  setValue: UseFormSetValue<RequestFormValues>;
}

// Où le transporteur vient chercher la marchandise.
//
// Le carnet d'adresses (`SavedAddressPicker`) existait depuis longtemps et
// n'était utilisé que par le formulaire de publication, côté transporteur —
// donc jamais là où il sert à la cliente (E-16). C'est le lot 6.2, livré ici
// parce que la demande structurée est précisément l'endroit où il vaut.
export function AddressSection({ control, errors, govOptions, setValue }: Props) {
  const { t } = useTranslation();

  return (
    <>
      <Txt style={s.section}>{t('search.request.pickup_title')}</Txt>
      <Txt style={s.hint}>{t('search.request.pickup_hint')}</Txt>

      {/* Gouvernorat ET adresse posés ensemble, jamais l'un sans l'autre :
          un gouvernorat incohérent avec l'adresse affichée enverrait le
          transporteur au mauvais endroit sans aucun signal. Même règle que
          `onChoisirAdresse` côté publication. */}
      <SavedAddressPicker
        cible="demande"
        onChoisir={(adresse) => {
          setValue('pickupGov', adresse.governorate, { shouldValidate: true });
          setValue('pickupAddress', adresse.address, { shouldValidate: true });
        }}
      />

      <Controller
        control={control}
        name="pickupGov"
        render={({ field: { value, onChange } }) => (
          <Select
            testID="send-request-pickup-gov"
            label={t('search.request.governorate')}
            placeholder={t('search.request.governorate_ph')}
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
            testID="send-request-pickup-address"
            label={t('search.request.address')}
            placeholder={t('search.request.address_ph')}
            value={value}
            onChangeText={onChange}
            onBlur={onBlur}
            autoCapitalize="sentences"
            error={errors.pickupAddress ? t(errors.pickupAddress.message ?? '') : undefined}
          />
        )}
      />
    </>
  );
}
