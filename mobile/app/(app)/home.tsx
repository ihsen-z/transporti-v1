import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '@/core/auth/authStore';
import { Button } from '@/shared/ui/Button';
import { LanguageToggle } from '@/shared/ui/LanguageToggle';
import { colors, spacing, fontSize, radii } from '@/shared/theme';

// Accueil provisoire de la zone authentifiée : prouve le bout-en-bout
// (session ouverte, rôle affiché, déconnexion). Les onglets par rôle
// remplaceront cet écran (prochain incrément S1).
export default function HomeScreen() {
  const { t } = useTranslation();
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.topBar}>
        <LanguageToggle />
      </View>

      <View style={styles.body}>
        <Text style={styles.welcome}>
          {t('home.welcome')}
          {user?.firstName ? `, ${user.firstName}` : ''}
        </Text>

        {user ? (
          <View style={styles.roleChip}>
            <Text style={styles.roleChipText}>
              {t('home.role_label')} : {t(`role.${user.role}`)}
            </Text>
          </View>
        ) : null}

        <Text style={styles.wip}>{t('home.wip')}</Text>
      </View>

      <View style={styles.footer}>
        <Button label={t('home.logout')} onPress={() => void logout()} />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.neutral[0], padding: spacing.xl },
  topBar: { flexDirection: 'row', justifyContent: 'flex-end' },
  body: { flex: 1, justifyContent: 'center', gap: spacing.lg },
  welcome: {
    fontSize: fontSize['2xl'],
    fontWeight: '800',
    color: colors.neutral[900],
  },
  // Chip VERT = valeur/confiance (rôle vérifié).
  roleChip: {
    alignSelf: 'flex-start',
    backgroundColor: colors.brand[50],
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md,
    borderRadius: radii.full,
  },
  roleChipText: {
    color: colors.brand[600],
    fontWeight: '700',
    fontSize: fontSize.sm,
  },
  wip: { color: colors.neutral[500], fontSize: fontSize.md },
  footer: { paddingTop: spacing.lg },
});
