import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Link, useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { ResetPasswordForm } from '@/features/auth/components/ResetPasswordForm';
import { LanguageToggle } from '@/shared/ui/LanguageToggle';
import { Logo } from '@/shared/ui/Logo';
import { colors, spacing, fontSize } from '@/shared/theme';

// Route mince : composition uniquement. Atteinte par le lien e-mail (web) ou
// le deep link `transporti://reset-password?uid=...&token=...` (DeepLinkRouter
// -> useDeepLinkRouting). Sans les deux paramètres, le lien est incomplet ou a
// été ouvert hors contexte : inutile d'afficher un formulaire qui échouera.
export default function ResetPasswordScreen() {
  const { t } = useTranslation();
  const { uid, token } = useLocalSearchParams<{ uid?: string; token?: string }>();
  const valid = typeof uid === 'string' && uid.length > 0 && typeof token === 'string' && token.length > 0;

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.flex}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <View style={styles.topBar}>
            <LanguageToggle />
          </View>

          <View style={styles.main}>
            <View style={styles.header}>
              <Logo wordmark size={36} />
            </View>

            <View style={styles.titleBlock}>
              <Text style={styles.title}>{t('auth.reset.title')}</Text>
              <Text style={styles.subtitle}>{t('auth.reset.subtitle')}</Text>
            </View>

            {valid ? (
              <ResetPasswordForm uid={uid} token={token} />
            ) : (
              <Text style={styles.invalid}>{t('auth.reset.invalid_link')}</Text>
            )}

            <View style={styles.footer}>
              <Link href="/login" style={styles.footerLink}>
                {t('auth.forgot.back_link')}
              </Link>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.neutral[0] },
  flex: { flex: 1 },
  content: { flexGrow: 1, padding: spacing.xl },
  topBar: { flexDirection: 'row', justifyContent: 'flex-end', marginBottom: spacing.xl },
  main: { flex: 1, justifyContent: 'center', gap: spacing['2xl'] },
  header: { gap: spacing.sm },
  titleBlock: { gap: spacing.xs },
  title: { fontSize: fontSize['2xl'], fontWeight: '800', color: colors.neutral[900] },
  subtitle: { fontSize: fontSize.md, color: colors.neutral[500] },
  invalid: { fontSize: fontSize.md, color: colors.text.error, fontWeight: '600', textAlign: 'center' },
  footer: { alignItems: 'center' },
  footerLink: { fontSize: fontSize.md, fontWeight: '700', color: colors.brand[600] },
});
