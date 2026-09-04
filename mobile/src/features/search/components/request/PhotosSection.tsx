import { ActivityIndicator, Image, Pressable, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Txt } from '@/shared/ui/Txt';
import { colors } from '@/shared/theme';
import { requestStyles as s } from './requestStyles';
import { MAX_PHOTOS } from './requestSchema';

interface Props {
  photos: string[];
  photoError: string | null;
  pending: boolean;
  peutAjouter: boolean;
  onAjouter: () => void;
  onRetirer: (url: string) => void;
}

// Une à trois photos de la marchandise.
//
// `upload/photo/` existait côté serveur et le champ `photos` était déjà accepté
// par le sérialiseur de création : le mobile n'avait jamais rempli ce canal.
// Les vignettes affichent l'URL renvoyée par le serveur, pas l'URI locale —
// c'est la preuve que l'envoi a réellement abouti.
export function PhotosSection({
  photos,
  photoError,
  pending,
  peutAjouter,
  onAjouter,
  onRetirer,
}: Props) {
  const { t } = useTranslation();

  return (
    <>
      <Txt style={s.section}>{t('search.request.photos_title')}</Txt>
      <Txt style={s.hint}>{t('search.request.photos_hint', { max: MAX_PHOTOS })}</Txt>

      <View style={s.photoRow}>
        {photos.map((url, index) => (
          <View key={url} style={s.photoBox}>
            <Image
              source={{ uri: url }}
              style={s.photoImage}
              accessibilityIgnoresInvertColors
              accessible
              accessibilityLabel={t('search.request.photo_alt', { n: index + 1 })}
            />
            <Pressable
              testID={`send-request-photo-remove-${index}`}
              style={s.photoRemove}
              onPress={() => onRetirer(url)}
              accessibilityRole="button"
              accessibilityLabel={t('search.request.photo_remove', { n: index + 1 })}
            >
              <Txt style={s.photoRemoveGlyph}>×</Txt>
            </Pressable>
          </View>
        ))}

        {peutAjouter ? (
          <Pressable
            testID="send-request-photo-add"
            style={s.photoAdd}
            onPress={onAjouter}
            disabled={pending}
            accessibilityRole="button"
            accessibilityLabel={t('search.request.photo_add')}
            accessibilityState={{ disabled: pending }}
          >
            {pending ? (
              <ActivityIndicator color={colors.brand[600]} />
            ) : (
              <Txt style={s.photoAddLabel} maxFontSizeMultiplier={1.6}>
                {t('search.request.photo_add')}
              </Txt>
            )}
          </Pressable>
        ) : null}
      </View>

      {photoError ? (
        <Txt testID="send-request-photo-error" style={s.error}>
          {photoError}
        </Txt>
      ) : null}
    </>
  );
}
