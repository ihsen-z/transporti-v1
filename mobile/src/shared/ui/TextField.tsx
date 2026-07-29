import {
  I18nManager,
  StyleSheet,
  TextInput,
  View,
  type KeyboardTypeOptions,
  type TextInputProps,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { Txt } from '@/shared/ui/Txt';
import { resolveFontFamily } from '@/shared/theme/typography';
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
  const { i18n } = useTranslation();
  // Alignement du texte suivant le sens de lecture (derja AR = RTL).
  const textAlign = I18nManager.isRTL ? 'right' : 'left';
  // Police de la charte pour le texte saisi (TextInput n'est pas un <Txt>).
  const fontFamily = resolveFontFamily('400', i18n.language);

  return (
    <View style={styles.wrap}>
      <Txt style={[styles.label, { textAlign }]}>{label}</Txt>
      <TextInput
        style={[
          styles.input,
          { textAlign, fontFamily },
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
        <Txt style={[styles.error, { textAlign }]}>{error}</Txt>
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
