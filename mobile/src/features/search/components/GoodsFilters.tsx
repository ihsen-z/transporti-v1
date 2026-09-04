import { Pressable, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Txt } from '@/shared/ui/Txt';
import { TextField } from '@/shared/ui/TextField';
import { Select } from '@/shared/ui/Select';
import { Icon } from '@/shared/ui/icons';
import { colors, spacing, fontSize, TOUCH_TARGET } from '@/shared/theme';
import type { GoodsType } from '../api/dto';

export interface GoodsFilterValues {
  jobType: GoodsType | '';
  weight: string;
  volume: string;
}

interface Props {
  ouvert: boolean;
  onBasculer: () => void;
  valeurs: GoodsFilterValues;
  onChange: (valeurs: GoodsFilterValues) => void;
  erreur: string | null;
}

/**
 * Lot 6.4 — type, poids et volume de la marchandise, portés au matching serveur
 * (E-15). Sans eux, une cliente cherchant un déménagement voyait des retours
 * incapables de le prendre, et la capacité déclarée par le transporteur n'était
 * comparée à rien.
 *
 * Derrière un dépliant, fermé par défaut : le chemin nominal reste « départ,
 * arrivée, chercher ». Ces trois champs affinent, ils ne conditionnent pas.
 */
export function GoodsFilters({ ouvert, onBasculer, valeurs, onChange, erreur }: Props) {
  const { t } = useTranslation();

  const typeOptions = [
    { value: '', label: t('search.filters.any_type') },
    { value: 'TRANSPORT', label: t('search.request.goods_transport') },
    { value: 'MOVING', label: t('search.request.goods_moving') },
    { value: 'DELIVERY', label: t('search.request.goods_delivery') },
  ];

  // Compte ce qui est réellement posé, pour le dire quand le bloc est replié —
  // sinon un filtre actif deviendrait invisible et fausserait la lecture des
  // résultats.
  const actifs = [valeurs.jobType, valeurs.weight, valeurs.volume].filter(Boolean).length;

  return (
    <View style={s.bloc}>
      <Pressable
        testID="search-filters-toggle"
        onPress={onBasculer}
        style={s.entete}
        accessibilityRole="button"
        accessibilityState={{ expanded: ouvert }}
        accessibilityLabel={t('search.filters.title')}
      >
        <Txt style={s.titre}>
          {/* `nb` et non `count` : `count` déclenche la machinerie de pluriel
              d'i18next, qui irait chercher des clés _one/_other inexistantes. */}
          {actifs > 0
            ? t('search.filters.title_active', { nb: actifs })
            : t('search.filters.title')}
        </Txt>
        <Icon
          name={ouvert ? 'chevron-up' : 'chevron-down'}
          size={18}
          color={colors.brand[600]}
        />
      </Pressable>

      {ouvert ? (
        <View style={s.champs}>
          <Select
            testID="search-goods-type"
            label={t('search.filters.type')}
            placeholder={t('search.filters.any_type')}
            value={valeurs.jobType}
            options={typeOptions}
            onChange={(jobType) => onChange({ ...valeurs, jobType: jobType as GoodsType | '' })}
          />
          <View style={s.rangee}>
            <View style={s.moitie}>
              <TextField
                testID="search-goods-weight"
                label={t('search.request.weight')}
                placeholder={t('search.request.weight_ph')}
                value={valeurs.weight}
                onChangeText={(weight) => onChange({ ...valeurs, weight })}
                keyboardType="numeric"
              />
            </View>
            <View style={s.moitie}>
              <TextField
                testID="search-goods-volume"
                label={t('search.request.volume')}
                placeholder={t('search.request.volume_ph')}
                value={valeurs.volume}
                onChangeText={(volume) => onChange({ ...valeurs, volume })}
                keyboardType="numeric"
              />
            </View>
          </View>
          <Txt style={s.note}>{t('search.filters.undeclared_note')}</Txt>
          {erreur ? (
            <Txt testID="search-filters-error" style={s.erreur}>
              {erreur}
            </Txt>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

const s = StyleSheet.create({
  bloc: { gap: spacing.sm },
  entete: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: TOUCH_TARGET,
  },
  titre: { fontSize: fontSize.md, fontWeight: '700', color: colors.brand[600] },
  champs: { gap: spacing.md },
  rangee: { flexDirection: 'row', gap: spacing.md },
  moitie: { flex: 1 },
  note: { fontSize: fontSize.sm, color: colors.neutral[500] },
  erreur: { color: colors.text.error, fontSize: fontSize.sm, fontWeight: '600' },
});
