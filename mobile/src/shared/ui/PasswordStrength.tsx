import { StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Txt } from '@/shared/ui/Txt';
import { useOnBlue } from '@/shared/ui/SurfaceTone';
import { colors, glass, radii, spacing, fontSize } from '@/shared/theme';

// Jauge de force du mot de passe (charte) : quatre segments de 3 px et un mot.
//
// Elle ne remplace PAS la validation — le schéma zod reste seul juge de ce qui
// part au serveur. Elle dit seulement, pendant la frappe, où en est la saisie :
// un formulaire qui refuse un mot de passe APRÈS l'envoi fait recommencer, un
// indicateur pendant la frappe fait corriger.
const SEGMENTS = 4;

/**
 * Force sur 0–4. Un point par critère tenu, plafonné à 4.
 *
 * Exporté pour être testable seul : c'est la seule partie du composant qui
 * porte une décision.
 */
export function passwordScore(value: string): number {
  if (!value) return 0;
  const criteres = [
    value.length >= 8,
    value.length >= 12,
    /[a-z]/.test(value) && /[A-Z]/.test(value),
    /\d/.test(value),
    /[^\w\s]/.test(value),
  ];
  return Math.min(SEGMENTS, criteres.filter(Boolean).length);
}

interface Props {
  value: string;
  testID?: string;
}

export function PasswordStrength({ value, testID }: Props) {
  const { t } = useTranslation();
  const onBlue = useOnBlue();
  const score = passwordScore(value);

  // Rien à dire tant que le champ est vide : afficher « très faible » sur un
  // champ vierge, c'est reprocher à l'utilisateur de ne pas avoir commencé.
  if (!value) return null;

  const empty = onBlue ? glass.track : colors.neutral[300];
  const label = t(`auth.password_strength.${score}`);

  return (
    <View
      testID={testID}
      style={styles.row}
      accessibilityRole="progressbar"
      accessibilityLabel={label}
      accessibilityValue={{ min: 0, max: SEGMENTS, now: score }}
    >
      <View style={styles.track}>
        {Array.from({ length: SEGMENTS }, (_, i) => (
          <View
            key={i}
            style={[
              styles.segment,
              { backgroundColor: i < score ? colors.green[500] : empty },
            ]}
          />
        ))}
      </View>
      <Txt
        style={[
          styles.label,
          { color: onBlue ? colors.text.greenOnBlue : colors.text.green },
        ]}
      >
        {label}
      </Txt>
    </View>
  );
}

// Charte : 4 segments de 3 px, gap 4, rayon plein, puis le mot en 12,5/600.
const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  track: { flex: 1, flexDirection: 'row', gap: spacing.xs },
  segment: { flex: 1, height: 3, borderRadius: radii.full },
  label: { fontSize: fontSize.label, fontWeight: '600' },
});
