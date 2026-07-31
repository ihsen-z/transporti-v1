import { Switch, Text, View } from 'react-native';
import { Controller, type Control } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { TextField } from '@/shared/ui/TextField';
import { colors } from '@/shared/theme';
import { publishStyles as s } from './publishStyles';
import type { PublishFormValues } from './publishSchema';

interface Props {
  control: Control<PublishFormValues>;
}

// Capacité, description libre et réservation immédiate (D11 : off par défaut).
export function DetailsSection({ control }: Props) {
  const { t } = useTranslation();

  return (
    <>
      <Controller
        control={control}
        name="capacity"
        render={({ field: { value, onChange, onBlur } }) => (
          <TextField
            label={t('trips.capacity')}
            placeholder={t('trips.capacity_ph')}
            value={value}
            onChangeText={onChange}
            onBlur={onBlur}
            autoCapitalize="sentences"
          />
        )}
      />
      <Controller
        control={control}
        name="description"
        render={({ field: { value, onChange, onBlur } }) => (
          <TextField
            label={t('trips.description')}
            placeholder={t('trips.description_ph')}
            value={value}
            onChangeText={onChange}
            onBlur={onBlur}
            autoCapitalize="sentences"
          />
        )}
      />

      {/* Réservation immédiate (D11 : off par défaut) */}
      <Controller
        control={control}
        name="instantBooking"
        render={({ field: { value, onChange } }) => (
          <View style={s.switchRow}>
            <View style={s.flex}>
              <Text style={s.switchLabel}>{t('trips.instant_booking')}</Text>
              <Text style={s.hint}>{t('trips.instant_booking_hint')}</Text>
            </View>
            <Switch
              value={value}
              onValueChange={onChange}
              trackColor={{ true: colors.brand[500], false: colors.neutral[200] }}
            />
          </View>
        )}
      />
    </>
  );
}
