import { Pressable, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '@/core/auth/authStore';
import { NotificationBell } from '@/features/notifications/components/NotificationBell';
import { Avatar } from '@/shared/ui/Avatar';
import { Badge } from '@/shared/ui/Badge';
import { Txt } from '@/shared/ui/Txt';
import { colors, spacing, fontSize, TOUCH_TARGET } from '@/shared/theme';

// Barre du haut de l'accueil : avatar, salutation, statut de vérification,
// cloche. L'avatar mène au profil — c'est son entrée principale depuis que la
// charte a donné le 5ᵉ onglet à « Gains ».
export function HomeTopBar() {
  const { t } = useTranslation();
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const firstName = user?.firstName ?? '';

  // Le badge « ✓ Vérifié » doit refléter la vérification d'IDENTITÉ, donc
  // `verificationStatus`. Il était branché sur `isVerified`, qui mappe
  // `is_phone_verified` : un simple SMS confirmé suffisait à afficher
  // « Vérifié », y compris pour un client dont l'API renvoie
  // `verification_status: null`. Sur une place de marché, c'est une promesse de
  // confiance non tenue — le seul écart de cette refonte qui trompait
  // l'utilisateur, et non seulement l'œil.
  const isVerifiedIdentity = user?.verificationStatus === 'VERIFIED';

  return (
    <View style={styles.top}>
      <Pressable
        testID="home-topbar-profile"
        onPress={() => router.push('/profile')}
        accessibilityRole="button"
        accessibilityLabel={t('tabs.profile')}
        style={styles.avatarBtn}
      >
        <Avatar name={firstName || user?.email} size={44} imageUrl={user?.avatarUrl} />
      </Pressable>

      <View style={styles.hi}>
        <Txt style={styles.hiName} numberOfLines={1}>
          {t('home.welcome')}
          {firstName ? `, ${firstName}` : ''}
        </Txt>
        {isVerifiedIdentity ? (
          <Badge label={t('home.verified')} variant="verified" icon="check" />
        ) : user ? (
          <Txt style={styles.role}>{t(`role.${user.role}`)}</Txt>
        ) : null}
      </View>

      <NotificationBell />
    </View>
  );
}

const styles = StyleSheet.create({
  top: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  avatarBtn: { minWidth: TOUCH_TARGET, minHeight: TOUCH_TARGET, justifyContent: 'center' },
  hi: { flex: 1, gap: 2, alignItems: 'flex-start' },
  hiName: { fontSize: fontSize.lg, fontWeight: '800', color: colors.neutral[900] },
  role: { fontSize: fontSize.sm, color: colors.neutral[500] },
});
