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
          <View style={styles.topBar}>
            <LanguageToggle />
          </View>

          <View style={styles.header}>
            <Text style={styles.brand}>{t('app.name')}</Text>
            <Text style={styles.title}>{t('auth.login.title')}</Text>
            <Text style={styles.subtitle}>{t('auth.login.subtitle')}</Text>
          </View>

          <LoginForm />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.neutral[0] },
  flex: { flex: 1 },
  content: {
    flexGrow: 1,
    padding: spacing.xl,
    gap: spacing['2xl'],
  },
  // Row + flex-end => se place au bord de fin de lecture (flip auto en RTL).
  topBar: { flexDirection: 'row', justifyContent: 'flex-end' },
  header: { gap: spacing.xs },
  brand: {
    fontSize: fontSize.sm,
    fontWeight: '700',
    color: colors.brand[500],
    letterSpacing: 1,
  },
  title: { fontSize: fontSize['2xl'], fontWeight: '800', color: colors.neutral[900] },
  subtitle: { fontSize: fontSize.md, color: colors.neutral[500] },
});
