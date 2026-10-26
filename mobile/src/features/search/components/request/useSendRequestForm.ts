import { useCallback, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslation } from 'react-i18next';
import * as ImagePicker from 'expo-image-picker';
import { GOVERNORATES } from '@/features/trips/data/governorates';
import { nextDays, TIME_SLOTS, toScheduledTime } from '@/features/trips/data/schedule';
import { useSendTripRequest } from '../../api/useSendTripRequest';
import {
  PhotoUploadError,
  useUploadPhoto,
  type PhotoAsset,
} from '@/core/api/usePhotoUpload';
import { PREFERER_MESSAGE_SERVEUR, type SendRequestField } from '../../api/requestError';
import type { SendRequestBody, TripResultDto } from '../../api/dto';
import {
  MAX_PHOTOS,
  requestSchema,
  type RequestFormValues,
  type RequestOption,
} from './requestSchema';
import { usePaymentConfig } from '@/features/payments/api/usePaymentConfig';
import { paymentOptions } from './paymentOptions';

// Toute la logique de la demande cliente. La feuille ne fait que composer.

const VALEURS_INITIALES: RequestFormValues = {
  goodsType: 'TRANSPORT',
  weightKg: '',
  volumeM3: '',
  description: '',
  pickupGov: '',
  pickupAddress: '',
  day: '',
  fromTime: '',
  untilTime: '',
  price: '',
  // Espèces par défaut : c'est le mode de paiement du lancement (indispensable
  // sur le marché tunisien), et le paiement en ligne n'est pas encore ouvert.
  // Avec « Digital » par défaut, vu en recette le 25/10, une cliente qui ne
  // touchait à rien envoyait une demande qu'elle ne pourrait pas payer.
  method: 'COD',
};

// Champs dont l'erreur s'affiche SOUS le champ, là où se trouve la correction.
// `payment_method` en fait désormais partie : `Select` porte un emplacement
// d'erreur (prop `error`), contrairement à ce qu'affirmait le commentaire
// précédent — son refus n'a plus besoin de partir dans le message général.
const CHAMPS_INLINE: readonly SendRequestField[] = [
  'description',
  'weight_kg',
  'volume_m3',
  'pickup_until',
  'proposed_price',
  'payment_method',
];

