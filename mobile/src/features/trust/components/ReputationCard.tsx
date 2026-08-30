import { StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Txt } from '@/shared/ui/Txt';
import { Card } from '@/shared/ui/Card';
import { colors, spacing, fontSize } from '@/shared/theme';
import type { ScoreConfianceDto } from '../api/dto';

interface Props {
  score: ScoreConfianceDto;
}

/**
 * T5.3 — la décomposition du score de confiance, jumelle de la section web.
 *
 * Le score seul ne dit pas quoi corriger : un transporteur à 62/100 ignore ce
 * qui le retient. Les cinq composantes sont donc rendues, AVEC leur plafond.
 *
 * Les deux composantes qui mesurent l'usage de l'application — et non la
 * qualité du service — sont affichées en gris et signalées en clair. Les
 * masquer rendrait l'addition fausse à l'écran : le total ne correspondrait
 * plus aux parts montrées, ce qui est une autre façon de mentir.
 */
export function ReputationCard({ score }: Props) {
  const { t } = useTranslation();

  return (
    <Card>
      <Txt style={styles.titre}>{t('reputation.title')}</Txt>
      <Txt style={styles.libelle}>{t('reputation.score_label')}</Txt>
      <Txt style={styles.score} testID="reputation-score">
        {score.trust_score}/100
      </Txt>

      <View style={styles.liste}>
        {score.components.map((composante) => (
          <View key={composante.key} testID={`reputation-${composante.key}`}>
            <View style={styles.ligne}>
              <Txt style={styles.nom}>{t(`reputation.${composante.key}`)}</Txt>
              <Txt style={styles.points}>
                {t('reputation.points', {
                  earned: composante.earned,
                  max: composante.max,
                })}
              </Txt>
            </View>
            <View style={styles.rail}>
              <View
                style={[
                  styles.jauge,
                  {
                    width: `${Math.round((composante.earned / composante.max) * 100)}%`,
                    backgroundColor: composante.is_service_quality
                      ? colors.brand[600]
                      : colors.neutral[300],
                  },
                ]}
              />
            </View>
          </View>
        ))}
      </View>

      <Txt style={styles.avertissement} testID="reputation-avertissement-usage">
        {t('reputation.usage_warning')}
      </Txt>
    </Card>
  );
}

const styles = StyleSheet.create({
  titre: {
    fontSize: fontSize.lg,
    fontWeight: '700',
    color: colors.neutral[900],
    marginBottom: spacing.sm,
  },
  libelle: { fontSize: fontSize.sm, color: colors.neutral[500] },
  score: {
    fontSize: fontSize['2xl'],
    fontWeight: '800',
    color: colors.neutral[900],
    marginBottom: spacing.md,
  },
  liste: { gap: spacing.md },
  ligne: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
    marginBottom: spacing.xs,
  },
  nom: { fontSize: fontSize.sm, color: colors.neutral[700], flex: 1 },
  points: { fontSize: fontSize.sm, color: colors.neutral[500] },
  rail: {
    height: 6,
    borderRadius: 999,
    backgroundColor: colors.neutral[100],
    overflow: 'hidden',
  },
  jauge: { height: 6, borderRadius: 999 },
  avertissement: {
    fontSize: fontSize.sm,
    color: colors.neutral[500],
    marginTop: spacing.md,
  },
});
