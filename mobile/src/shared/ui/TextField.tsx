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
import { useOnBlue } from '@/shared/ui/SurfaceTone';
import { resolveFontFamily } from '@/shared/theme/typography';
import { colors, glass, radii, fontSize, focusRing, FIELD_HEIGHT } from '@/shared/theme';

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
  testID?: string;
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
  testID,
}: Props) {
  const { i18n } = useTranslation();
  const onBlue = useOnBlue();
  const [focused, setFocused] = useState(false);
  // Alignement du texte suivant le sens de lecture (derja AR = RTL).
  const textAlign = I18nManager.isRTL ? 'right' : 'left';
  // Police de la charte pour le texte saisi (TextInput n'est pas un <Txt>).
  const fontFamily = resolveFontFamily('400', i18n.language);

  // L'erreur prime sur le focus : un champ fautif reste rouge même en saisie.
  const showFocus = focused && !error;
  // L'anneau de focus n'existe que sur fond clair. Sur le bleu, un halo pâle
  // se noierait dans le dégradé : le verre s'y opacifie à la place.
  const showRing = showFocus && !onBlue;

  const surface = onBlue
    ? showFocus
      ? {
          backgroundColor: glass.fieldFocus.background,
          borderColor: glass.fieldFocus.border,
        }
      : { backgroundColor: glass.field.background, borderColor: glass.field.border }
    : showFocus
      ? { backgroundColor: colors.neutral[0], borderColor: focusRing.borderColor }
      : { backgroundColor: colors.neutral[50], borderColor: colors.neutral[300] };

  return (
    <View style={styles.wrap}>
      <Txt
        style={[
          styles.label,
          { textAlign, color: onBlue ? colors.onBlue[200] : colors.neutral[500] },
        ]}
      >
        {label}
      </Txt>
      <View>
        {/* Anneau de focus (charte : box-shadow 0 0 0 4px rgba(30,58,138,.08)).
            Rendu en premier donc DERRIÈRE le champ, et en débord négatif : il
            n'occupe aucune place dans le flux, donc rien ne bouge à la prise de
            focus. */}
        {showRing ? <View pointerEvents="none" style={styles.ring} /> : null}
        <TextInput
          testID={testID}
          accessibilityLabel={label}
          accessibilityHint={error}
          style={[
            styles.input,
            {
              textAlign,
              fontFamily,
              color: onBlue ? colors.onBlue[100] : colors.neutral[900],
            },
            surface,
            showFocus ? styles.focused : null,
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
          placeholderTextColor={onBlue ? 'rgba(255,255,255,0.6)' : colors.neutral[400]}
          secureTextEntry={secureTextEntry}
          keyboardType={keyboardType}
          autoCapitalize={autoCapitalize}
          autoComplete={autoComplete}
        />
      </View>
      {error ? (
        <Txt
          testID={testID ? `${testID}-error` : undefined}
          style={[
            styles.error,
            { textAlign, color: onBlue ? colors.text.errorOnBlue : colors.text.error },
          ]}
        >
          {error}
        </Txt>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  // Charte : libellé au-dessus, gap 7 px.
  wrap: { gap: 7 },
  label: { fontSize: fontSize.label, fontWeight: '600' },
  // Charte (.field) : rayon 14, hauteur 52, padding latéral 15, texte 15.
  input: {
    minHeight: FIELD_HEIGHT,
    borderWidth: 1,
    borderRadius: radii.input,
    paddingHorizontal: 15,
    fontSize: fontSize.md,
  },
  // Bord franc à la saisie, dans les deux familles.
  focused: { borderWidth: 1.5 },
  // Charte (§9, états d'erreur) : bord rouge, message 12,5 px sous le champ.
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
  error: { fontSize: fontSize.label, fontWeight: '600' },
});
