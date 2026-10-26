import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useAuthStore } from '@/core/auth/authStore';
import { TransporterMissionView } from '@/features/missions/components/TransporterMissionView';
import { useTranslation } from 'react-i18next';
import { useJobDetail } from '@/features/tracking/api/useJobDetail';
import { MissionTimeline } from '@/features/tracking/components/MissionTimeline';
import { CancelMissionSheet } from '@/features/tracking/components/CancelMissionSheet';
import { useJobEscrow } from '@/features/payments/api/useJobEscrow';
import type { EscrowDetailDto } from '@/features/payments/api/dto';
import { usePayJob } from '@/features/payments/api/usePayJob';
import { clientDoitPayer } from '@/features/payments/paiementDu';
import { useConfirmCompletion } from '@/features/payments/api/useConfirmCompletion';
import { OpenReviewSheet } from '@/features/reviews/components/OpenReviewSheet';
import { OpenDisputeSheet } from '@/features/disputes/components/OpenDisputeSheet';
import { formatAmount } from '@/shared/format/money';
import { Txt } from '@/shared/ui/Txt';
import { Card } from '@/shared/ui/Card';
import { Badge } from '@/shared/ui/Badge';
import { Button } from '@/shared/ui/Button';
import { RouteRow } from '@/shared/ui/RouteRow';
import { AppScreen } from '@/shared/ui/AppScreen';
import { AppHeader } from '@/shared/ui/AppHeader';
import { BackButton } from '@/shared/ui/BackButton';
import { ActionBar } from '@/shared/ui/ActionBar';
import { InfoBanner } from '@/shared/ui/InfoBanner';
import { SkeletonList } from '@/shared/ui/SkeletonList';
import { RouteUnavailable } from '@/shared/ui/RouteUnavailable';
import { statusVariant } from '@/shared/ui/statusVariant';
import { queryRefreshControl } from '@/shared/ui/queryRefreshControl';
import { showToast } from '@/shared/ui/toastStore';
import { colors, spacing, fontSize } from '@/shared/theme';

