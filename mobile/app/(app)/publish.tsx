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
import { PublishReturnForm } from '@/features/trips/components/PublishReturnForm';
import { colors, spacing, fontSize } from '@/shared/theme';

// Onglet TRANSPORTEUR : publication d'un retour. Route mince = composition ;
// la logique vit dans la feature trips (PublishReturnForm).
export default function PublishScreen() {
  const { t } = useTranslation();

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.flex}
      >
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.header}>
            <Text style={styles.title}>{t('trips.publish.title')}</Text>
            <Text style={styles.subtitle}>{t('trips.publish.subtitle')}</Text>
          </View>

          <PublishReturnForm />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.neutral[0] },
  flex: { flex: 1 },
  content: { padding: spacing.xl, gap: spacing.xl },
  header: { gap: spacing.xs },
  title: { fontSize: fontSize['2xl'], fontWeight: '800', color: colors.neutral[900] },
  subtitle: { fontSize: fontSize.md, color: colors.neutral[500] },
});
