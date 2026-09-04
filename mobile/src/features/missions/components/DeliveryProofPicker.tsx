import { useState } from 'react';
import { ActivityIndicator, Image, Pressable, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import * as ImagePicker from 'expo-image-picker';
import { Txt } from '@/shared/ui/Txt';
import { colors, spacing, fontSize, radii, TOUCH_TARGET } from '@/shared/theme';
import { PhotoUploadError, useUploadPhoto, type PhotoAsset } from '@/core/api/usePhotoUpload';

interface Props {
  /** URL rendue par `upload/photo/`, ou `null` tant qu'aucune preuve n'est jointe. */
  photoUrl: string | null;
  onChange: (url: string | null) => void;
}

/**
 * Lot 7.2 — la preuve de livraison (E-12, T-12, C-16).
 *
 * `JobCompleteView` accepte `pod_photo_url` depuis longtemps et le range dans
 * les métadonnées de l'événement `DELIVERED` ; `JobEventDto` porte même le
 * champ côté mobile. Personne ne le remplissait : le transporteur n'avait
 * aucun moyen de prouver sa livraison, ce qui le laissait sans défense en cas
 * de litige, et la cliente ne recevait rien.
 *
 * La photo est prise par la CAMÉRA et non choisie dans la galerie : une preuve
 * qu'on peut sélectionner dans ses images d'hier n'en est pas une. Elle reste
 * facultative — le PIN du client demeure la condition de clôture.
 */
export function DeliveryProofPicker({ photoUrl, onChange }: Props) {
  const { t } = useTranslation();
  const upload = useUploadPhoto();
  const [erreur, setErreur] = useState<string | null>(null);

  const photographier = async () => {
    setErreur(null);

    let resultat: ImagePicker.ImagePickerResult;
    try {
      const permission = await ImagePicker.requestCameraPermissionsAsync();
      if (!permission.granted) {
        setErreur(t('missions.proof.permission_refused'));
        return;
      }
      resultat = await ImagePicker.launchCameraAsync({ allowsEditing: false });
    } catch {
      // Toute API native déclenchée par un geste doit rendre sa panne visible :
      // un rejet avalé laisse un écran muet et se lit comme un bouton mort.
      setErreur(t('missions.proof.camera_failed'));
      return;
    }
    if (resultat.canceled) return;

    const asset = resultat.assets[0];
    if (!asset) return;
    const fichier: PhotoAsset = {
      uri: asset.uri,
      fileName: asset.fileName ?? `preuve-${Date.now()}.jpg`,
      mimeType: asset.mimeType ?? 'image/jpeg',
    };
    try {
      onChange(await upload.mutateAsync(fichier));
    } catch (err) {
      setErreur(
        err instanceof PhotoUploadError && err.serverMessage
          ? err.serverMessage
          : t('missions.proof.upload_failed'),
      );
    }
  };

  return (
    <View style={s.bloc}>
      <Txt style={s.titre}>{t('missions.proof.title')}</Txt>

      {photoUrl ? (
        <View style={s.rangee}>
          <Image
            source={{ uri: photoUrl }}
            style={s.vignette}
            accessibilityIgnoresInvertColors
            accessible
            accessibilityLabel={t('missions.proof.photo_alt')}
          />
          <Pressable
            testID="mission-proof-remove"
            onPress={() => onChange(null)}
            style={s.retirer}
            accessibilityRole="button"
            accessibilityLabel={t('missions.proof.remove')}
          >
            <Txt style={s.retirerTexte}>{t('missions.proof.remove')}</Txt>
          </Pressable>
        </View>
      ) : (
        <Pressable
          testID="mission-proof-capture"
          onPress={() => void photographier()}
          disabled={upload.isPending}
          style={s.capture}
          accessibilityRole="button"
          accessibilityLabel={t('missions.proof.capture')}
          accessibilityState={{ disabled: upload.isPending }}
        >
          {upload.isPending ? (
            <ActivityIndicator color={colors.brand[600]} />
          ) : (
            <Txt style={s.captureTexte} maxFontSizeMultiplier={1.6}>
              {t('missions.proof.capture')}
            </Txt>
          )}
        </Pressable>
      )}

      <Txt style={s.note}>{t('missions.proof.optional_note')}</Txt>
      {erreur ? (
        <Txt testID="mission-proof-error" style={s.erreur}>
          {erreur}
        </Txt>
      ) : null}
    </View>
  );
}

const s = StyleSheet.create({
  bloc: { gap: spacing.sm },
  titre: { fontSize: fontSize.md, fontWeight: '700', color: colors.neutral[700] },
  rangee: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  vignette: {
    width: 72,
    height: 72,
    borderRadius: radii.md,
    backgroundColor: colors.neutral[100],
  },
  retirer: {
    minHeight: TOUCH_TARGET,
    justifyContent: 'center',
    paddingHorizontal: spacing.sm,
  },
  retirerTexte: { fontSize: fontSize.md, fontWeight: '700', color: colors.text.error },
  capture: {
    minHeight: TOUCH_TARGET,
    borderRadius: radii.md,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: colors.brand[500],
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
  },
  captureTexte: { fontSize: fontSize.md, fontWeight: '700', color: colors.brand[600] },
  note: { fontSize: fontSize.sm, color: colors.neutral[500] },
  erreur: { color: colors.text.error, fontSize: fontSize.sm, fontWeight: '600' },
});
