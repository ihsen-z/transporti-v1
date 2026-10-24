import { StyleSheet, View } from 'react-native';
import { Txt } from '@/shared/ui/Txt';
import { Icon, type IconName } from '@/shared/ui/icons';
import { colors, radii, fontSize, spacing } from '@/shared/theme';

// Tags de la charte, §Tags. Trois familles seulement :
//   BLEU  la nature du trajet
//   GRIS  un fait (poids, délai, mode de paiement)
//   VERT  la valeur (remise, vérifié)
export type BadgeVariant =
  | 'brand' // 🔄 trajet retour
  | 'verified' // ✓ vérifié
  | 'save' // −38 % (valeur, plein vert)
  | 'cod' // 💵 à la livraison
  | 'warning' // ⏳ en attente / en cours (ambre)
  | 'urgent'
  | 'neutral';

// `fg` porte l'encre. Là où la charte descend sous le seuil AA à 11,5 px, le
// token corrigé est utilisé à sa place — la teinte ne change pas, le ton
// descend d'un cran :
//   vert   #0F9B6C sur #ECFDF5 = 3,36:1  ->  text.green   5,21:1
//   gris   #6B7280 sur #EEF2F8 = 4,30:1  ->  slate        6,75:1
const VARIANTS: Record<BadgeVariant, { bg: string; fg: string }> = {
  brand: { bg: colors.info.bg, fg: colors.brand[500] },
  verified: { bg: colors.green[50], fg: colors.text.green },
  save: { bg: colors.green[500], fg: colors.neutral[0] },
  cod: { bg: colors.tagBg, fg: colors.slate },
  // Teintes ambre (état warning) — cohérentes avec colors.warning #f59e0b.
  warning: { bg: '#fef3c7', fg: colors.text.warning },
  urgent: { bg: '#fee2e2', fg: colors.text.error },
  neutral: { bg: colors.tagBg, fg: colors.slate },
};

interface Props {
  label: string;
  variant?: BadgeVariant;
  /** Icône optionnelle à gauche du libellé (remplace les émojis de la maquette). */
  icon?: IconName;
  testID?: string;
}

export function Badge({ label, variant = 'neutral', icon, testID }: Props) {
  const c = VARIANTS[variant];
  // La charte donne aux tags un rayon de 8 — SAUF au badge de remise, qu'elle
  // décrit explicitement « en pill ». C'est ce qui le sort de la rangée de
  // tags : la remise n'est pas un fait de plus sur le trajet, c'est l'argument.
  const pill = variant === 'save';

  return (
    <View
      testID={testID}
      style={[
        styles.badge,
        { backgroundColor: c.bg, borderRadius: pill ? radii.full : radii.tag },
      ]}
    >
      {/* `bold` et non le duotone par défaut : à 12 px, le remplissage
          translucide referme le dessin et le tag devient une tache. */}
      {icon ? <Icon name={icon} size={12} color={c.fg} weight="bold" /> : null}
      <Txt style={[styles.text, { color: c.fg }]}>{label}</Txt>
    </View>
  );
}

// Charte (.tag) : texte 11,5/600, padding 6/10, hauteur ~28.
const styles = StyleSheet.create({
  badge: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingVertical: 6,
    paddingHorizontal: 10,
  },
  text: { fontSize: fontSize.tag, fontWeight: '600' },
});
