import { View } from 'react-native';
import { Controller, type Control, type FieldErrors } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { Txt } from '@/shared/ui/Txt';
import { TextField } from '@/shared/ui/TextField';
import { Select } from '@/shared/ui/Select';
import { formatAmount } from '@/shared/format/money';
import { requestStyles as s } from './requestStyles';
import type { RequestFormValues, RequestOption } from './requestSchema';
import type { SendRequestField } from '../../api/requestError';

interface Props {
  control: Control<RequestFormValues>;
  errors: FieldErrors<RequestFormValues>;
  goodsOptions: RequestOption[];
  /** Capacité annoncée par CE trajet, telle que servie par le serveur. */
  capaciteKg: string | null;
  capaciteM3: string | null;
  erreurServeurChamp: (champ: SendRequestField) => string | undefined;
}

// Ce que la cliente expédie : nature, poids, volume, description.
//
// C'est le cœur du lot 6.1. Avant lui, `description` en texte libre portait
// seule toute l'information, et la capacité structurée annoncée par le
// transporteur n'était comparée à rien.
export function GoodsSection({
  control,
  errors,
  goodsOptions,
  capaciteKg,
  capaciteM3,
  erreurServeurChamp,
}: Props) {
  const { t } = useTranslation();

  return (
    <>
      <Txt style={s.section}>{t('search.request.goods_title')}</Txt>

      <Controller
        control={control}
        name="goodsType"
        render={({ field: { value, onChange } }) => (
          <Select
            testID="send-request-goods-type"
            label={t('search.request.goods_type')}
            placeholder={t('search.request.goods_type')}
            value={value}
            options={goodsOptions}
            onChange={onChange}
          />
        )}
      />

      <View style={s.rowGap}>
        <View style={s.flex}>
          <Controller
            control={control}
            name="weightKg"
            render={({ field: { value, onChange, onBlur } }) => (
              <TextField
                testID="send-request-weight"
                label={t('search.request.weight')}
                placeholder={t('search.request.weight_ph')}
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                keyboardType="numeric"
                error={
                  errors.weightKg
                    ? t(errors.weightKg.message ?? '')
                    : erreurServeurChamp('weight_kg')
                }
              />
            )}
          />
        </View>
        <View style={s.flex}>
          <Controller
            control={control}
            name="volumeM3"
            render={({ field: { value, onChange, onBlur } }) => (
              <TextField
                testID="send-request-volume"
                label={t('search.request.volume')}
                placeholder={t('search.request.volume_ph')}
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                keyboardType="numeric"
                error={
                  errors.volumeM3
                    ? t(errors.volumeM3.message ?? '')
                    : erreurServeurChamp('volume_m3')
                }
              />
            )}
          />
        </View>
      </View>

      {/* Dire à quoi le poids sera confronté AVANT l'envoi : le serveur refuse
          au-delà de la capacité annoncée, et découvrir la limite par un refus
          coûte un aller-retour pour rien. Affiché seulement si le transporteur
          l'a réellement déclarée — jamais un chiffre inventé. */}
      {capaciteKg || capaciteM3 ? (
        <Txt testID="send-request-capacity-hint" style={s.hint}>
          {t('search.request.capacity_hint', {
            // DRF sérialise les Decimal bruts (« 2000.0 », « 8.00 ») : affichés
            // tels quels, ils se lisaient « 2000.0 kg et 8.00 m³ ». Relevé sur
            // appareil le 04/09.
            poids: capaciteKg ? formatAmount(Number(capaciteKg)) : '—',
            volume: capaciteM3 ? formatAmount(Number(capaciteM3)) : '—',
          })}
        </Txt>
      ) : null}

      <Controller
        control={control}
        name="description"
        render={({ field: { value, onChange, onBlur } }) => (
          <TextField
            testID="send-request-description"
            label={t('search.request.description')}
            placeholder={t('search.request.description_ph')}
            value={value}
            onChangeText={onChange}
            onBlur={onBlur}
            autoCapitalize="sentences"
            error={
              errors.description
                ? t(errors.description.message ?? '')
                : erreurServeurChamp('description')
            }
          />
        )}
      />
    </>
  );
}
