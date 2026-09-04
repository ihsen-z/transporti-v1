import { StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Icon } from '@/shared/ui/icons';
import { Txt } from '@/shared/ui/Txt';
import { Button } from '@/shared/ui/Button';
import { colors, spacing, fontSize } from '@/shared/theme';

interface Props {
  /** Message propre à l'écran, quand le générique ne dit pas assez. */
  message?: string;
}

/**
 * Lot 7.6 — repli d'une route profonde dont l'identifiant ne mène nulle part
 * (E-19).
 *
 * Quatre routes partageaient le même défaut : `mission/[id]`,
 * `messages/[jobId]`, `requests/[jobId]` et `transporteur/[id]` calculent un
 * `valid`, passent `null` à leurs hooks quand il est faux… et rendent alors un
 * écran vide, sans message ni sortie. Ces routes sont atteignables d'un tap de
 * notification, donc le cas n'est pas théorique.
 *
 * Ce n'est délibérément PAS `ErrorScreen` : celui-là est le repli de
 * l'ErrorBoundary, il annonce « une erreur inattendue est survenue » et propose
 * de réessayer. Ici rien n'est inattendu et réessayer ne changerait rien — le
 * lien ne mène simplement nulle part. Dire « erreur » serait aussi faux que se
 * taire.
 */
export function RouteUnavailable({ message }: Props) {
  const { t } = useTranslation();
  const router = useRouter();

  return (
    <View style={s.wrap} testID="route-unavailable">
      <View style={s.iconWrap}>
        <Icon name="circle-alert" size={34} color={colors.neutral[500]} />
      </View>
      <Txt style={s.titre}>{t('errors.route.title')}</Txt>
      <Txt style={s.sousTitre}>{message ?? t('errors.route.subtitle')}</Txt>
      <Button
        testID="route-unavailable-back"
        label={t('errors.route.back')}
        onPress={() => {
          // Une notification peut ouvrir l'app directement sur cette route :
          // il n'y a alors aucune pile a remonter, et `back()` ne ferait rien.
          if (router.canGoBack()) router.back();
          else router.replace('/home');
        }}
        variant="primary"
        style={s.cta}
      />
    </View>
  );
}

const s = StyleSheet.create({
  wrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
    gap: spacing.sm,
  },
  iconWrap: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.neutral[100],
    marginBottom: spacing.sm,
  },
  titre: {
    fontSize: fontSize.lg,
    fontWeight: '800',
    color: colors.neutral[900],
    textAlign: 'center',
  },
  sousTitre: {
    fontSize: fontSize.md,
    color: colors.neutral[500],
    textAlign: 'center',
  },
  cta: { marginTop: spacing.lg, alignSelf: 'stretch' },
});
