import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { GlassCard } from '@/shared/ui/GlassCard';
import { Stat } from '@/shared/ui/Stat';
import { Txt } from '@/shared/ui/Txt';
import { formatAmount } from '@/shared/format/money';
import { colors, spacing, fontSize, tracking } from '@/shared/theme';
import type { TransporterStatsDto } from '@/features/stats/api/dto';

// Hero du tableau de bord transporteur : le montant gagné en grand, puis les
// deux KPI du pivot « retours à vide » (K12).
//
// Il est posé DANS le bandeau bleu et rendu en verre. Avant, c'était une carte
// à dégradé sur fond clair — ce que la charte interdit explicitement : « pas de
// dégradé décoratif sur les cartes, le dégradé est réservé au fond d'écran ».
// Deux bleus dégradés l'un sur l'autre se concurrençaient ; le verre, lui,
// laisse le fond porter la couleur et ne fait que la relever.
//
// Écart assumé avec la maquette : elle titre « Revenus ce mois ». L'endpoint
// canonique ne fournit pas d'agrégat mensuel — `earnings_confirmed` (K4) est
// l'escrow libéré depuis toujours. On affiche donc « Gains confirmés », qui
// décrit exactement le chiffre servi, plutôt qu'un intitulé faux.
interface Props {
  stats: TransporterStatsDto | undefined;
  loading: boolean;
}

export function TransporterHero({ stats, loading }: Props) {
  const { t } = useTranslation();

  // `fill_rate` et `km_transformed` valent null / 0 tant qu'aucun trajet retour
  // n'est publié. Le contrat KPI impose « — » dans ce cas, jamais un faux 0 %.
  const fillRate = stats?.fill_rate ?? null;
  const km = stats?.km_transformed;

  return (
    <GlassCard>
      <Txt style={styles.label}>{t('home.earnings_label')}</Txt>

      {loading ? (
        <View style={styles.loader}>
          <ActivityIndicator color={colors.onBlue[100]} />
        </View>
      ) : (
        <Txt style={styles.big}>
          {stats ? formatAmount(stats.earnings_confirmed) : '—'}
          <Txt style={styles.unit}> TND</Txt>
        </Txt>
      )}

      <View style={styles.row}>
        <Stat
          value={fillRate === null ? null : `${fillRate} %`}
          label={t('home.fill_rate')}
          progress={fillRate === null ? null : fillRate / 100}
          // Un taux de remplissage bas est un indicateur à REDRESSER, pas une
          // valeur acquise : sous la moitié, la jauge passe à l'orange.
          intent={fillRate !== null && fillRate < 50 ? 'improve' : 'good'}
        />
        <Stat
          value={km == null ? null : `${formatAmount(km)} km`}
          label={t('home.km_transformed')}
        />
      </View>
    </GlassCard>
  );
}

const styles = StyleSheet.create({
  label: { fontSize: fontSize.meta, fontWeight: '600', color: colors.text.onBlue },
  // Chiffre héro de la charte : 34/800, interlettrage serré.
  big: {
    fontSize: fontSize.hero,
    fontWeight: '800',
    color: colors.onBlue[100],
    letterSpacing: tracking.hero,
    marginTop: 2,
  },
  unit: { fontSize: fontSize.stat, fontWeight: '600', color: colors.onBlue[100] },
  // Même hauteur que le grand chiffre : le hero ne saute pas au chargement.
  loader: { height: fontSize.hero + 4, justifyContent: 'center', alignItems: 'flex-start' },
  row: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md + 2 },
});
