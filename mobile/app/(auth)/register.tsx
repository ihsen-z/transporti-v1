import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Link } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { RegisterForm } from '@/features/auth/components/RegisterForm';
import { LanguageToggle } from '@/shared/ui/LanguageToggle';
import { Logo } from '@/shared/ui/Logo';
import { colors, spacing, fontSize } from '@/shared/theme';

// Route mince : composition uniquement. La logique vit dans RegisterForm.
export default function RegisterScreen() {
  const { t } = useTranslation();

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.flex}
      >
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.topBar}>
            <LanguageToggle />
          </View>

          <View style={styles.header}>
            <Logo wordmark size={36} />
          </View>

          <View style={styles.titleBlock}>
            <Text style={styles.title}>{t('auth.register.title')}</Text>
            <Text style={styles.subtitle}>{t('auth.register.subtitle')}</Text>
          </View>

          <RegisterForm />

          <View style={styles.footer}>
            <Text style={styles.footerText}>{t('auth.register.have_account')} </Text>
            <Link href="/login" style={styles.footerLink}>
              {t('auth.register.login_link')}
            </Link>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.neutral[0] },
  flex: { flex: 1 },
  content: { flexGrow: 1, padding: spacing.xl, gap: spacing.xl },
  topBar: { flexDirection: 'row', justifyContent: 'flex-end' },
  header: { gap: spacing.sm },
  titleBlock: { gap: spacing.xs },
  title: { fontSize: fontSize['2xl'], fontWeight: '800', color: colors.neutral[900] },
  subtitle: { fontSize: fontSize.md, color: colors.neutral[500] },
  footer: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', flexWrap: 'wrap' },
  footerText: { fontSize: fontSize.md, color: colors.neutral[500] },
  footerLink: { fontSize: fontSize.md, fontWeight: '700', color: colors.brand[600] },
});
