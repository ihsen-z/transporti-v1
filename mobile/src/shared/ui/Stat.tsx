import { StyleSheet, View } from 'react-native';
import { Txt } from '@/shared/ui/Txt';
import { colors, glass, radii, spacing, fontSize } from '@/shared/theme';

// Tuile de KPI posée sur le bleu (charte, §Tuile statistique) : fond de verre,
// chiffre blanc en 22/800, libellé 11,5/600 en bleu pâle, jauge de 5 px.
//
// `progress` (0–1) affiche la jauge ; absent, pas de jauge.
interface Props {
  /** Valeur mise en avant. `null` → « — » : jamais un faux zéro. */
  value: string | null;
  label: string;
  progress?: number | null;
  /**
   * Ce que dit la jauge. `good` = vert (la valeur créée) ; `improve` = orange
   * (un indicateur à redresser). La charte les distingue par la couleur du
   * remplissage, pas par un pictogramme.
   */
  intent?: 'good' | 'improve';
  testID?: string;
}

export function Stat({ value, label, progress, intent = 'good', testID }: Props) {
  // Les KPI du backend valent `null` quand la donnée n'existe pas encore
  // (aucun trajet publié). Le contrat KPI impose « — », pas 0 %.
  const shown = value ?? '—';
  const ratio = progress == null ? null : Math.max(0, Math.min(1, progress));
  const fill = intent === 'improve' ? colors.cta[500] : colors.green[500];

  return (
    <View testID={testID} style={styles.kpi}>
      <Txt style={styles.value}>{shown}</Txt>
      <Txt style={styles.label}>{label}</Txt>
      {ratio !== null ? (
        <View
          style={styles.bar}
          accessibilityRole="progressbar"
          accessibilityValue={{ min: 0, max: 100, now: Math.round(ratio * 100) }}
        >
          <View
            style={[styles.fill, { width: `${ratio * 100}%`, backgroundColor: fill }]}
          />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  kpi: {
    flex: 1,
    backgroundColor: glass.tile,
    borderRadius: radii.tile,
    padding: 13,
  },
  value: {
    fontSize: fontSize.xl,
    fontWeight: '800',
    color: colors.onBlue[100],
    letterSpacing: -0.44,
  },
  // `onBlue[300]` est réservé aux textes ≥ 18 px ; un libellé de 11,5 px passe
  // par `text.onBlue`, qui tient le seuil AA sur toute la longueur du dégradé.
  label: { fontSize: fontSize.meta, fontWeight: '600', color: colors.text.onBlue },
  bar: {
    height: 5,
    backgroundColor: glass.track,
    borderRadius: radii.full,
    marginTop: spacing.sm,
    overflow: 'hidden',
  },
  fill: { height: '100%', borderRadius: radii.full },
});
