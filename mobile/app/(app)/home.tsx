import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '@/core/auth/authStore';
import { colors, spacing, fontSize, radii } from '@/shared/theme';

// Onglet Accueil : point d'entrée rôle-aware. Le funnel métier (recherche
// client / publication transporteur) vit dans les onglets dédiés.
export default function HomeScreen() {
  const { t } = useTranslation();
  const user = useAuthStore((s) => s.user);

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.body}>
        <Text style={styles.welcome}>
          {t('home.welcome')}
          {user?.firstName ? `, ${user.firstName}` : ''}
        </Text>
        <Text style={styles.subtitle}>{t('home.subtitle')}</Text>

        {user ? (
          <View style={styles.roleChip}>
            <Text style={styles.roleChipText}>
              {t('home.role_label')} : {t(`role.${user.role}`)}
            </Text>
          </View>
        ) : null}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.neutral[0], padding: spacing.xl },
  body: { flex: 1, justifyContent: 'center', gap: spacing.md },
  welcome: {
    fontSize: fontSize['2xl'],
    fontWeight: '800',
    color: colors.neutral[900],
  },
  subtitle: { fontSize: fontSize.md, color: colors.neutral[500] },
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
});
