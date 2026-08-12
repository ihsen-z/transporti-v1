import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { Txt } from '@/shared/ui/Txt';
import { colors, radii, fontSize, shadows, TOUCH_TARGET } from '@/shared/theme';

// Variantes charte : primary=bleu (structure), cta=orange (action unique),
// accent=vert (valeur), ghost/danger=contour. Ombres colorées sur cta/primary.
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

const BG: Record<Variant, string> = {
  primary: colors.brand[600],
  cta: colors.cta[500],
  accent: colors.green[600],
  ghost: colors.neutral[0],
  danger: colors.neutral[0],
};
const FG: Record<Variant, string> = {
  primary: colors.neutral[0],
  cta: colors.neutral[0],
  accent: colors.neutral[0],
  ghost: colors.neutral[900],
  danger: colors.error,
};

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
  const isDisabled = disabled || loading;
  const bordered = variant === 'ghost' || variant === 'danger';
  const shadow = variant === 'cta' ? shadows.cta : variant === 'primary' ? shadows.brand : null;

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
        { backgroundColor: BG[variant] },
        bordered
          ? {
              borderWidth: 1,
              borderColor: variant === 'danger' ? colors.errorBorder : colors.neutral[200],
            }
          : null,
        !isDisabled ? shadow : null,
        { opacity: isDisabled ? 0.6 : pressed ? 0.9 : 1 },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={FG[variant]} />
      ) : (
        <Txt style={[styles.label, size === 'sm' ? styles.labelSm : null, { color: FG[variant] }]}>
          {label}
        </Txt>
      )}
    </Pressable>
  );
}

// Métriques de la charte : .b = padding 13/20, rayon 14, texte 14/700 ;
// .b-sm = padding 9/14, rayon 12, texte 13.
const styles = StyleSheet.create({
  base: { alignItems: 'center', justifyContent: 'center' },
  md: {
    borderRadius: radii.input,
    minHeight: TOUCH_TARGET,
    paddingVertical: 13,
    paddingHorizontal: 20,
  },
  sm: {
    borderRadius: radii.buttonSm,
    minHeight: 40,
    paddingVertical: 9,
    paddingHorizontal: 14,
  },
  label: { fontSize: fontSize.base, fontWeight: '700' },
  labelSm: { fontSize: fontSize.sm },
});
