import { Image, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Txt } from '@/shared/ui/Txt';
import { colors, spacing, fontSize, radii } from '@/shared/theme';
import { formatAmount } from '@/shared/format/money';
import type { TripRequestDto } from '../api/dto';

interface Props {
  request: TripRequestDto;
}

/**
 * Lot 6.1 — ce que la cliente expédie, sous une forme décidable.
 *
 * Le transporteur n'avait jusqu'ici que `description` en texte libre : ni
 * poids, ni volume, ni photo, ni adresse, ni créneau. Il devait accepter ou
 * refuser à l'aveugle, ce qui produisait mécaniquement des contre-propositions
 * et des annulations sur place.
 *
 * Chaque bloc ne s'affiche que s'il porte une donnée : une demande antérieure
 * au lot, ou une cliente qui n'a pas tout rempli, ne doit pas se traduire par
 * une rangée d'étiquettes vides.
 */
export function RequestGoodsSummary({ request }: Props) {
  const { t, i18n } = useTranslation();
  const locale = i18n.language === 'ar' ? 'ar-TN' : 'fr-FR';

  const puces: string[] = [];
  if (request.goods_type) {
    puces.push(t(`requests.goods.${request.goods_type}`));
  }
  // DRF sérialise les Decimal bruts (« 450.50 », « 120.00 ») : sans formatage,
  // le transporteur lit « 120.00 kg ». Même formateur que les montants.
  if (request.weight_kg) {
    puces.push(t('requests.goods.weight', { poids: formatAmount(Number(request.weight_kg)) }));
  }
  if (request.volume_m3) {
    puces.push(t('requests.goods.volume', { volume: formatAmount(Number(request.volume_m3)) }));
  }

  const lieu = [request.pickup_address, request.pickup_governorate]
    .filter(Boolean)
    .join(', ');

  // Le créneau n'a de sens que complet : une heure de début sans fin
  // n'indiquerait pas au transporteur combien de temps il a.
  const creneau =
    request.pickup_from && request.pickup_until
      ? t('requests.goods.slot', {
          jour: new Date(request.pickup_from).toLocaleDateString(locale, {
            day: 'numeric',
            month: 'long',
          }),
          debut: new Date(request.pickup_from).toLocaleTimeString(locale, {
            hour: '2-digit',
            minute: '2-digit',
          }),
          fin: new Date(request.pickup_until).toLocaleTimeString(locale, {
            hour: '2-digit',
            minute: '2-digit',
          }),
        })
      : null;

  const rienAAfficher =
    puces.length === 0 && !lieu && !creneau && request.photos.length === 0;
  if (rienAAfficher) return null;

  return (
    <View style={s.bloc} testID="demande-marchandise">
      {puces.length > 0 ? (
        <View style={s.puces}>
          {puces.map((texte) => (
            <Txt key={texte} style={s.puce} maxFontSizeMultiplier={1.6}>
              {texte}
            </Txt>
          ))}
        </View>
      ) : null}

      {request.photos.length > 0 ? (
        <View style={s.photos}>
          {request.photos.map((url, index) => (
            <Image
              key={url}
              source={{ uri: url }}
              style={s.photo}
              accessibilityIgnoresInvertColors
              accessible
              accessibilityLabel={t('requests.goods.photo_alt', { n: index + 1 })}
            />
          ))}
        </View>
      ) : null}

      {lieu ? (
        <Txt style={s.ligne}>{t('requests.goods.pickup', { lieu })}</Txt>
      ) : null}
      {creneau ? <Txt style={s.ligne}>{creneau}</Txt> : null}
    </View>
  );
}

const s = StyleSheet.create({
  bloc: {
    gap: spacing.sm,
    backgroundColor: colors.neutral[50],
    borderRadius: radii.md,
    padding: spacing.md,
  },
  puces: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  puce: {
    fontSize: fontSize.sm,
    fontWeight: '700',
    color: colors.brand[600],
    backgroundColor: colors.brand[50],
    borderRadius: radii.md,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    overflow: 'hidden',
  },
  photos: { flexDirection: 'row', gap: spacing.sm },
  photo: {
    width: 64,
    height: 64,
    borderRadius: radii.md,
    backgroundColor: colors.neutral[100],
  },
  ligne: { fontSize: fontSize.sm, color: colors.neutral[700] },
});
