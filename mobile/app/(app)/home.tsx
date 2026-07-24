import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '@/core/auth/authStore';
import { MissionsList } from '@/features/missions/components/MissionsList';
import { MyRequestsList } from '@/features/my-requests/components/MyRequestsList';
import { NotificationBell } from '@/features/notifications/components/NotificationBell';
import { colors, spacing, fontSize, radii } from '@/shared/theme';

// Onglet Accueil, rôle-aware. Le transporteur y voit ses missions actives
// (démarrage COD + clôture PIN). Le funnel client viendra sur l'onglet Recherche.
export default function HomeScreen() {
  const { t } = useTranslation();
  const user = useAuthStore((s) => s.user);
  const isTransporter = user?.role === 'TRANSPORTER';
  const isClient = user?.role === 'CLIENT';

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.topBar}>
          <NotificationBell />
        </View>

        <View style={styles.header}>
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

        {isTransporter ? <MissionsList /> : null}
        {isClient ? <MyRequestsList /> : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.neutral[0] },
  content: { padding: spacing.xl, gap: spacing.xl },
  topBar: { flexDirection: 'row', justifyContent: 'flex-end' },
  header: { gap: spacing.xs },
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
