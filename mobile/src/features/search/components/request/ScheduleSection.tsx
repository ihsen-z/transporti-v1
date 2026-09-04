import { View } from 'react-native';
import { Controller, type Control, type FieldErrors } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { Txt } from '@/shared/ui/Txt';
import { Select } from '@/shared/ui/Select';
import { requestStyles as s } from './requestStyles';
import type { RequestFormValues, RequestOption } from './requestSchema';
import type { DayOption } from '@/features/trips/data/schedule';
import type { SendRequestField } from '../../api/requestError';

interface Props {
  control: Control<RequestFormValues>;
  errors: FieldErrors<RequestFormValues>;
  dayOptions: DayOption[];
  timeOptions: RequestOption[];
  erreurServeurChamp: (champ: SendRequestField) => string | undefined;
}

// Quand la marchandise est disponible chez la cliente.
//
// Trois sélecteurs plutôt qu'un sélecteur de date natif : le formulaire de
// publication utilise déjà ce motif (`nextDays` + `TIME_SLOTS`), et il évite
// une dépendance de date-picker que le projet a explicitement différée.
export function ScheduleSection({
  control,
  errors,
  dayOptions,
  timeOptions,
  erreurServeurChamp,
}: Props) {
  const { t } = useTranslation();

  return (
    <>
      <Txt style={s.section}>{t('search.request.slot_title')}</Txt>
      <Txt style={s.hint}>{t('search.request.slot_hint')}</Txt>

      <Controller
        control={control}
        name="day"
        render={({ field: { value, onChange } }) => (
          <Select
            testID="send-request-day"
            label={t('search.request.day')}
            placeholder={t('search.request.day_ph')}
            value={value || null}
            options={dayOptions}
            onChange={onChange}
          />
        )}
      />

      <View style={s.rowGap}>
        <View style={s.flex}>
          <Controller
            control={control}
            name="fromTime"
            render={({ field: { value, onChange } }) => (
              <Select
                testID="send-request-from"
                label={t('search.request.from')}
                placeholder={t('search.request.time_ph')}
                value={value || null}
                options={timeOptions}
                onChange={onChange}
                error={errors.fromTime ? t(errors.fromTime.message ?? '') : undefined}
              />
            )}
          />
        </View>
        <View style={s.flex}>
          <Controller
            control={control}
            name="untilTime"
            render={({ field: { value, onChange } }) => (
              <Select
                testID="send-request-until"
                label={t('search.request.until')}
                placeholder={t('search.request.time_ph')}
                value={value || null}
                options={timeOptions}
                onChange={onChange}
                error={
                  errors.untilTime
                    ? t(errors.untilTime.message ?? '')
                    : erreurServeurChamp('pickup_until')
                }
              />
            )}
          />
        </View>
      </View>
    </>
  );
}
