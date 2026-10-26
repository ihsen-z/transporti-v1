import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { Txt } from '@/shared/ui/Txt';
import { useOnBlue } from '@/shared/ui/SurfaceTone';
import {
  colors,
  glass,
  radii,
  fontSize,
  shadows,
  CTA_HEIGHT,
  TOUCH_TARGET,
} from '@/shared/theme';

// Variantes de la charte :
//   cta      orange plein — L'ACTION UNIQUE de l'écran, une seule par écran
//   primary  bleu royal plein, ombre bleue (la « secondary » de la charte)
//   accent   vert plein — la valeur (encaisser, valider un gain)
//   ghost    contour : blanc bordé sur fond clair, verre sur fond bleu
//   danger   contour rouge
//
// `ghost` est la seule variante dont le RENDU dépend du fond : la charte ne
// définit pas un bouton fantôme mais deux (`ghost-on-blue`, `outline-on-light`).
// Le ton vient de l'écran (SurfaceTone), pas d'une prop : un formulaire partagé
// entre la famille immersive et la famille applicative n'a pas à le savoir.
type Variant = 'primary' | 'cta' | 'accent' | 'ghost' | 'danger';
type Size = 'md' | 'sm';

interface Props {
  label: string;
  onPress: () => void;
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

export function Button({
  label,
  onPress,
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  style,
  testID,
}: Props) {
  const onBlue = useOnBlue();
  const isDisabled = disabled || loading;

  const background =
    variant === 'primary'
      ? colors.brand[600]
      : variant === 'cta'
        ? colors.cta[500]
        : variant === 'accent'
          ? colors.green[600]
          : variant === 'ghost' && onBlue
            ? glass.chip.background
            : colors.neutral[0];

  const foreground =
    variant === 'danger'
      ? colors.text.error
      : variant === 'ghost' && !onBlue
        ? colors.neutral[900]
        : colors.neutral[0];

  const border =
    variant === 'danger'
      ? colors.errorBorder
      : variant === 'ghost'
        ? onBlue
          ? glass.chip.border
          : colors.borderStrong
        : null;

  const shadow =
    variant === 'cta' ? shadows.cta : variant === 'primary' ? shadows.brand : null;

  // La charte demande des cibles ≥ 44 px, mais son propre `.b-sm` ne fait que
  // ~40 px de haut. On garde la compacité visuelle et on étend la zone tactile :
  // c'est la seule lecture qui respecte les deux règles à la fois.
  const hitSlop = size === 'sm' ? { top: 4, bottom: 4, left: 0, right: 0 } : undefined;

  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: isDisabled, busy: loading }}
      onPress={onPress}
      disabled={isDisabled}
      hitSlop={hitSlop}
      style={({ pressed }) => [
        styles.base,
        size === 'sm' ? styles.sm : styles.md,
        { backgroundColor: background },
        border ? { borderWidth: 1, borderColor: border } : null,
        !isDisabled ? shadow : null,
        // Charte (§Interactions) : à l'appui, le bouton descend d'un pixel et
        // son ombre se réduit — il s'enfonce, il ne clignote pas.
        pressed && !isDisabled ? styles.pressed : null,
        { opacity: isDisabled ? 0.6 : 1 },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={foreground} />
      ) : (
        <Txt
          style={[
            styles.label,
            size === 'sm' ? styles.labelSm : null,
            { color: foreground },
          ]}
        >
          {label}
        </Txt>
      )}
    </Pressable>
  );
}

// Métriques de la charte : .cta = hauteur 56, rayon 16, texte 16,5/700 ;
// .b-sm = padding 9/14, rayon 12, texte 13.
const styles = StyleSheet.create({
  base: { alignItems: 'center', justifyContent: 'center' },
  md: {
    borderRadius: radii.cta,
    minHeight: CTA_HEIGHT,
    paddingVertical: 13,
    paddingHorizontal: 20,
  },
  sm: {
    borderRadius: radii.buttonSm,
    minHeight: TOUCH_TARGET - 4,
    paddingVertical: 9,
    paddingHorizontal: 14,
  },
  pressed: { transform: [{ translateY: 1 }], opacity: 0.94 },
  label: { fontSize: fontSize.cta, fontWeight: '700', letterSpacing: -0.16 },
  labelSm: { fontSize: fontSize.sm, letterSpacing: 0 },
});
