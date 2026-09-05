import { StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Txt } from '@/shared/ui/Txt';
import { Card } from '@/shared/ui/Card';
import { Badge } from '@/shared/ui/Badge';
import { statusVariant } from '@/shared/ui/statusVariant';
import { SkeletonList } from '@/shared/ui/SkeletonList';
import { RouteUnavailable } from '@/shared/ui/RouteUnavailable';
import { colors, spacing, fontSize } from '@/shared/theme';
import { useJobDetail } from '@/features/tracking/api/useJobDetail';
import { useJobRequests } from '@/features/requests/api/useJobRequests';
import { MissionTimeline } from '@/features/tracking/components/MissionTimeline';
import { RequestGoodsSummary } from '@/features/requests/components/RequestGoodsSummary';
import type { TripRequestDto } from '@/features/requests/api/dto';

interface Props {
  jobId: number;
}

/**
 * Lot 7.1 — l'écran de mission du transporteur (E-12, story T-13).
 *
 * Tout tenait dans `MissionCard`, sur l'Accueil : le transporteur n'avait ni
 * jalons, ni fil d'événements, ni détail de marchandise, ni historique
 * consultable — alors que la cliente disposait de tout cela sur `mission/[id]`.
 *
 * Aucun travail serveur : `GET jobs/<id>/` répond déjà au transporteur (il a
 * une offre acceptée sur ce job) et sert `events`. La marchandise vient de
 * `jobs/<id>/requests/`, réservé au propriétaire du trajet : `my_trip_request`
 * ne conviendrait pas, il rend `null` pour le propriétaire par construction —
 * c'est la demande DU CLIENT.
 *
 * L'écran SUIT une mission, il ne la pilote pas : les actions (démarrer,
 * clôturer par PIN, annuler, ouvrir un litige) restent sur `MissionCard`. Les
 * dupliquer ici ferait deux sources pour la même mutation, donc deux états à
 * tenir d'accord — l'objection que le code oppose déjà aux listes dupliquées.
 *
 * L'argent n'y figure pas non plus, et c'est délibéré : le détail sert le prix
 * client et le taux de commission, mais PAS le net. Le calculer ici violerait
 * la règle « le montant vient du serveur, jamais d'un recalcul local ». Le net
 * est déjà servi tout fait sur la carte d'accueil et dans Gains.
 */
export function TransporterMissionView({ jobId }: Props) {
  const { t } = useTranslation();
  const job = useJobDetail(jobId);
  const demandes = useJobRequests(jobId);

  if (job.isError) return <RouteUnavailable />;
  if (job.isLoading || !job.data) return <SkeletonList />;

  const d = job.data;
  // La demande retenue porte la marchandise. On ne prend que celle qui est
  // ACCEPTED : les autres ont ete refusees ou attendent encore.
  const acceptee =
    (demandes.data ?? []).find((r: TripRequestDto) => r.status === 'ACCEPTED') ?? null;

  return (
    <View style={s.contenu}>
      <Card>
        <View style={s.enTete}>
          <Txt style={s.corridor} numberOfLines={2}>
            {d.pickup_governorate} → {d.dropoff_governorate}
          </Txt>
          <Badge label={t(`missions.status.${d.status}`)} variant={statusVariant(d.status)} />
        </View>
        {/* Le nom du client vient de la demande acceptee, PAS de `owner` :
            sur un trajet retour, le proprietaire du job est le transporteur
            lui-meme. */}
        {acceptee ? (
          <Txt style={s.client}>
            {t('missions.detail.client', { nom: acceptee.client_name })}
          </Txt>
        ) : null}
        {d.description ? <Txt style={s.description}>{d.description}</Txt> : null}
      </Card>

      {acceptee ? (
        <Card>
          <Txt style={s.section}>{t('missions.detail.goods')}</Txt>
          <RequestGoodsSummary request={acceptee} />
          {acceptee.description ? (
            <Txt style={s.description}>{acceptee.description}</Txt>
          ) : null}
        </Card>
      ) : null}

      <Card>
        <Txt style={s.section}>{t('missions.detail.timeline')}</Txt>
        <MissionTimeline events={d.events} />
      </Card>
    </View>
  );
}

const s = StyleSheet.create({
  contenu: { gap: spacing.md },
  enTete: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  corridor: { flex: 1, fontSize: fontSize.lg, fontWeight: '800', color: colors.neutral[900] },
  client: { fontSize: fontSize.md, color: colors.neutral[500], marginTop: spacing.xs },
  description: { fontSize: fontSize.md, color: colors.neutral[700], marginTop: spacing.sm },
  section: {
    fontSize: fontSize.md,
    fontWeight: '800',
    color: colors.brand[600],
    marginBottom: spacing.sm,
  },
});
