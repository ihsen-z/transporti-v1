import { useMemo, useState } from 'react';
import { StyleSheet, Switch, Text, View } from 'react-native';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useTranslation } from 'react-i18next';
import { TextField } from '@/shared/ui/TextField';
import { Button } from '@/shared/ui/Button';
import { Select } from '@/shared/ui/Select';
import { colors, spacing, fontSize, radii } from '@/shared/theme';
import { GOVERNORATES, findGovernorate } from '../data/governorates';
import { nextDays, TIME_SLOTS, toScheduledTime } from '../data/schedule';
import { useEstimatePrice } from '../api/useEstimatePrice';
import { usePublishReturnTrip } from '../api/usePublishReturnTrip';

// Messages = clés i18n (traduites au rendu).
const schema = z
  .object({
    jobType: z.enum(['TRANSPORT', 'MOVING']),
    pickupGov: z.string().min(1, 'trips.errors.required'),
    pickupAddress: z.string().min(1, 'trips.errors.required'),
    dropoffGov: z.string().min(1, 'trips.errors.required'),
    dropoffAddress: z.string().min(1, 'trips.errors.required'),
    day: z.string().min(1, 'trips.errors.required'),
    time: z.string().min(1, 'trips.errors.required'),
    priceMin: z.string().regex(/^\d+(\.\d{1,2})?$/, 'trips.errors.price'),
    priceMax: z.string().regex(/^\d+(\.\d{1,2})?$/, 'trips.errors.price'),
    capacity: z.string(),
    description: z.string(),
    instantBooking: z.boolean(),
  })
  .refine((d) => Number(d.priceMax) >= Number(d.priceMin), {
    message: 'trips.errors.price_range',
    path: ['priceMax'],
  });

type FormValues = z.infer<typeof schema>;

