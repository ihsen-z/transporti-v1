import { Controller, type Control, type FieldErrors } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { Txt } from '@/shared/ui/Txt';
import { TextField } from '@/shared/ui/TextField';
import { Select } from '@/shared/ui/Select';
import { requestStyles as s } from './requestStyles';
import type { RequestFormValues, RequestOption } from './requestSchema';
import type { SendRequestField } from '../../api/requestError';

interface Props {
  control: Control<RequestFormValues>;
  errors: FieldErrors<RequestFormValues>;
  methodOptions: RequestOption[];
  erreurServeurChamp: (champ: SendRequestField) => string | undefined;
}

// Le prix proposé et le mode de paiement : la partie sur laquelle se conclut
// l'accord. Le plafond du paiement à la livraison (300 TND) est une règle
// serveur — son refus arrive avec le seuil exact, et on affiche ce texte-là.
export function PriceSection({ control, errors, methodOptions, erreurServeurChamp }: Props) {
  const { t } = useTranslation();

  return (
    <>
      <Txt style={s.section}>{t('search.request.price_title')}</Txt>

      <Controller
        control={control}
        name="price"
        render={({ field: { value, onChange, onBlur } }) => (
          <TextField
            testID="send-request-price"
            label={t('search.request.price_label')}
            placeholder={t('search.request.price_ph')}
            value={value}
            onChangeText={onChange}
            onBlur={onBlur}
            keyboardType="numeric"
            error={
              errors.price
                ? t(errors.price.message ?? '')
                : erreurServeurChamp('proposed_price')
            }
          />
        )}
      />

      <Controller
        control={control}
        name="method"
        render={({ field: { value, onChange } }) => (
          <Select
            testID="send-request-method"
            label={t('search.request.method')}
            placeholder={t('search.request.method')}
            value={value}
            options={methodOptions}
            onChange={onChange}
            error={erreurServeurChamp('payment_method')}
          />
        )}
      />
    </>
  );
}
