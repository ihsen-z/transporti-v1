import { StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Txt } from '@/shared/ui/Txt';
import { Button } from '@/shared/ui/Button';
import { Card } from '@/shared/ui/Card';
import { colors, spacing, fontSize } from '@/shared/theme';
import type { MatchParams } from '../api/dto';

interface Props {
  /** Paramètres de la recherche qui n'a rien donné. */
  params: MatchParams;
  /** Rejoue la même recherche sans la date. */
  onVoirCorridor: () => void;
  onCreerAlerte: () => void;
  alerteCreee: boolean;
  alertePending: boolean;
}

/**
 * Lot 6.3 — l'état vide de la recherche ne proposait qu'UNE sortie, l'alerte
 * corridor, là où IA-3 en exige deux (E-09). Or ce n'est pas un cas mais deux,
 * et le code savait déjà les distinguer.
 *
 * `return-trips/match/` traite `date` comme facultatif — fenêtre serveur
 * `window_hours`, 48 h par défaut, résultats triés par écart à la date. Une
 * recherche datée qui ne donne rien ne dit donc RIEN sur le corridor lui-même :
 * elle dit seulement « pas ce jour-là ». Rejouer la même requête sans la date
 * est une sortie immédiate, exacte, et qui ne coûte ni endpoint ni hook.
 *
 * L'écran devient ainsi diagnostique : il sépare « rien ce jour-là » de « rien
 * sur ce corridor », et ne propose la sortie différée que dans le second cas,
 * quand elle est réellement la seule chose à offrir.
 */
export function SearchEmptyState({
  params,
  onVoirCorridor,
  onCreerAlerte,
  alerteCreee,
  alertePending,
}: Props) {
  const { t } = useTranslation();
  const estDatee = Boolean(params.date);

  return (
    <Card style={styles.carte}>
      <Txt style={styles.titre}>
        {estDatee ? t('search.empty.dated_title') : t('search.no_results_title')}
      </Txt>
      <Txt style={styles.indice}>
        {estDatee
          ? t('search.empty.dated_hint', {
              depart: params.pickup_governorate,
              arrivee: params.dropoff_governorate,
            })
          : t('search.no_results_hint')}
      </Txt>

      {/* Sortie immédiate, quand elle existe : élargir à tout le corridor.
          Elle passe avant l'alerte parce qu'elle peut répondre tout de suite,
          là où l'alerte ne promet que plus tard. */}
      {estDatee ? (
        <Button
          testID="search-voir-corridor"
          label={t('search.empty.see_corridor')}
          onPress={onVoirCorridor}
          variant="cta"
        />
      ) : null}

      {alerteCreee ? (
        <Txt testID="search-alert-created" style={styles.alerteOk}>
          {t('search.alert_created')}
        </Txt>
      ) : (
        <View>
          <Button
            testID="search-create-alert"
            label={t('search.create_alert')}
            onPress={onCreerAlerte}
            // Un seul CTA orange par écran : quand « Voir tout le corridor »
            // est là, c'est lui qui le porte, et l'alerte devient secondaire.
            variant={estDatee ? 'ghost' : 'primary'}
            loading={alertePending}
          />
        </View>
      )}
    </Card>
  );
}

// Repris a l'identique de l'ancien etat vide de search.tsx : aucun changement
// visuel, seul le contenu se dedouble.
const styles = StyleSheet.create({
  carte: { gap: spacing.md, marginTop: spacing.lg },
  titre: {
    fontSize: fontSize.lg,
    fontWeight: '800',
    color: colors.neutral[900],
    textAlign: 'center',
  },
  indice: { fontSize: fontSize.md, color: colors.neutral[500], textAlign: 'center' },
  alerteOk: {
    fontSize: fontSize.md,
    fontWeight: '700',
    color: colors.text.green,
    textAlign: 'center',
  },
});
