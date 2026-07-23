import {
  I18nManager,
  StyleSheet,
  Text,
  TextInput,
  View,
  type KeyboardTypeOptions,
  type TextInputProps,
} from 'react-native';
import { colors, radii, spacing, fontSize } from '@/shared/theme';

interface Props {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  onBlur?: () => void;
  placeholder?: string;
  error?: string;
  secureTextEntry?: boolean;
  keyboardType?: KeyboardTypeOptions;
  autoCapitalize?: TextInputProps['autoCapitalize'];
  autoComplete?: TextInputProps['autoComplete'];
}

export function TextField({
  label,
  value,
  onChangeText,
  onBlur,
  placeholder,
  error,
  secureTextEntry,
  keyboardType,
  autoCapitalize = 'none',
  autoComplete,
}: Props) {
  // Alignement du texte suivant le sens de lecture (derja AR = RTL).
  const textAlign = I18nManager.isRTL ? 'right' : 'left';

  return (
    <View style={styles.wrap}>
      <Text style={[styles.label, { textAlign }]}>{label}</Text>
      <TextInput
        style={[
          styles.input,
          { textAlign },
          error ? styles.inputError : null,
        ]}
        value={value}
        onChangeText={onChangeText}
        onBlur={onBlur}
        placeholder={placeholder}
        placeholderTextColor={colors.neutral[400]}
        secureTextEntry={secureTextEntry}
        keyboardType={keyboardType}
        autoCapitalize={autoCapitalize}
        autoComplete={autoComplete}
      />
      {error ? (
        <Text style={[styles.error, { textAlign }]}>{error}</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: spacing.xs },
  label: {
    fontSize: fontSize.sm,
    fontWeight: '600',
    color: colors.neutral[700],
  },
  input: {
    minHeight: 52,
    borderWidth: 1,
    borderColor: colors.neutral[200],
    borderRadius: radii.lg,
    paddingHorizontal: spacing.lg,
    fontSize: fontSize.md,
    color: colors.neutral[900],
    backgroundColor: colors.neutral[0],
  },
  inputError: { borderColor: colors.error },
  error: { fontSize: fontSize.sm, color: colors.error },
});
