import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '@/core/auth/authStore';
import { Button } from '@/shared/ui/Button';
import { LanguageToggle } from '@/shared/ui/LanguageToggle';
import { colors, spacing, fontSize, radii } from '@/shared/theme';

// Onglet Profil : identité, rôle, langue et déconnexion.
export default function ProfileScreen() {
  const { t } = useTranslation();
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.body}>
        <Text style={styles.title}>{t('profile.title')}</Text>

        {user ? (
          <View style={styles.identity}>
            <Text style={styles.email}>{user.email}</Text>
            <View style={styles.roleChip}>
              <Text style={styles.roleChipText}>{t(`role.${user.role}`)}</Text>
            </View>
          </View>
        ) : null}

        <View style={styles.row}>
          <Text style={styles.rowLabel}>{t('profile.language')}</Text>
          <LanguageToggle />
        </View>
      </View>

      <View style={styles.footer}>
        <Button label={t('profile.logout')} onPress={() => void logout()} />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.neutral[0], padding: spacing.xl },
  body: { flex: 1, gap: spacing.xl, paddingTop: spacing.xl },
  title: {
    fontSize: fontSize['2xl'],
    fontWeight: '800',
    color: colors.neutral[900],
  },
  identity: { gap: spacing.sm },
  email: { fontSize: fontSize.md, color: colors.neutral[700] },
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
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  rowLabel: {
    fontSize: fontSize.md,
    fontWeight: '600',
    color: colors.neutral[700],
  },
  footer: { paddingTop: spacing.lg },
});
