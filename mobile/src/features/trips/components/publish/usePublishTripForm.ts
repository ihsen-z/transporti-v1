import { useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslation } from 'react-i18next';
import { GOVERNORATES, findGovernorate } from '../../data/governorates';
import { nextDays, TIME_SLOTS, toScheduledTime } from '../../data/schedule';
import { useEstimatePrice } from '../../api/useEstimatePrice';
import { usePublishReturnTrip } from '../../api/usePublishReturnTrip';
import { publishSchema, type FormOption, type PublishFormValues } from './publishSchema';

// Logique du formulaire de publication : orchestration RHF, options localisées,
// estimation serveur (D1 : affichage seulement) et soumission. Séparée de la
// présentation pour garder les composants d'affichage minces.
export function usePublishTripForm() {
  const { t, i18n } = useTranslation();
  const estimate = useEstimatePrice();
  const publish = usePublishReturnTrip();
  const [routeHint, setRouteHint] = useState<string | null>(null);

  const {
    control,
    handleSubmit,
    getValues,
    formState: { errors },
  } = useForm<PublishFormValues>({
    resolver: zodResolver(publishSchema),
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
  const govOptions = useMemo<FormOption[]>(
    () => GOVERNORATES.map((g) => ({ value: g.code, label: isAr ? g.nameAr : g.nameFr })),
    [isAr],
  );
  const jobTypeOptions = useMemo<FormOption[]>(
    () => [
      { value: 'TRANSPORT', label: t('trips.job_type_transport') },
      { value: 'MOVING', label: t('trips.job_type_moving') },
    ],
    [t],
  );
  const dayOptions = useMemo(() => nextDays(14), []);
  const timeOptions = useMemo<FormOption[]>(
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

  return {
    control,
    errors,
    jobTypeOptions,
    govOptions,
    dayOptions,
    timeOptions,
    onEstimate,
    estimatePending: estimate.isPending,
    estimateResult,
    routeHint,
    onSubmit,
    publishPending: publish.isPending,
    publishError,
    isSuccess: publish.isSuccess,
    successCount: publish.data?.matching_requests_count ?? 0,
  };
}
