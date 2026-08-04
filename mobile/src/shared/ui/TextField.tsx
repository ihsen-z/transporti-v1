import { useState } from 'react';
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
import { colors, radii, spacing, fontSize, focusRing } from '@/shared/theme';

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
  const [focused, setFocused] = useState(false);
  // Alignement du texte suivant le sens de lecture (derja AR = RTL).
  const textAlign = I18nManager.isRTL ? 'right' : 'left';
  // Police de la charte pour le texte saisi (TextInput n'est pas un <Txt>).
  const fontFamily = resolveFontFamily('400', i18n.language);

  // L'erreur prime sur le focus : un champ fautif reste rouge même en saisie.
  const showRing = focused && !error;

  return (
    <View style={styles.wrap}>
      <Txt style={[styles.label, { textAlign }]}>{label}</Txt>
      <View>
        {/* Anneau de focus (charte : box-shadow 0 0 0 4px #eef2ff). Rendu en
            premier donc DERRIÈRE le champ, et en débord négatif : il n'occupe
            aucune place dans le flux, donc rien ne bouge à la prise de focus. */}
        {showRing ? <View pointerEvents="none" style={styles.ring} /> : null}
        <TextInput
          style={[
            styles.input,
            { textAlign, fontFamily },
            showRing ? styles.inputFocused : null,
            error ? styles.inputError : null,
          ]}
          value={value}
          onChangeText={onChangeText}
          onFocus={() => setFocused(true)}
          onBlur={() => {
            setFocused(false);
            onBlur?.();
          }}
          placeholder={placeholder}
          placeholderTextColor={colors.neutral[400]}
          secureTextEntry={secureTextEntry}
          keyboardType={keyboardType}
          autoCapitalize={autoCapitalize}
          autoComplete={autoComplete}
        />
      </View>
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
  // Charte (.inp) : rayon 14, bordure 1 px #e5e7eb, texte 15.
  input: {
    minHeight: 52,
    borderWidth: 1,
    borderColor: colors.neutral[300],
    borderRadius: radii.input,
    paddingHorizontal: spacing.lg,
    fontSize: fontSize.md,
    color: colors.neutral[900],
    backgroundColor: colors.neutral[0],
  },
  inputFocused: { borderColor: focusRing.borderColor },
  inputError: { borderColor: colors.error },
  ring: {
    position: 'absolute',
    top: -focusRing.width,
    left: -focusRing.width,
    right: -focusRing.width,
    bottom: -focusRing.width,
    borderRadius: radii.input + focusRing.width,
    backgroundColor: focusRing.color,
  },
  error: { fontSize: fontSize.sm, color: colors.error },
});
