import { useRouter } from 'expo-router';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '@/core/auth/authStore';
import { MissionsList } from '@/features/missions/components/MissionsList';
import { CompletedMissionsList } from '@/features/reviews/components/CompletedMissionsList';
import { MyRequestsList } from '@/features/my-requests/components/MyRequestsList';
import { NotificationBell } from '@/features/notifications/components/NotificationBell';
import { Avatar } from '@/shared/ui/Avatar';
import { Button } from '@/shared/ui/Button';
import { GradientCard } from '@/shared/ui/GradientCard';
import { colors, spacing, fontSize } from '@/shared/theme';

// Onglet Accueil, rôle-aware (design-system : top bar + hero dégradé + CTA).
export default function HomeScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const isTransporter = user?.role === 'TRANSPORTER';
  const isClient = user?.role === 'CLIENT';
  const firstName = user?.firstName ?? '';

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content}>
        {/* Barre du haut : avatar + salutation + cloche notifications. */}
        <View style={styles.top}>
          <Avatar name={firstName || user?.email} size={44} />
          <View style={styles.hi}>
            <Text style={styles.hiName} numberOfLines={1}>
              {t('home.welcome')}
              {firstName ? `, ${firstName}` : ''}
            </Text>
            {user ? <Text style={styles.role}>{t(`role.${user.role}`)}</Text> : null}
          </View>
          <NotificationBell />
        </View>

        {/* Hero dégradé de marque. */}
        <GradientCard>
          <Text style={styles.heroLabel}>{t('app.name')}</Text>
          <Text style={styles.heroBig}>{t('app.tagline')}</Text>
          {user ? (
            <View style={styles.heroBadges}>
              <View style={styles.heroBadge}>
                <Text style={styles.heroBadgeText}>{t(`role.${user.role}`)}</Text>
              </View>
              {user.isVerified ? (
                <View style={styles.heroBadge}>
                  <Text style={styles.heroBadgeText}>✓ {t('home.verified')}</Text>
                </View>
              ) : null}
            </View>
          ) : null}
        </GradientCard>

        {/* CTA unique selon le rôle. */}
        {isTransporter ? (
          <Button
            label={t('trips.publish.title')}
            onPress={() => router.push('/publish')}
            variant="cta"
          />
        ) : null}
        {isClient ? (
          <Button
            label={t('search.title')}
            onPress={() => router.push('/search')}
            variant="cta"
          />
        ) : null}

        {/* Sections rôle-aware. */}
        {isTransporter ? <MissionsList /> : null}
        {isTransporter ? <CompletedMissionsList /> : null}
        {isClient ? <MyRequestsList /> : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.neutral[50] },
  content: { padding: spacing.xl, gap: spacing.xl },
  top: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  hi: { flex: 1 },
  hiName: { fontSize: fontSize.lg, fontWeight: '800', color: colors.neutral[900] },
  role: { fontSize: fontSize.sm, color: colors.neutral[500], marginTop: 1 },
  heroLabel: { fontSize: fontSize.sm, color: colors.neutral[0], opacity: 0.85 },
  heroBig: {
    fontSize: fontSize.xl,
    fontWeight: '800',
    color: colors.neutral[0],
    marginTop: 4,
  },
  heroBadges: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md },
  heroBadge: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 999,
    paddingVertical: 4,
    paddingHorizontal: spacing.md,
  },
  heroBadgeText: { color: colors.neutral[0], fontSize: 12, fontWeight: '700' },
});
