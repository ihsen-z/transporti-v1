import { StyleSheet, View } from 'react-native';
import { Icon } from '@/shared/ui/icons';
import { Txt } from '@/shared/ui/Txt';
import { Button } from '@/shared/ui/Button';
import { Logo } from '@/shared/ui/Logo';
import { colors, spacing, fontSize } from '@/shared/theme';

// Écran de repli affiché par l'ErrorBoundary racine. Sans lui, une exception de
// rendu laisse un écran BLANC en production : pas de message, pas de bouton,
// pas de sortie — l'utilisateur doit tuer l'application.
//
// Les textes sont volontairement en dur et non traduits : cet écran doit
// pouvoir s'afficher même si c'est l'initialisation d'i18n qui a échoué.
interface Props {
  error: Error;
  onRetry: () => void;
}

export function ErrorScreen({ error, onRetry }: Props) {
  return (
    <View style={styles.wrap}>
      <Logo size={40} wordmark />

      <View style={styles.iconWrap}>
        <Icon name="circle-alert" size={38} color={colors.error} />
      </View>

      <Txt style={styles.title}>Une erreur inattendue est survenue</Txt>
      <Txt style={styles.subtitle}>
        L&apos;application a rencontré un problème et n&apos;a pas pu afficher cet écran.
        Vos données sont intactes.
      </Txt>

      {__DEV__ ? <Txt style={styles.detail}>{error.message}</Txt> : null}

      <Button label="Réessayer" onPress={onRetry} variant="cta" style={styles.cta} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
    backgroundColor: colors.neutral[0],
    gap: spacing.md,
  },
  iconWrap: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.neutral[100],
    marginTop: spacing.lg,
  },
  title: {
    fontSize: fontSize.lg,
    fontWeight: '700',
    color: colors.neutral[900],
    textAlign: 'center',
  },
  subtitle: {
    fontSize: fontSize.md,
    color: colors.neutral[500],
    textAlign: 'center',
  },
  detail: {
    fontSize: fontSize.sm,
    color: colors.neutral[400],
    textAlign: 'center',
  },
  cta: {
    marginTop: spacing.lg,
    alignSelf: 'stretch',
  },
});
