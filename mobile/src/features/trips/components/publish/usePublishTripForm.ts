import { useCallback, useEffect, useMemo, useState } from 'react';
import { useLocalSearchParams } from 'expo-router';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslation } from 'react-i18next';
import {
  GOVERNORATES,
  findGovernorate,
  resolveGovernorateCode,
} from '../../data/governorates';
import { nextDays, TIME_SLOTS, toScheduledTime } from '../../data/schedule';
import { useEstimatePrice } from '../../api/useEstimatePrice';
import { usePublishReturnTrip } from '../../api/usePublishReturnTrip';
import { publishSchema, type FormOption, type PublishFormValues } from './publishSchema';
import {
  useVehiclePrefill,
  capaciteStructuree,
  libelleCapacite,
  type PartCapacite,
} from './useVehiclePrefill';

// Logique du formulaire de publication : orchestration RHF, options localisées,
// estimation serveur (D1 : affichage seulement) et soumission. Séparée de la
// présentation pour garder les composants d'affichage minces.
export function usePublishTripForm() {
  const { t, i18n } = useTranslation();
  const estimate = useEstimatePrice();
  const publish = usePublishReturnTrip();
  const [routeHint, setRouteHint] = useState<string | null>(null);

  // T1.2 — le véhicule vient du profil et n'est jamais ressaisi.
  const { vehicule } = useVehiclePrefill();
  const [partCapacite, setPartCapacite] = useState<PartCapacite>(null);

  // T4.4 — itinéraire transmis par l'amorce de fin de mission, déjà inversé.
  // Sans cette reprise, l'amorce ne ferait que déplacer la saisie ailleurs.
  const params = useLocalSearchParams<{
    depuis?: string;
    vers?: string;
    quand?: string;
  }>();

  const {
    control,
    handleSubmit,
    getValues,
    setValue,
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

  // Applique l'itinéraire de l'amorce (T4.4). Les valeurs viennent du serveur
  // en texte libre : elles passent par `resolveGovernorateCode`, qui tolère la
  // casse et les accents. Une valeur inconnue est ignorée plutôt que devinée.
  useEffect(() => {
    const depuis = resolveGovernorateCode(params.depuis);
    const vers = resolveGovernorateCode(params.vers);
    if (depuis) setValue('pickupGov', depuis, { shouldValidate: true });
    if (vers) setValue('dropoffGov', vers, { shouldValidate: true });
    if (params.quand === 'aujourdhui') {
      const aujourdhui = nextDays(1)[0];
      if (aujourdhui) setValue('day', aujourdhui.value, { shouldValidate: true });
    }
  }, [params.depuis, params.vers, params.quand, setValue]);

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

  // Estimation serveur (D1 : le montant vient du serveur, jamais d'un recalcul
  // local). Lot 7.3 — son resultat PREREMPLIT desormais les deux prix au lieu
  // de se contenter de s'afficher. C'etaient deux entrees clavier sur cinq, sur
  // un formulaire qui doit tenir en moins de quatre saisies : la valeur etait
  // sous les yeux du transporteur et il devait la recopier.
  const onEstimate = () => {
    const { pickupGov, dropoffGov, jobType } = getValues();
    const p = findGovernorate(pickupGov);
    const d = findGovernorate(dropoffGov);
    if (!p || !d) {
      setRouteHint(t('trips.estimate.need_route'));
      return;
    }
    setRouteHint(null);
    estimate.mutate(
      {
        pickup_lat: p.lat,
        pickup_lng: p.lng,
        dropoff_lat: d.lat,
        dropoff_lng: d.lng,
        job_type: jobType,
      },
      {
        onSuccess: (reponse) => {
          // Le serveur peut repondre en erreur metier (grille indisponible)
          // avec un 200 : on ne prerempli alors rien plutot que d'ecrire un
          // faux prix dans le formulaire.
          if (reponse.error) return;
          // Les prix restent MODIFIABLES : l'estimation est une proposition,
          // pas une decision. Le transporteur connait son trajet mieux que la
          // grille.
          setValue('priceMin', String(reponse.min), { shouldValidate: true });
          setValue('priceMax', String(reponse.max), { shouldValidate: true });
        },
      },
    );
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
      // B-2 — capacité structurée, en plus du libellé texte. Omise quand elle
      // n'est pas réellement connue : on n'invente jamais un chiffre.
      ...capaciteStructuree(vehicule, partCapacite),
      instant_booking: values.instantBooking,
    });
  });

  // Choix tactile de la part de capacité : évite au transporteur de calculer un
  // tonnage restant de tête. Une saisie libre reprend la main (voir
  // `onCapaciteLibre`), faute de savoir lire un texte arbitraire.
  const onChoisirPart = (part: Exclude<PartCapacite, null>) => {
    setPartCapacite(part);
    setValue('capacity', libelleCapacite(vehicule, part), {
      shouldValidate: true,
    });
  };

  const onCapaciteLibre = () => setPartCapacite(null);

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

  // C5.9 — remplissage depuis le carnet d'adresses. Le hook expose un
  // GESTIONNAIRE plutot que `setValue` brut : la section de route n'a pas a
  // connaitre les noms des champs du formulaire, et les deux champs sont
  // toujours poses ensemble.
  //
  // `shouldValidate` : sans lui, une erreur de validation affichee avant le
  // choix resterait a l'ecran alors que le champ est desormais rempli.
  const onChoisirAdresse = useCallback(
    (
      cible: 'pickup' | 'dropoff',
      valeurs: { gouvernorat: string; adresse: string },
    ) => {
      if (cible === 'pickup') {
        setValue('pickupGov', valeurs.gouvernorat, { shouldValidate: true });
        setValue('pickupAddress', valeurs.adresse, { shouldValidate: true });
      } else {
        setValue('dropoffGov', valeurs.gouvernorat, { shouldValidate: true });
        setValue('dropoffAddress', valeurs.adresse, { shouldValidate: true });
      }
    },
    [setValue],
  );

  return {
    control,
    errors,
    onChoisirAdresse,
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
    // T1.2 — pré-remplissage et choix tactile de la capacité.
    vehicule,
    partCapacite,
    onChoisirPart,
    onCapaciteLibre,
  };
}
