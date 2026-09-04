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
  /** Rejoue la même recherche sans les filtres marchandise. */
  onRetirerFiltres: () => void;
  /** Rejoue la recherche en ajoutant les gouvernorats voisins au départ. */
  onElargirVoisins: () => void;
  /**
   * Noms localisés des voisins qu'on peut proposer. Vide quand il n'y en a
   * aucun dans le rayon, ou quand on a déjà élargi — on ne propose pas deux
   * fois la même chose.
   */
  voisins: string[];
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
 *
 * Lot 6.4 — les filtres marchandise ajoutent une TROISIÈME cause, et la même
 * règle s'y applique. Une recherche filtrée qui ne donne rien ne dit rien du
 * corridor non plus : elle dit « rien à cette taille ». Sans ce cas, le lot 6.4
 * aurait réintroduit exactement le défaut que le 6.3 venait de corriger —
 * annoncer un corridor vide sans l'avoir regardé.
 *
 * Et quand le corridor est vraiment vide, sans date ni filtre, la seconde
 * sortie est l'élargissement aux gouvernorats voisins. Ce n'est PAS la demande
 * classique : l'arbitrage du 04/09 l'avait retenue, mais la réponse du terrain
 * l'a écartée pour cette version — les transporteurs individuels consultent
 * rarement le web, et le bassin `jobs/public/` est surtout lu par des sociétés
 * de transport, segment que cette version ne sert pas encore.
 */
export function SearchEmptyState({
  params,
  onVoirCorridor,
  onRetirerFiltres,
  onElargirVoisins,
  voisins,
  onCreerAlerte,
  alerteCreee,
  alertePending,
}: Props) {
  const { t } = useTranslation();
  const estFiltree = Boolean(params.job_type || params.weight_kg || params.volume_m3);
  const estDatee = Boolean(params.date);

  // Une seule sortie immédiate à la fois, et c'est la contrainte la PLUS
  // restrictive qu'on propose de lever en premier : les filtres marchandise
  // avant la date. Sinon on garderait plusieurs CTA sur un même écran, contre
  // la charte, et on demanderait à la cliente de deviner laquelle a mordu.
  const leverFiltres = estFiltree;
  const elargirDates = !estFiltree && estDatee;
  // Dernier recours immédiat : le corridor est vraiment vide, mais un départ
  // voisin peut ne pas l'être. C'est la seconde sortie du cas sans contrainte,
  // celle qui manquait a IA-3 (E-09).
  const elargirVoisins = !estFiltree && !estDatee && voisins.length > 0;

  return (
    <Card style={styles.carte}>
      <Txt style={styles.titre}>
        {leverFiltres
          ? t('search.empty.filtered_title')
          : elargirDates
            ? t('search.empty.dated_title')
            : t('search.no_results_title')}
      </Txt>
      <Txt style={styles.indice}>
        {leverFiltres
          ? t('search.empty.filtered_hint')
          : elargirDates
            ? t('search.empty.dated_hint', {
                depart: params.pickup_governorate,
                arrivee: params.dropoff_governorate,
              })
            : t('search.no_results_hint')}
      </Txt>

      {/* Sortie immédiate, quand elle existe. Elle passe avant l'alerte parce
          qu'elle peut répondre tout de suite, là où l'alerte ne promet que
          plus tard. */}
      {leverFiltres ? (
        <Button
          testID="search-retirer-filtres"
          label={t('search.empty.drop_filters')}
          onPress={onRetirerFiltres}
          variant="cta"
        />
      ) : null}
      {elargirDates ? (
        <Button
          testID="search-voir-corridor"
          label={t('search.empty.see_corridor')}
          onPress={onVoirCorridor}
          variant="cta"
        />
      ) : null}
      {elargirVoisins ? (
        <>
          <Txt style={styles.indice}>
            {t('search.empty.neighbours_hint', { liste: voisins.join(', ') })}
          </Txt>
          <Button
            testID="search-elargir-voisins"
            label={t('search.empty.widen_neighbours')}
            onPress={onElargirVoisins}
            variant="cta"
          />
        </>
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
            // Un seul CTA orange par écran : quand une sortie immédiate est
            // là, c'est elle qui le porte, et l'alerte devient secondaire.
            variant={leverFiltres || elargirDates || elargirVoisins ? 'ghost' : 'primary'}
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
