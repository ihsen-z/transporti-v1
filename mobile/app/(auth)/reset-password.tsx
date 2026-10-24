import { StyleSheet, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { ResetPasswordForm } from '@/features/auth/components/ResetPasswordForm';
import { AuthHeading } from '@/features/auth/components/AuthHeading';
import { AuthLink } from '@/features/auth/components/AuthLink';
import { LanguageToggle } from '@/shared/ui/LanguageToggle';
import { ImmersiveScreen } from '@/shared/ui/ImmersiveScreen';
import { GlassCard } from '@/shared/ui/GlassCard';
import { FormMessage } from '@/shared/ui/FormMessage';
import { spacing } from '@/shared/theme';

// Route mince : composition uniquement. Atteinte par le lien e-mail (web) ou
// le deep link `transporti://reset-password?uid=...&token=...` (DeepLinkRouter
// -> useDeepLinkRouting). Sans les deux paramètres, le lien est incomplet ou a
// été ouvert hors contexte : inutile d'afficher un formulaire qui échouera.
export default function ResetPasswordScreen() {
  const { t } = useTranslation();
  const { uid, token } = useLocalSearchParams<{ uid?: string; token?: string }>();
  const valid =
    typeof uid === 'string' && uid.length > 0 && typeof token === 'string' && token.length > 0;

  return (
    <ImmersiveScreen testID="reset-password-screen">
      <View style={styles.topBar}>
        <LanguageToggle />
      </View>

      <View style={styles.main}>
        <AuthHeading title={t('auth.reset.title')} subtitle={t('auth.reset.subtitle')} />

        <GlassCard>
          {valid ? (
            <ResetPasswordForm uid={uid} token={token} />
          ) : (
            <FormMessage testID="reset-password-invalid-link">
              {t('auth.reset.invalid_link')}
            </FormMessage>
          )}
        </GlassCard>

        <View style={styles.footer}>
          <AuthLink href="/login" label={t('auth.forgot.back_link')} />
        </View>
      </View>
    </ImmersiveScreen>
  );
}

const styles = StyleSheet.create({
  topBar: { flexDirection: 'row', justifyContent: 'flex-end' },
  main: { flex: 1, justifyContent: 'center', gap: spacing.xl },
  footer: { alignItems: 'center' },
});
