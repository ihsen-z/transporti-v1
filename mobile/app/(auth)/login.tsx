import { StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { LoginForm } from '@/features/auth/components/LoginForm';
import { AuthHeading } from '@/features/auth/components/AuthHeading';
import { AuthLink } from '@/features/auth/components/AuthLink';
import { LanguageToggle } from '@/shared/ui/LanguageToggle';
import { ImmersiveScreen } from '@/shared/ui/ImmersiveScreen';
import { GlassCard } from '@/shared/ui/GlassCard';
import { Txt } from '@/shared/ui/Txt';
import { colors, spacing, fontSize } from '@/shared/theme';

// Route mince : composition uniquement. La logique du formulaire vit dans
// la feature auth (LoginForm).
//
// Famille IMMERSIVE (charte) : dégradé bleu plein écran, deux halos, carte de
// verre. Les boutons sociaux que la charte dessine sur cet écran ne sont PAS
// rendus : l'application n'a pas d'authentification Google ni Facebook. Un
// bouton qui ne mène nulle part coûte plus cher qu'un bouton absent.
export default function LoginScreen() {
  const { t } = useTranslation();

  return (
    <ImmersiveScreen testID="login-screen">
      {/* Row + flex-end => se place au bord de fin de lecture (flip RTL). */}
      <View style={styles.topBar}>
        <LanguageToggle />
      </View>

      <View style={styles.main}>
        <AuthHeading title={t('auth.login.title')} subtitle={t('auth.login.subtitle')} />

        <GlassCard>
          <LoginForm />
        </GlassCard>

        <View style={styles.links}>
          <AuthLink href="/forgot-password" label={t('auth.login.forgot_link')} />
          <View style={styles.registerRow}>
            <Txt style={styles.registerText}>{t('auth.login.no_account')} </Txt>
            <AuthLink href="/register" label={t('auth.login.register_link')} />
          </View>
        </View>
      </View>
    </ImmersiveScreen>
  );
}

const styles = StyleSheet.create({
  topBar: { flexDirection: 'row', justifyContent: 'flex-end' },
  // Bloc central : le formulaire est centré verticalement sur écran haut.
  main: { flex: 1, justifyContent: 'center', gap: spacing.xl },
  links: { gap: spacing.lg, alignItems: 'center' },
  registerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  registerText: { fontSize: fontSize.md, color: colors.text.onBlue },
});
