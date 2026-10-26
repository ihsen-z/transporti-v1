import { StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Card } from '@/shared/ui/Card';
import { Icon, type IconName } from '@/shared/ui/icons';
import { Txt } from '@/shared/ui/Txt';
import { colors, spacing, fontSize, radii, TOUCH_TARGET } from '@/shared/theme';
import { usePaymentConfig } from '@/features/payments/api/usePaymentConfig';
import { formatAmount } from '@/shared/format/money';

/**
 * Le parcours d'un rôle, raconté étape par étape, puis ce qui le sécurise.
 *
 * Pourquoi les deux métiers ne partagent pas un seul récit. La cartographie
 * identifie « Confiance & sécurité » comme la levée de l'objection n°1 du
 * persona client — « manque de confiance » (vision §7) — et le transporteur
 * n'a pas la même objection : la sienne est l'impayé. Un texte unique
 * répondrait mal aux deux.
 *
 * Les étapes décrivent ce que l'application FAIT aujourd'hui, pas ce qu'elle
 * promet. Une page « comment ça marche » qui décrit une fonctionnalité à venir
 * est le même défaut que le badge de réservation immédiate retiré au lot 3.
 */

export type Parcours = 'CLIENT' | 'TRANSPORTER';

/** Étapes d'un parcours, dans l'ordre où l'utilisateur les rencontre. */
const ETAPES: Record<Parcours, readonly { cle: string; icone: IconName }[]> = {
  CLIENT: [
    { cle: 'search', icone: 'search' },
    { cle: 'compare', icone: 'shield-check' },
    { cle: 'request', icone: 'send' },
    { cle: 'pay', icone: 'banknote' },
    { cle: 'track', icone: 'route' },
    { cle: 'confirm', icone: 'circle-check' },
  ],
  TRANSPORTER: [
    { cle: 'publish', icone: 'circle-plus' },
    { cle: 'decide', icone: 'inbox' },
    { cle: 'start', icone: 'truck' },
    { cle: 'deliver', icone: 'circle-check' },
    { cle: 'earn', icone: 'trending-up' },
    { cle: 'withdraw', icone: 'wallet' },
  ],
};

/** Garanties transverses. Le vocabulaire reste celui de l'utilisateur. */
const GARANTIES: readonly { cle: string; icone: IconName }[] = [
  { cle: 'escrow', icone: 'lock' },
  { cle: 'verified', icone: 'shield-check' },
  { cle: 'dispute', icone: 'circle-alert' },
  { cle: 'data', icone: 'file-text' },
];

interface Props {
  parcours: Parcours;
}

export function TrustExplainer({ parcours }: Props) {
  const { t } = useTranslation();
  const prefixe =
    parcours === 'CLIENT' ? 'how_it_works.client' : 'how_it_works.transporter';
  // Le plafond espèces vient du serveur (l'étape « payer » le cite).
  const { cod_max_amount } = usePaymentConfig();
  const plafond = { max: formatAmount(cod_max_amount) };

  return (
    <View style={s.bloc}>
      <Txt style={s.promesse}>{t(`${prefixe}.promise`)}</Txt>

      <View style={s.etapes}>
        {ETAPES[parcours].map((etape, index) => (
          <View key={etape.cle} style={s.etape}>
            {/* Le numéro porte l'ordre, l'icône porte la nature de l'action.
                Les deux ensemble : une étape se retrouve du regard sans
                relire la phrase entière. */}
            <View style={s.rang}>
              <Txt style={s.rangTexte}>{index + 1}</Txt>
            </View>
            <View style={s.etapeCorps}>
              <View style={s.etapeTitreLigne}>
                <Icon name={etape.icone} size={18} color={colors.brand[600]} />
                <Txt style={s.etapeTitre}>{t(`${prefixe}.steps.${etape.cle}.title`)}</Txt>
              </View>
              <Txt style={s.etapeTexte}>
                {t(`${prefixe}.steps.${etape.cle}.body`, plafond)}
              </Txt>
            </View>
          </View>
        ))}
      </View>

      <Txt style={s.sectionTitre}>{t('how_it_works.trust_title')}</Txt>
      {GARANTIES.map((garantie) => (
        <Card key={garantie.cle} style={s.garantie}>
          <View style={s.garantieTitreLigne}>
            <Icon name={garantie.icone} size={20} color={colors.green[700]} />
            <Txt style={s.garantieTitre}>
              {t(`how_it_works.trust.${garantie.cle}.title`)}
            </Txt>
          </View>
          <Txt style={s.garantieTexte}>
            {t(`how_it_works.trust.${garantie.cle}.body`)}
          </Txt>
        </Card>
      ))}
    </View>
  );
}

const s = StyleSheet.create({
  bloc: { gap: spacing.lg },
  promesse: {
    fontSize: fontSize.lg,
    fontWeight: '700',
    color: colors.neutral[900],
    lineHeight: 26,
  },
  etapes: { gap: spacing.md },
  etape: { flexDirection: 'row', gap: spacing.md, alignItems: 'flex-start' },
  rang: {
    width: 26,
    height: 26,
    borderRadius: radii.full,
    backgroundColor: colors.brand[50],
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  rangTexte: { fontSize: fontSize.sm, fontWeight: '800', color: colors.brand[600] },
  etapeCorps: { flex: 1, gap: spacing.xs },
  etapeTitreLigne: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  etapeTitre: {
    flex: 1,
    fontSize: fontSize.md,
    fontWeight: '700',
    color: colors.neutral[900],
  },
  etapeTexte: { fontSize: fontSize.sm, color: colors.neutral[500], lineHeight: 20 },
  sectionTitre: {
    fontSize: fontSize.lg,
    fontWeight: '800',
    color: colors.neutral[900],
    marginTop: spacing.sm,
  },
  garantie: { gap: spacing.sm, minHeight: TOUCH_TARGET },
  garantieTitreLigne: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  garantieTitre: {
    flex: 1,
    fontSize: fontSize.md,
    fontWeight: '700',
    color: colors.neutral[900],
  },
  garantieTexte: { fontSize: fontSize.sm, color: colors.neutral[700], lineHeight: 20 },
});