export function useSendRequestForm(trip: TripResultDto | null, onClose: () => void) {
  const { t, i18n } = useTranslation();
  const send = useSendTripRequest();
  const upload = useUploadPhoto();

  // URLs rendues par `upload/photo/`, jamais des URI locales : une `file://`
  // ne veut rien dire sur l'appareil du transporteur.
  const [photos, setPhotos] = useState<string[]>([]);
  const [photoError, setPhotoError] = useState<string | null>(null);

  const {
    control,
    handleSubmit,
    reset,
    setValue,
    formState: { errors },
  } = useForm<RequestFormValues>({
    resolver: zodResolver(requestSchema),
    defaultValues: VALEURS_INITIALES,
  });

  const isAr = i18n.language === 'ar';
  const govOptions = useMemo<RequestOption[]>(
    () => GOVERNORATES.map((g) => ({ value: g.code, label: isAr ? g.nameAr : g.nameFr })),
    [isAr],
  );
  const goodsOptions = useMemo<RequestOption[]>(
    () => [
      { value: 'TRANSPORT', label: t('search.request.goods_transport') },
      { value: 'MOVING', label: t('search.request.goods_moving') },
      { value: 'DELIVERY', label: t('search.request.goods_delivery') },
    ],
    [t],
  );
  const dayOptions = useMemo(() => nextDays(14), []);
  const timeOptions = useMemo<RequestOption[]>(
    () => TIME_SLOTS.map((s) => ({ value: s, label: s })),
    [],
  );
  // Plafond espèces et mode « espèces seules » lus sur le serveur.
  const paymentConfig = usePaymentConfig();
  const methodOptions = useMemo<RequestOption[]>(
    () => paymentOptions(paymentConfig, t),
    [t, paymentConfig],
  );

  /**
   * Galerie puis envoi immédiat. Aucune permission à demander : la
   * documentation Expo SDK 54 précise que `launchImageLibraryAsync` n'en exige
   * pas. La compression, l'orientation EXIF et le redimensionnement sont faits
   * par le serveur — inutile de les refaire ici.
   */
  const ajouterPhotos = useCallback(async () => {
    setPhotoError(null);
    const restant = MAX_PHOTOS - photos.length;
    if (restant <= 0) return;

    let choix: ImagePicker.ImagePickerResult;
    try {
      choix = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsMultipleSelection: true,
        selectionLimit: restant,
      });
    } catch {
      // La galerie elle-même peut échouer, et pas seulement l'envoi qui suit.
      // Sans ce filet, le rejet partait dans le vide : ni photo, ni message.
      // Constaté en recette le 04/09 — `launchImageLibraryAsync` se résout à
      // l'annulation mais REJETTE dès qu'une image est réellement choisie,
      // faute du module natif `expo-file-system` dans le build installé.
      // L'écran restait alors parfaitement muet après un choix valide.
      setPhotoError(t('search.errors.photo_pick'));
      return;
    }
    if (choix.canceled) return;

    for (const asset of choix.assets.slice(0, restant)) {
      const fichier: PhotoAsset = {
        uri: asset.uri,
        fileName: asset.fileName ?? `photo-${Date.now()}.jpg`,
        mimeType: asset.mimeType ?? 'image/jpeg',
      };
      try {
        const url = await upload.mutateAsync(fichier);
        setPhotos((precedentes) => [...precedentes, url]);
      } catch (err) {
        // Le serveur porte le seuil exact (« dépasse la taille maximale de
        // 5 MB », « Format non supporté »). On ne le remplace pas.
        setPhotoError(
          err instanceof PhotoUploadError && err.serverMessage
            ? err.serverMessage
            : t('search.errors.photo_upload'),
        );
        break; // inutile d'insister sur les suivantes
      }
    }
  }, [photos.length, upload, t]);

  const retirerPhoto = useCallback((url: string) => {
    setPhotos((precedentes) => precedentes.filter((u) => u !== url));
  }, []);

  const submit = handleSubmit((values) => {
    if (!trip) return;

    const body: SendRequestBody = {
      proposed_price: Number(values.price),
      payment_method: values.method,
      description: values.description.trim(),
      goods_type: values.goodsType,
    };
    // Les champs vides ne sont pas envoyés : côté serveur, absent et vide ne
    // sont pas la même chose pour un décimal nullable.
    if (values.weightKg) body.weight_kg = Number(values.weightKg);
    if (values.volumeM3) body.volume_m3 = Number(values.volumeM3);
    if (values.pickupAddress.trim()) body.pickup_address = values.pickupAddress.trim();
    if (values.pickupGov) body.pickup_governorate = values.pickupGov;
    if (values.day && values.fromTime && values.untilTime) {
      body.pickup_from = toScheduledTime(values.day, values.fromTime);
      body.pickup_until = toScheduledTime(values.day, values.untilTime);
    }
    if (photos.length > 0) body.photos = photos;

    send.mutate({ jobId: trip.id, body });
  });

  const failure = send.error?.failure ?? null;

  /** Erreur de champ renvoyée par le serveur, rattachée à son champ. */
  const erreurServeurChamp = useCallback(
    (champ: SendRequestField): string | undefined => {
      if (!failure || failure.field !== champ) return undefined;
      if (PREFERER_MESSAGE_SERVEUR[champ] && failure.serverMessage) {
        return failure.serverMessage;
      }
      return t(`search.errors.field.${champ}`);
    },
    [failure, t],
  );

  /** Ce qui ne se rattache à aucun champ affichable : règle métier de la vue
   *  (« Vous avez déjà une demande en cours »), réseau, ou repli. */
  const erreurGenerale = useMemo(() => {
    if (!failure) return null;
    if (failure.field && CHAMPS_INLINE.includes(failure.field)) return null;
    if (failure.kind === 'network') return t('search.errors.network');
    if (failure.serverMessage) return failure.serverMessage;
    return t('search.errors.unknown');
  }, [failure, t]);

  const close = useCallback(() => {
    reset(VALEURS_INITIALES);
    setPhotos([]);
    setPhotoError(null);
    send.reset();
    onClose();
  }, [reset, send, onClose]);

  return {
    control,
    errors,
    setValue,
    govOptions,
    goodsOptions,
    dayOptions,
    timeOptions,
    methodOptions,
    photos,
    photoError,
    photoPending: upload.isPending,
    peutAjouterPhoto: photos.length < MAX_PHOTOS,
    ajouterPhotos,
    retirerPhoto,
    submit,
    close,
    erreurServeurChamp,
    erreurGenerale,
    isPending: send.isPending,
    isSuccess: send.isSuccess,
  };
}
