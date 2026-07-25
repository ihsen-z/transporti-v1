import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { colors, radii, spacing, fontSize, shadows } from '@/shared/theme';

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
}: Props) {
  const isDisabled = disabled || loading;
  const bordered = variant === 'ghost' || variant === 'danger';
  const shadow = variant === 'cta' ? shadows.cta : variant === 'primary' ? shadows.brand : null;

  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      disabled={isDisabled}
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
        <Text style={[styles.label, size === 'sm' ? styles.labelSm : null, { color: FG[variant] }]}>
          {label}
        </Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: { borderRadius: radii.input, alignItems: 'center', justifyContent: 'center' },
  md: { minHeight: 52, paddingHorizontal: spacing.lg },
  sm: { minHeight: 40, paddingHorizontal: spacing.md },
  label: { fontSize: fontSize.md, fontWeight: '700' },
  labelSm: { fontSize: fontSize.sm },
});
