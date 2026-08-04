import { StyleSheet, View } from 'react-native';
import { Txt } from '@/shared/ui/Txt';
import { colors, radii, spacing } from '@/shared/theme';

// Tuile de KPI du hero transporteur (.kpi de 10-transporteur-dashboard.html) :
// posée sur le dégradé bleu, donc fond blanc translucide et texte blanc.
// `progress` (0–1) affiche la barre de remplissage ; absent, pas de barre.
interface Props {
  /** Valeur mise en avant. `null` → « — » : jamais un faux zéro. */
  value: string | null;
  label: string;
  progress?: number | null;
}

export function Stat({ value, label, progress }: Props) {
  // Les KPI du backend valent `null` quand la donnée n'existe pas encore
  // (aucun trajet publié). Le contrat KPI impose « — », pas 0 %.
  const shown = value ?? '—';
  const ratio = progress == null ? null : Math.max(0, Math.min(1, progress));

  return (
    <View style={styles.kpi}>
      <Txt style={styles.value}>{shown}</Txt>
      <Txt style={styles.label}>{label}</Txt>
      {ratio !== null ? (
        <View
          style={styles.bar}
          accessibilityRole="progressbar"
          accessibilityValue={{ min: 0, max: 100, now: Math.round(ratio * 100) }}
        >
          <View style={[styles.fill, { width: `${ratio * 100}%` }]} />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  kpi: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: radii.input,
    paddingVertical: 10,
    paddingHorizontal: spacing.md,
  },
  value: { fontSize: 16, fontWeight: '800', color: colors.neutral[0] },
  label: { fontSize: 11, color: colors.neutral[0], opacity: 0.85 },
  bar: {
    height: 6,
    backgroundColor: 'rgba(255,255,255,0.22)',
    borderRadius: radii.full,
    marginTop: spacing.sm,
    overflow: 'hidden',
  },
  // Vert du logo : la barre porte la valeur créée, pas la structure.
  fill: { height: '100%', backgroundColor: colors.green.logo, borderRadius: radii.full },
});
