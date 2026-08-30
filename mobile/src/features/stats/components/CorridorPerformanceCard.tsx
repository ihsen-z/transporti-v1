import { StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Txt } from '@/shared/ui/Txt';
import { Card } from '@/shared/ui/Card';
import { formatAmount } from '@/shared/format/money';
import { colors, spacing, fontSize } from '@/shared/theme';
import type {
  CorridorSousDesserviDto,
  RevenueParCorridorDto,
} from '../api/dto';

interface Props {
  corridors: RevenueParCorridorDto[];
  opportunites: CorridorSousDesserviDto[];
}

/**
 * T5.4 — ce que rapportent les corridors, et où la demande attend.
 *
 * Jumeau mobile de l'écran web `/performance`. B-3b était calculé par
 * `stats.py` depuis le lot 1 et lu NULLE PART : ce composant et son pendant
 * web sont sa première interface.
 *
 * L'ÉCART ASSUMÉ AVEC LE WEB tient à la place : la charte mobile n'ouvre pas
 * de sixième onglet, donc ceci vit dans « Gains », sous le portefeuille. C'est
 * cohérent — les deux répondent à « combien j'ai gagné ». Le web dispose d'un
 * écran entier et peut se permettre un tableau à cinq colonnes ; ici chaque
 * corridor est une ligne lisible d'un pouce.
 *
 * Aucun chiffre n'est calculé : contrat `stats.py`.
 */
export function CorridorPerformanceCard({ corridors, opportunites }: Props) {
  const { t } = useTranslation();

  // Rien à montrer des deux côtés : la carte disparaît plutôt que d'afficher
  // deux vides l'un sous l'autre.
  if (corridors.length === 0 && opportunites.length === 0) return null;

  return (
    <Card>
      <Txt style={styles.titre}>{t('performance.revenue_title')}</Txt>

      {corridors.length > 0 ? (
        <View style={styles.liste} testID="performance-corridors">
          {corridors.map((corridor) => (
            <View
              key={`${corridor.pickup_governorate}-${corridor.dropoff_governorate}`}
              testID="performance-corridor-ligne"
              style={styles.ligne}
            >
              <View style={styles.colonneGauche}>
                <Txt style={styles.corridor}>
                  {corridor.pickup_governorate} → {corridor.dropoff_governorate}
                </Txt>
                <Txt style={styles.detail}>
                  {t('performance.missions_count', {
                    count: corridor.missions,
                    returns: corridor.return_trip_missions,
                  })}
                </Txt>
              </View>
              <Txt style={styles.montant}>
                {formatAmount(corridor.revenue_net)}
              </Txt>
            </View>
          ))}
        </View>
      ) : (
        <Txt style={styles.vide} testID="performance-corridors-vide">
          {t('performance.revenue_empty')}
        </Txt>
      )}

      {opportunites.length > 0 && (
        <View style={styles.section} testID="performance-opportunites">
          <Txt style={styles.sousTitre}>
            {t('performance.underserved_title')}
          </Txt>
          {opportunites.map((corridor) => (
            <View
              key={`${corridor.pickup_governorate}-${corridor.dropoff_governorate}`}
              testID="performance-opportunite"
              style={styles.ligne}
            >
              <Txt style={styles.corridor}>
                {corridor.pickup_governorate} → {corridor.dropoff_governorate}
              </Txt>
              <Txt style={styles.detail}>
                {t('performance.underserved_count', {
                  count: corridor.pending_demands,
                })}
              </Txt>
            </View>
          ))}
        </View>
      )}
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
  sousTitre: {
    fontSize: fontSize.md,
    fontWeight: '700',
    color: colors.neutral[900],
    marginBottom: spacing.sm,
  },
  liste: { gap: spacing.sm },
  section: {
    marginTop: spacing.lg,
    paddingTop: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.neutral[200],
  },
  ligne: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  colonneGauche: { flex: 1 },
  corridor: {
    fontSize: fontSize.md,
    fontWeight: '600',
    color: colors.neutral[900],
  },
  detail: { fontSize: fontSize.sm, color: colors.neutral[500] },
  montant: {
    fontSize: fontSize.md,
    fontWeight: '700',
    color: colors.neutral[900],
  },
  vide: { fontSize: fontSize.sm, color: colors.neutral[500] },
});