export function PublishReturnForm() {
  const { t, i18n } = useTranslation();
  const estimate = useEstimatePrice();
  const publish = usePublishReturnTrip();
  const [routeHint, setRouteHint] = useState<string | null>(null);

  const {
    control,
    handleSubmit,
    getValues,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      jobType: 'TRANSPORT',
      pickupGov: '',
      pickupAddress: '',
      dropoffGov: '',
      dropoffAddress: '',
      day: '',
      time: '',
      priceMin: '',
      priceMax: '',
      capacity: '',
      description: '',
      instantBooking: false,
    },
  });

  // Options localisées (nom du gouvernorat selon la langue active).
  const isAr = i18n.language === 'ar';
  const govOptions = useMemo(
    () => GOVERNORATES.map((g) => ({ value: g.code, label: isAr ? g.nameAr : g.nameFr })),
    [isAr],
  );
  const jobTypeOptions = useMemo(
    () => [
      { value: 'TRANSPORT' as const, label: t('trips.job_type_transport') },
      { value: 'MOVING' as const, label: t('trips.job_type_moving') },
    ],
    [t],
  );
  const dayOptions = useMemo(() => nextDays(14), []);
  const timeOptions = useMemo(
    () => TIME_SLOTS.map((s) => ({ value: s, label: s })),
    [],
  );

  // Estimation serveur (D1 : affichage seulement, jamais de recalcul local).
  const onEstimate = () => {
    const { pickupGov, dropoffGov, jobType } = getValues();
    const p = findGovernorate(pickupGov);
    const d = findGovernorate(dropoffGov);
    if (!p || !d) {
      setRouteHint(t('trips.estimate.need_route'));
      return;
    }
    setRouteHint(null);
    estimate.mutate({
      pickup_lat: p.lat,
      pickup_lng: p.lng,
      dropoff_lat: d.lat,
      dropoff_lng: d.lng,
      job_type: jobType,
    });
  };

  const onSubmit = handleSubmit((values) => {
    const p = findGovernorate(values.pickupGov);
    const d = findGovernorate(values.dropoffGov);
    if (!p || !d) return; // garde-fou (valeurs issues du Select)
    publish.mutate({
      job_type: values.jobType,
      pickup_address: values.pickupAddress,
      pickup_governorate: p.code,
      pickup_lat: p.lat,
      pickup_lng: p.lng,
      dropoff_address: values.dropoffAddress,
      dropoff_governorate: d.code,
      dropoff_lat: d.lat,
      dropoff_lng: d.lng,
      scheduled_time: toScheduledTime(values.day, values.time),
      description: values.description,
      price_tnd_min: Number(values.priceMin),
      price_tnd_max: Number(values.priceMax),
      available_capacity: values.capacity,
      instant_booking: values.instantBooking,
    });
  });

  // Bandeau de résultat d'estimation (fourchette serveur).
  const estimateResult =
    estimate.data && !estimate.data.error
      ? t('trips.estimate.result', {
          min: estimate.data.min,
          max: estimate.data.max,
          distance: estimate.data.distance_km,
        })
      : null;

  const publishError = publish.error
    ? t(`trips.errors.${publish.error.kind === 'validation' ? 'validation' : publish.error.kind === 'forbidden' ? 'forbidden' : 'network'}`)
    : null;

  // Succès : message + nombre de demandes ouvertes sur le corridor.
  if (publish.isSuccess) {
    return (
      <View style={styles.successBox}>
        <Text style={styles.successText}>
          {t('trips.success', { count: publish.data.matching_requests_count })}
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.form}>
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
      <Text style={styles.section}>{t('trips.pickup')}</Text>
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
      <Text style={styles.section}>{t('trips.dropoff')}</Text>
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

      {/* Date */}
      <Text style={styles.section}>{t('trips.day')}</Text>
      <View style={styles.rowGap}>
        <View style={styles.flex}>
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
        <View style={styles.flex}>
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
        loading={estimate.isPending}
      />
      {estimateResult ? <Text style={styles.estimate}>{estimateResult}</Text> : null}
      <Text style={styles.hint}>
        {routeHint ?? t('trips.estimate.hint')}
      </Text>

      {/* Prix */}
      <View style={styles.rowGap}>
        <View style={styles.flex}>
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
        <View style={styles.flex}>
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

      {/* Capacité + description */}
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
          <View style={styles.switchRow}>
            <View style={styles.flex}>
              <Text style={styles.switchLabel}>{t('trips.instant_booking')}</Text>
              <Text style={styles.hint}>{t('trips.instant_booking_hint')}</Text>
            </View>
            <Switch
              value={value}
              onValueChange={onChange}
              trackColor={{ true: colors.brand[500], false: colors.neutral[200] }}
            />
          </View>
        )}
      />

      {publishError ? <Text style={styles.error}>{publishError}</Text> : null}

      <Button
        label={publish.isPending ? t('trips.publish.submitting') : t('trips.publish.submit')}
        onPress={onSubmit}
        variant="cta"
        loading={publish.isPending}
        style={styles.submit}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  form: { gap: spacing.lg },
  section: {
    fontSize: fontSize.md,
    fontWeight: '800',
    color: colors.brand[600],
    marginTop: spacing.sm,
  },
  rowGap: { flexDirection: 'row', gap: spacing.md },
  flex: { flex: 1 },
  estimate: {
    fontSize: fontSize.md,
    fontWeight: '800',
    color: colors.green[700],
  },
  hint: { fontSize: fontSize.sm, color: colors.neutral[500] },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginTop: spacing.sm,
  },
  switchLabel: {
    fontSize: fontSize.md,
    fontWeight: '600',
    color: colors.neutral[700],
  },
  error: { color: colors.error, fontSize: fontSize.sm, fontWeight: '600' },
  submit: { marginTop: spacing.sm },
  successBox: {
    backgroundColor: colors.brand[50],
    borderRadius: radii.lg,
    padding: spacing.xl,
    gap: spacing.sm,
  },
  successText: {
    fontSize: fontSize.lg,
    fontWeight: '800',
    color: colors.green[700],
    textAlign: 'center',
  },
});
