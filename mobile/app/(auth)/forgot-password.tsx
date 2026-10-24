import { StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { ForgotPasswordForm } from '@/features/auth/components/ForgotPasswordForm';
import { AuthHeading } from '@/features/auth/components/AuthHeading';
import { AuthLink } from '@/features/auth/components/AuthLink';
import { LanguageToggle } from '@/shared/ui/LanguageToggle';
import { ImmersiveScreen } from '@/shared/ui/ImmersiveScreen';
import { GlassCard } from '@/shared/ui/GlassCard';
import { spacing } from '@/shared/theme';

// Route mince : composition uniquement. La logique vit dans ForgotPasswordForm.
export default function ForgotPasswordScreen() {
  const { t } = useTranslation();

  return (
    <ImmersiveScreen testID="forgot-password-screen">
      <View style={styles.topBar}>
        <LanguageToggle />
      </View>

      <View style={styles.main}>
        <AuthHeading title={t('auth.forgot.title')} subtitle={t('auth.forgot.subtitle')} />

        <GlassCard>
          <ForgotPasswordForm />
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