// Suivi d'une mission côté CLIENT — l'écran qui manquait.
//
// Le parcours client s'arrêtait à l'acceptation : ni suivi, ni paiement, ni
// confirmation de réception. C'est ce dernier point qui bloquait la boucle
// économique, `payments/confirm-completion/` étant ce qui libère l'escrow.
//
// L'écran compose ; toute la logique vit dans les hooks des features.
export default function MissionScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const jobId = Number(id);
  const valid = Number.isFinite(jobId) && jobId > 0;
  const role = useAuthStore((st) => st.user?.role);
  const isTransporter = role === 'TRANSPORTER';

  const job = useJobDetail(valid ? jobId : null);
  const pay = usePayJob();
  const confirm = useConfirmCompletion();
  const [cancelOpen, setCancelOpen] = useState(false);
  const [reviewOpen, setReviewOpen] = useState(false);
  const [disputeOpen, setDisputeOpen] = useState(false);

  const d = job.data;
  const isDigital = d?.booking_payment_method === 'DIGITAL';
  // L'escrow n'existe que sur le chemin digital : inutile d'interroger le
  // serveur sur une mission payée en espèces.
  const escrow = useJobEscrow(valid ? jobId : null, isDigital);

  // Paiement dû : la cliente, sur une mission acceptée, digitale, pas encore
  // démarrée. Le RÔLE fait partie de la décision et non de son contexte de
  // rendu — voir `clientDoitPayer`, qui existe pour cette raison.
  const awaitingPayment = clientDoitPayer(role, d?.status, d?.booking_payment_method);
  // Réception à confirmer : le transporteur a livré, l'argent attend.
  const awaitingConfirmation = d?.status === 'COMPLETED' && !d.client_confirmed;
  const cancellable = d?.status === 'MATCHED' || d?.status === 'IN_PROGRESS';

  const onPay = () => {
    pay.mutate(jobId, {
      onSuccess: (result) => {
        if (result.sandbox) {
          // Ne jamais annoncer un encaissement qui n'a pas eu lieu : en
          // sandbox aucune passerelle n'a été sollicitée.
          showToast(t('tracking.pay_sandbox'));
        } else {
          showToast(t('tracking.pay_opened'));
        }
      },
      onError: () => showToast(t('tracking.errors.pay')),
    });
  };

  const onConfirm = () => {
    confirm.mutate(jobId, {
      onSuccess: () => showToast(t('tracking.confirm_success')),
      onError: () => showToast(t('tracking.errors.confirm')),
    });
  };

  return (
    <AppScreen
      testID="mission-screen"
      header={
        <AppHeader
          leading={<BackButton testID="mission-detail-back" />}
          title={t('tracking.title')}
        />
      }
      refreshControl={queryRefreshControl(job)}
      footer={
        // Le paiement passe en BARRE D'ACTION FIXE (charte, §Barre d'action) :
        // le total à gauche, l'action unique à droite. Il vivait dans une carte
        // au milieu du défilement — sur une mission avec chronologie fournie,
        // le bouton qui débloque la mission sortait de l'écran.
        awaitingPayment && d?.accepted_transporter ? (
          <ActionBar
            testID="mission-detail-action-bar"
            label={t('tracking.total')}
            amount={`${formatAmount(d.accepted_transporter.total_price)} TND`}
          >
            <Button
              testID="mission-detail-pay"
              label={t('tracking.pay_cta')}
              onPress={onPay}
              variant="cta"
              loading={pay.isPending}
            />
          </ActionBar>
        ) : undefined
      }
    >
        {/* 7.1 — la meme route sert les deux roles. Une notification de
            mission doit pouvoir pointer `/mission/<id>` sans savoir qui
            tapera dessus ; deux routes obligeraient l'emetteur a le deviner.
            Le corps cliente reste intact ci-dessous — son extraction dans son
            propre composant reste a faire, et ce fichier depasse la consigne
            de taille. */}
        {isTransporter ? (
          <TransporterMissionView jobId={jobId} />
        ) : (
          <>
        {/* 7.6 — deux cas menaient au meme ecran mort. Un identifiant
            invalide desactivait le hook, donc `isLoading` restait faux et `d`
            undefined ; et un identifiant numeriquement valide dont la mission
            n'existe pas (ou appartient a quelqu'un d'autre) faisait echouer la
            requete, sans que rien ne l'affiche. Dans les deux cas l'ecran
            montrait un squelette de chargement PERPETUEL, donnant l'illusion
            de travailler — pire qu'un ecran blanc. Le second cas est le plus
            frequent : c'est celui d'une notification qui pointe une mission
            supprimee. */}
        {!valid || job.isError ? (
          <RouteUnavailable />
        ) : job.isLoading || !d ? (
          <SkeletonList />
        ) : (
          <>
            <Card>
              <View style={styles.statusRow}>
                <Badge
                  label={t(`tracking.status.${d.status}`, { defaultValue: d.status })}
                  variant={statusVariant(d.status)}
                />
                {d.booking_payment_method ? (
                  <Badge
                    label={t(`tracking.payment.${d.booking_payment_method}`)}
                    variant={d.booking_payment_method === 'COD' ? 'cod' : 'brand'}
                  />
                ) : null}
              </View>
              <View style={styles.route}>
                <RouteRow from={d.pickup_governorate} to={d.dropoff_governorate} />
              </View>
              {d.accepted_transporter ? (
                <Txt style={styles.transporter}>
                  {t('tracking.transporter', { name: d.accepted_transporter.name })}
                  {d.accepted_transporter.phone ? ` · ${d.accepted_transporter.phone}` : ''}
                </Txt>
              ) : null}
              {d.accepted_transporter ? (
                <Txt style={styles.price}>
                  {formatAmount(d.accepted_transporter.total_price)} TND
                </Txt>
              ) : null}
            </Card>

            {/* Le PIN vient désormais du détail du job : il survit au
                rechargement de l'écran, alors qu'il n'existait auparavant que
                dans la réponse d'une mutation — donc perdu au premier refresh. */}
            {d.delivery_pin ? (
              <Card style={styles.pinBox}>
                <Txt style={styles.pinLabel}>{t('tracking.pin_label')}</Txt>
                <Txt style={styles.pinValue}>{d.delivery_pin}</Txt>
                <Txt style={styles.hint}>{t('tracking.pin_hint')}</Txt>
              </Card>
            ) : null}

            {/* Le bouton est descendu dans la barre fixe ; ce qui reste ici,
                c'est la seule chose qu'il fallait lire AVANT de payer. */}
            {awaitingPayment ? (
              <InfoBanner testID="mission-detail-pay-hint">
                {t('tracking.pay_hint')}
              </InfoBanner>
            ) : null}

            {awaitingConfirmation ? (
              <Card style={styles.actionCard}>
                <Txt style={styles.sectionTitle}>{t('tracking.confirm_title')}</Txt>
                <Txt style={styles.hint}>{t('tracking.confirm_hint')}</Txt>
                <Button
                  testID="mission-detail-confirm"
                  label={t('tracking.confirm_cta')}
                  onPress={onConfirm}
                  variant="accent"
                  loading={confirm.isPending}
                />
              </Card>
            ) : null}

            {isDigital && escrow.data && escrow.data.length > 0 ? (
              <Card style={styles.actionCard}>
                <Txt style={styles.sectionTitle}>{t('tracking.escrow_title')}</Txt>
                {escrow.data.map((e: EscrowDetailDto) => (
                  <View key={e.id} style={styles.escrowRow}>
                    <Txt style={styles.escrowAmount}>{formatAmount(Number(e.amount))} TND</Txt>
                    <Badge
                      label={t(`tracking.escrow.${e.status}`, { defaultValue: e.status })}
                      variant={e.status === 'RELEASED' ? 'verified' : 'warning'}
                    />
                  </View>
                ))}
                <Txt style={styles.hint}>{t('tracking.escrow_hint')}</Txt>
              </Card>
            ) : null}

            <Card>
              <Txt style={styles.sectionTitle}>{t('tracking.timeline_title')}</Txt>
              <View style={styles.timeline}>
                <MissionTimeline events={d.events} />
              </View>
            </Card>

            {/* Avis et litige n'ont de sens qu'une fois la mission terminée.
                Ils étaient auparavant proposés dès l'acceptation, et le serveur
                les refusait. */}
            {d.status === 'COMPLETED' ? (
              <View style={styles.endActions}>
                {!d.has_reviewed ? (
                  <Button
                    testID="mission-detail-review"
                    label={t('reviews.open')}
                    onPress={() => setReviewOpen(true)}
                    variant="primary"
                  />
                ) : null}
                <Pressable
                  testID="mission-detail-open-dispute"
                  onPress={() => setDisputeOpen(true)}
                  accessibilityRole="button"
                >
                  <Txt style={styles.dispute}>{t('disputes.open')}</Txt>
                </Pressable>
              </View>
            ) : null}

            {cancellable ? (
              <Pressable
                testID="mission-detail-cancel"
                onPress={() => setCancelOpen(true)}
                accessibilityRole="button"
              >
                <Txt style={styles.cancel}>{t('tracking.cancel_link')}</Txt>
              </Pressable>
            ) : null}
          </>
        )}
          </>
        )}

      <CancelMissionSheet
        jobId={cancelOpen ? jobId : null}
        onClose={() => setCancelOpen(false)}
        onCancelled={() => {
          showToast(t('tracking.cancel_success'));
          router.back();
        }}
      />
      <OpenReviewSheet jobId={reviewOpen ? jobId : null} onClose={() => setReviewOpen(false)} />
      <OpenDisputeSheet jobId={disputeOpen ? jobId : null} onClose={() => setDisputeOpen(false)} />
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  statusRow: { flexDirection: 'row', gap: spacing.sm, flexWrap: 'wrap' },
  route: { marginTop: spacing.md },
  transporter: { fontSize: fontSize.md, color: colors.neutral[700], marginTop: spacing.sm },
  price: { fontSize: fontSize.lg, fontWeight: '800', color: colors.text.green, marginTop: spacing.xs },
  actionCard: { gap: spacing.sm },
  sectionTitle: { fontSize: fontSize.lg, fontWeight: '800', color: colors.neutral[900] },
  hint: { fontSize: fontSize.sm, color: colors.neutral[500] },
  pinBox: { alignItems: 'center', gap: spacing.xs, backgroundColor: colors.brand[50] },
  pinLabel: { fontSize: fontSize.sm, color: colors.neutral[700], textAlign: 'center' },
  pinValue: { fontSize: 32, fontWeight: '800', letterSpacing: 8, color: colors.text.green },
  escrowRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  escrowAmount: { fontSize: fontSize.md, fontWeight: '800', color: colors.neutral[900] },
  timeline: { marginTop: spacing.md },
  endActions: { gap: spacing.md },
  dispute: {
    color: colors.neutral[500],
    fontSize: fontSize.sm,
    fontWeight: '600',
    textAlign: 'center',
  },
  cancel: {
    color: colors.text.error,
    fontSize: fontSize.sm,
    fontWeight: '600',
    textAlign: 'center',
    marginTop: spacing.sm,
  },
});
