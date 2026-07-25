import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { LoginForm } from '@/features/auth/components/LoginForm';
import { LanguageToggle } from '@/shared/ui/LanguageToggle';
import { Logo } from '@/shared/ui/Logo';
import { colors, spacing, fontSize } from '@/shared/theme';

// Route mince : composition uniquement. La logique du formulaire vit dans
// la feature auth (LoginForm).
export default function LoginScreen() {
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
          {/* Row + flex-end => se place au bord de fin de lecture (flip RTL). */}
          <View style={styles.topBar}>
            <LanguageToggle />
          </View>

          <View style={styles.main}>
            {/* Identité de marque : logo officiel (charte). */}
            <View style={styles.header}>
              <Logo wordmark size={40} />
              <Text style={styles.tagline}>{t('app.tagline')}</Text>
            </View>

            <View style={styles.titleBlock}>
              <Text style={styles.title}>{t('auth.login.title')}</Text>
              <Text style={styles.subtitle}>{t('auth.login.subtitle')}</Text>
            </View>

            <LoginForm />
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
  // Bloc central : le formulaire est centré verticalement sur écran haut.
  main: { flex: 1, justifyContent: 'center', gap: spacing['2xl'] },
  header: { gap: spacing.sm },
  tagline: { fontSize: fontSize.sm, color: colors.neutral[500] },
  titleBlock: { gap: spacing.xs },
  title: { fontSize: fontSize['2xl'], fontWeight: '800', color: colors.neutral[900] },
  subtitle: { fontSize: fontSize.md, color: colors.neutral[500] },
});
