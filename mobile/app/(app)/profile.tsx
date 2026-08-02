import { useState } from 'react';
import { Alert, Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '@/core/auth/authStore';
import { useProfile } from '@/features/auth/api/useProfile';
import { ProfileAvatar } from '@/features/auth/components/ProfileAvatar';
import { Txt } from '@/shared/ui/Txt';
import { Button } from '@/shared/ui/Button';
import { Card } from '@/shared/ui/Card';
import { LanguageToggle } from '@/shared/ui/LanguageToggle';
import { DisputesPanel } from '@/features/disputes/components/DisputesPanel';
import { ReviewsPanel } from '@/features/reviews/components/ReviewsPanel';
import { TrustPanel } from '@/features/trust/components/TrustPanel';
import { EditProfilePanel } from '@/features/auth/components/EditProfilePanel';
import { ChangePasswordPanel } from '@/features/auth/components/ChangePasswordPanel';
import { NotificationPrefsPanel } from '@/features/notifications/components/NotificationPrefsPanel';
import { AboutPanel } from '@/shared/ui/AboutPanel';
import { colors, spacing, fontSize, radii } from '@/shared/theme';

// Onglet Profil : identité, rôle, langue, litiges et déconnexion.
export default function ProfileScreen() {
  const { t } = useTranslation();
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const [disputesOpen, setDisputesOpen] = useState(false);
  const [reviewsOpen, setReviewsOpen] = useState(false);
  const [trustOpen, setTrustOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [passwordOpen, setPasswordOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [aboutOpen, setAboutOpen] = useState(false);
  const isTransporter = user?.role === 'TRANSPORTER';

  // Recharge le profil (inclut avatar_url) pour afficher la photo à jour.
  useProfile(true);

  // Confirmation avant déconnexion (action irréversible : reperte de session).
  const confirmLogout = () => {
    Alert.alert(t('profile.logout_confirm_title'), t('profile.logout_confirm_msg'), [
      { text: t('common.cancel'), style: 'cancel' },
      { text: t('profile.logout'), style: 'destructive', onPress: () => void logout() },
    ]);
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.body}>
        <Txt style={styles.title}>{t('profile.title')}</Txt>

        {user ? (
          <Card style={styles.identity}>
            <ProfileAvatar />
            <Txt style={styles.email}>{user.email}</Txt>
            <View style={styles.roleChip}>
              <Txt style={styles.roleChipText}>{t(`role.${user.role}`)}</Txt>
            </View>
          </Card>
        ) : null}

        {/* Menu : langue + accès aux panneaux (avis, litiges, confiance). */}
        <Card style={styles.menu}>
          <View style={styles.row}>
            <Txt style={styles.rowLabel}>{t('profile.language')}</Txt>
            <LanguageToggle />
          </View>

          <Pressable
            style={styles.link}
            onPress={() => setEditOpen(true)}
            accessibilityRole="button"
          >
            <Ionicons name="create-outline" size={22} color={colors.brand[600]} />
            <Txt style={styles.linkText}>{t('profile.edit_link')}</Txt>
            <Ionicons name="chevron-forward" size={20} color={colors.neutral[400]} />
          </Pressable>

          <Pressable
            style={styles.link}
            onPress={() => setPasswordOpen(true)}
            accessibilityRole="button"
          >
            <Ionicons name="lock-closed-outline" size={22} color={colors.brand[600]} />
            <Txt style={styles.linkText}>{t('profile.change_password_link')}</Txt>
            <Ionicons name="chevron-forward" size={20} color={colors.neutral[400]} />
          </Pressable>

          <Pressable
            style={styles.link}
            onPress={() => setNotifOpen(true)}
            accessibilityRole="button"
          >
            <Ionicons name="notifications-outline" size={22} color={colors.brand[600]} />
            <Txt style={styles.linkText}>{t('notif_prefs.link')}</Txt>
            <Ionicons name="chevron-forward" size={20} color={colors.neutral[400]} />
          </Pressable>

          <Pressable
            style={styles.link}
            onPress={() => setReviewsOpen(true)}
            accessibilityRole="button"
          >
            <Ionicons name="star-outline" size={22} color={colors.brand[600]} />
            <Txt style={styles.linkText}>{t('reviews.my_title')}</Txt>
            <Ionicons name="chevron-forward" size={20} color={colors.neutral[400]} />
          </Pressable>

          <Pressable
            style={styles.link}
            onPress={() => setDisputesOpen(true)}
            accessibilityRole="button"
          >
            <Ionicons name="alert-circle-outline" size={22} color={colors.brand[600]} />
            <Txt style={styles.linkText}>{t('disputes.my_title')}</Txt>
            <Ionicons name="chevron-forward" size={20} color={colors.neutral[400]} />
          </Pressable>

          {isTransporter ? (
            <Pressable
              style={styles.link}
              onPress={() => setTrustOpen(true)}
              accessibilityRole="button"
            >
              <Ionicons name="shield-checkmark-outline" size={22} color={colors.brand[600]} />
              <Txt style={styles.linkText}>{t('trust.title')}</Txt>
              <Ionicons name="chevron-forward" size={20} color={colors.neutral[400]} />
            </Pressable>
          ) : null}

          <Pressable
            style={styles.link}
            onPress={() => setAboutOpen(true)}
            accessibilityRole="button"
          >
            <Ionicons name="information-circle-outline" size={22} color={colors.brand[600]} />
            <Txt style={styles.linkText}>{t('profile.about_link')}</Txt>
            <Ionicons name="chevron-forward" size={20} color={colors.neutral[400]} />
          </Pressable>
        </Card>
      </View>

      <View style={styles.footer}>
        <Button label={t('profile.logout')} onPress={confirmLogout} />
      </View>

      <EditProfilePanel visible={editOpen} onClose={() => setEditOpen(false)} />
      <ChangePasswordPanel visible={passwordOpen} onClose={() => setPasswordOpen(false)} />
      <NotificationPrefsPanel visible={notifOpen} onClose={() => setNotifOpen(false)} />
      <DisputesPanel visible={disputesOpen} onClose={() => setDisputesOpen(false)} />
      <ReviewsPanel visible={reviewsOpen} onClose={() => setReviewsOpen(false)} />
      <TrustPanel visible={trustOpen} onClose={() => setTrustOpen(false)} />
      <AboutPanel visible={aboutOpen} onClose={() => setAboutOpen(false)} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.neutral[50], padding: spacing.xl },
  body: { flex: 1, gap: spacing.lg, paddingTop: spacing.lg },
  title: {
    fontSize: fontSize['2xl'],
    fontWeight: '800',
    color: colors.neutral[900],
  },
  identity: { gap: spacing.sm, alignItems: 'center' },
  email: { fontSize: fontSize.md, color: colors.neutral[700] },
  roleChip: {
    alignSelf: 'center',
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
  menu: { paddingVertical: spacing.xs },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
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
    borderTopColor: colors.neutral[200],
  },
  linkText: { flex: 1, fontSize: fontSize.md, fontWeight: '600', color: colors.neutral[900] },
  footer: { paddingTop: spacing.lg },
});
