import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '@/core/auth/authStore';
import { Button } from '@/shared/ui/Button';
import { LanguageToggle } from '@/shared/ui/LanguageToggle';
import { DisputesPanel } from '@/features/disputes/components/DisputesPanel';
import { ReviewsPanel } from '@/features/reviews/components/ReviewsPanel';
import { TrustPanel } from '@/features/trust/components/TrustPanel';
import { colors, spacing, fontSize, radii } from '@/shared/theme';

// Onglet Profil : identité, rôle, langue, litiges et déconnexion.
export default function ProfileScreen() {
  const { t } = useTranslation();
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const [disputesOpen, setDisputesOpen] = useState(false);
  const [reviewsOpen, setReviewsOpen] = useState(false);
  const [trustOpen, setTrustOpen] = useState(false);
  const isTransporter = user?.role === 'TRANSPORTER';

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

        <Pressable
          style={styles.link}
          onPress={() => setReviewsOpen(true)}
          accessibilityRole="button"
        >
          <Ionicons name="star-outline" size={22} color={colors.brand[600]} />
          <Text style={styles.linkText}>{t('reviews.my_title')}</Text>
          <Ionicons name="chevron-forward" size={20} color={colors.neutral[400]} />
        </Pressable>

        <Pressable
          style={styles.link}
          onPress={() => setDisputesOpen(true)}
          accessibilityRole="button"
        >
          <Ionicons name="alert-circle-outline" size={22} color={colors.brand[600]} />
          <Text style={styles.linkText}>{t('disputes.my_title')}</Text>
          <Ionicons name="chevron-forward" size={20} color={colors.neutral[400]} />
        </Pressable>

        {isTransporter ? (
          <Pressable
            style={styles.link}
            onPress={() => setTrustOpen(true)}
            accessibilityRole="button"
          >
            <Ionicons name="shield-checkmark-outline" size={22} color={colors.brand[600]} />
            <Text style={styles.linkText}>{t('trust.title')}</Text>
            <Ionicons name="chevron-forward" size={20} color={colors.neutral[400]} />
          </Pressable>
        ) : null}
      </View>

      <View style={styles.footer}>
        <Button label={t('profile.logout')} onPress={() => void logout()} />
      </View>

      <DisputesPanel visible={disputesOpen} onClose={() => setDisputesOpen(false)} />
      <ReviewsPanel visible={reviewsOpen} onClose={() => setReviewsOpen(false)} />
      <TrustPanel visible={trustOpen} onClose={() => setTrustOpen(false)} />
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
  link: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.neutral[100],
  },
  linkText: { flex: 1, fontSize: fontSize.md, fontWeight: '600', color: colors.neutral[900] },
  footer: { paddingTop: spacing.lg },
});
