import { useState } from 'react';
import { Alert, Pressable, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Icon } from '@/shared/ui/icons';
import { AppScreen } from '@/shared/ui/AppScreen';
import { AppHeader } from '@/shared/ui/AppHeader';
import { BackButton } from '@/shared/ui/BackButton';
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
import { FavoritesPanel } from '@/features/favorites/components/FavoritesPanel';
import { ClientWalletPanel } from '@/features/wallet/components/ClientWalletPanel';
import { TrustPanel } from '@/features/trust/components/TrustPanel';
import { ServiceAreasPanel } from '@/features/profiles/components/ServiceAreasPanel';
import { AddressBookPanel } from '@/features/addresses/components/AddressBookPanel';
import { EditProfilePanel } from '@/features/auth/components/EditProfilePanel';
import { ChangePasswordPanel } from '@/features/auth/components/ChangePasswordPanel';
import { NotificationPrefsPanel } from '@/features/notifications/components/NotificationPrefsPanel';
import { AboutPanel } from '@/shared/ui/AboutPanel';
import { ExternalLinkRow } from '@/shared/ui/ExternalLinkRow';
import { DeleteAccountPanel } from '@/features/auth/components/DeleteAccountPanel';
import { env } from '@/core/env';
import { colors, spacing, fontSize, radii, SCREEN_PADDING } from '@/shared/theme';

// La carte d'identité ouvre la feuille de contenu : c'est elle qui glisse la
// première sur le bleu. Blanche et OPAQUE, pas de verre — le verre ne tient
// que sur le bleu.
//
// Onglet Profil : identité, rôle, langue, litiges et déconnexion.
export default function ProfileScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const [disputesOpen, setDisputesOpen] = useState(false);
  const [reviewsOpen, setReviewsOpen] = useState(false);
  // C5.3 — favoris. Reserve au CLIENT : les endpoints portent
  // RequireRole('CLIENT') et repondraient 403 a un transporteur.
  const [favorisOpen, setFavorisOpen] = useState(false);
  // C5.1 — portefeuille CLIENT. `wallet/` est reserve au transporteur ;
  // `client/wallet/` a ete ecrit pour ce lot.
  const [portefeuilleOpen, setPortefeuilleOpen] = useState(false);
  const [trustOpen, setTrustOpen] = useState(false);
  const [zonesOpen, setZonesOpen] = useState(false);
  const [adressesOpen, setAdressesOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [passwordOpen, setPasswordOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [aboutOpen, setAboutOpen] = useState(false);
  // Exigence de recevabilite des stores : la suppression doit vivre DANS
  // l'application, pas dans un e-mail au support.
  const [deleteOpen, setDeleteOpen] = useState(false);
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
    // DÉFILEMENT OBLIGATOIRE — porté par AppScreen. C'était une `View` : la
    // liste débordait simplement sous le pied de page. Le constat était
    // cosmétique tant que seul « À propos » était coupé, il est devenu bloquant
    // en ajoutant « Mes adresses », qui se retrouvait ENTIÈREMENT masquée par
    // le bouton de déconnexion, donc inatteignable.
    //
    // Trouvé en exécutant l'application sur émulateur. Ni les tests, ni `tsc`,
    // ni la relecture ne pouvaient le voir : l'arbre d'accessibilité contenait
    // bien l'entrée, elle était seulement invisible.
    <AppScreen
      testID="profile-screen"
      header={
        // Le profil est un ONGLET pour la cliente et un écran empilé pour le
        // transporteur (il y arrive par son avatar). Le retour ne s'affiche
        // donc qu'au transporteur.
        //
        // `router.canGoBack()` ne sert à rien ici : dans un navigateur à
        // onglets il devient vrai dès qu'on a changé d'onglet une fois, et la
        // cliente se retrouvait avec un chevron de retour sur sa page de
        // réglages — mesuré sur émulateur le 06/09.
        <AppHeader
          leading={isTransporter ? <BackButton /> : undefined}
          title={t('profile.title')}
        />
      }
      footer={
        <View style={styles.footer}>
          <Button
            testID="profile-logout"
            label={t('profile.logout')}
            onPress={confirmLogout}
          />
        </View>
      }
    >
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
          testID="profile-edit"
          style={styles.link}
          onPress={() => setEditOpen(true)}
          accessibilityRole="button"
        >
          <Icon name="pencil" size={22} color={colors.brand[600]} />
          <Txt style={styles.linkText}>{t('profile.edit_link')}</Txt>
          <Icon name="chevron-right" size={20} color={colors.neutral[400]} />
        </Pressable>

        <Pressable
          testID="profile-password"
          style={styles.link}
          onPress={() => setPasswordOpen(true)}
          accessibilityRole="button"
        >
          <Icon name="lock" size={22} color={colors.brand[600]} />
          <Txt style={styles.linkText}>{t('profile.change_password_link')}</Txt>
          <Icon name="chevron-right" size={20} color={colors.neutral[400]} />
        </Pressable>

        <Pressable
          testID="profile-notifications"
          style={styles.link}
          onPress={() => setNotifOpen(true)}
          accessibilityRole="button"
        >
          <Icon name="bell" size={22} color={colors.brand[600]} />
          <Txt style={styles.linkText}>{t('notif_prefs.link')}</Txt>
          <Icon name="chevron-right" size={20} color={colors.neutral[400]} />
        </Pressable>

        <Pressable
          testID="profile-reviews"
          style={styles.link}
          onPress={() => setReviewsOpen(true)}
          accessibilityRole="button"
        >
          <Icon name="star" size={22} color={colors.brand[600]} />
          <Txt style={styles.linkText}>{t('reviews.my_title')}</Txt>
          <Icon name="chevron-right" size={20} color={colors.neutral[400]} />
        </Pressable>

        {!isTransporter && (
          <Pressable
            testID="profile-client-wallet"
            style={styles.link}
            onPress={() => setPortefeuilleOpen(true)}
            accessibilityRole="button"
          >
            <Icon name="wallet" size={22} color={colors.brand[600]} />
            <Txt style={styles.linkText}>{t('client_wallet.title')}</Txt>
            <Icon name="chevron-right" size={20} color={colors.neutral[400]} />
          </Pressable>
        )}

        {!isTransporter && (
          <Pressable
            testID="profile-favorites"
            style={styles.link}
            onPress={() => setFavorisOpen(true)}
            accessibilityRole="button"
          >
            <Icon name="heart" size={22} color={colors.brand[600]} />
            <Txt style={styles.linkText}>{t('favorites.title')}</Txt>
            <Icon name="chevron-right" size={20} color={colors.neutral[400]} />
          </Pressable>
        )}

        <Pressable
          testID="profile-disputes"
          style={styles.link}
          onPress={() => setDisputesOpen(true)}
          accessibilityRole="button"
        >
          <Icon name="circle-alert" size={22} color={colors.brand[600]} />
          <Txt style={styles.linkText}>{t('disputes.my_title')}</Txt>
          <Icon name="chevron-right" size={20} color={colors.neutral[400]} />
        </Pressable>

        {isTransporter ? (
          <Pressable
            testID="profile-trust"
            style={styles.link}
            onPress={() => setTrustOpen(true)}
            accessibilityRole="button"
          >
            <Icon name="shield-check" size={22} color={colors.brand[600]} />
            <Txt style={styles.linkText}>{t('trust.title')}</Txt>
            <Icon name="chevron-right" size={20} color={colors.neutral[400]} />
          </Pressable>
        ) : null}

        {isTransporter ? (
          <Pressable
            testID="profile-service-areas"
            style={styles.link}
            onPress={() => setZonesOpen(true)}
            accessibilityRole="button"
          >
            <Icon name="map-pin" size={22} color={colors.brand[600]} />
            <Txt style={styles.linkText}>{t('profiles.service_areas.title')}</Txt>
            <Icon name="chevron-right" size={20} color={colors.neutral[400]} />
          </Pressable>
        ) : null}

        <Pressable
          testID="profile-adresses"
          style={styles.link}
          onPress={() => setAdressesOpen(true)}
          accessibilityRole="button"
        >
          <Icon name="map-pin" size={22} color={colors.brand[600]} />
          <Txt style={styles.linkText}>{t('address_book.title')}</Txt>
          <Icon name="chevron-right" size={20} color={colors.neutral[400]} />
        </Pressable>

        <Pressable
          testID="profile-about"
          style={styles.link}
          onPress={() => setAboutOpen(true)}
          accessibilityRole="button"
        >
          <Icon name="info" size={22} color={colors.brand[600]} />
          <Txt style={styles.linkText}>{t('profile.about_link')}</Txt>
          <Icon name="chevron-right" size={20} color={colors.neutral[400]} />
        </Pressable>

        {/* P2 + P3 — le seul endroit du mobile qui explique l'escrow, la
              vérification et les litiges. C'est la levée de l'objection n°1 du
              persona client selon la cartographie. */}
        <Pressable
          testID="profile-how-it-works"
          style={styles.link}
          onPress={() => router.push('/comment-ca-marche')}
          accessibilityRole="button"
        >
          <Icon name="compass" size={22} color={colors.brand[600]} />
          <Txt style={styles.linkText}>{t('how_it_works.link')}</Txt>
          <Icon name="chevron-right" size={20} color={colors.neutral[400]} />
        </Pressable>

        {/* Pages legales et aide, hebergees hors de l'app. Une politique de
              confidentialite est OBLIGATOIRE pour publier sur les deux stores.
              `ExternalLinkRow` ne se rend pas quand l'URL manque : mieux vaut
              une entree absente qu'un lien mort en revue de store. */}
        <ExternalLinkRow
          testID="profile-terms"
          url={env.termsUrl}
          icon="file-text"
          label={t('profile.terms_link')}
        />
        <ExternalLinkRow
          testID="profile-privacy"
          url={env.privacyUrl}
          icon="shield-check"
          label={t('profile.privacy_link')}
        />
        <ExternalLinkRow
          testID="profile-help"
          url={env.helpUrl}
          icon="mail"
          label={t('profile.help_link')}
        />

        {/* Derniere entree du menu, a dessein : c'est l'action la plus
              destructive de l'application. */}
        <Pressable
          testID="profile-delete-account"
          style={styles.link}
          onPress={() => setDeleteOpen(true)}
          accessibilityRole="button"
        >
          <Icon name="circle-alert" size={22} color={colors.error} />
          <Txt style={[styles.linkText, styles.linkDanger]}>
            {t('profile.delete_account.link')}
          </Txt>
          <Icon name="chevron-right" size={20} color={colors.neutral[400]} />
        </Pressable>
      </Card>

      <EditProfilePanel visible={editOpen} onClose={() => setEditOpen(false)} />
      <ChangePasswordPanel
        visible={passwordOpen}
        onClose={() => setPasswordOpen(false)}
      />
      <NotificationPrefsPanel visible={notifOpen} onClose={() => setNotifOpen(false)} />
      <DisputesPanel visible={disputesOpen} onClose={() => setDisputesOpen(false)} />
      <ReviewsPanel visible={reviewsOpen} onClose={() => setReviewsOpen(false)} />
      <FavoritesPanel visible={favorisOpen} onClose={() => setFavorisOpen(false)} />
      <ClientWalletPanel
        visible={portefeuilleOpen}
        onClose={() => setPortefeuilleOpen(false)}
      />
      <TrustPanel visible={trustOpen} onClose={() => setTrustOpen(false)} />
      <AddressBookPanel visible={adressesOpen} onClose={() => setAdressesOpen(false)} />
      <ServiceAreasPanel
        visible={zonesOpen}
        onClose={() => setZonesOpen(false)}
        userId={user?.id ?? null}
      />
      <AboutPanel visible={aboutOpen} onClose={() => setAboutOpen(false)} />
      <DeleteAccountPanel visible={deleteOpen} onClose={() => setDeleteOpen(false)} />
    </AppScreen>
  );
}

const styles = StyleSheet.create({
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
  linkText: {
    flex: 1,
    fontSize: fontSize.md,
    fontWeight: '600',
    color: colors.neutral[900],
  },
  linkDanger: { color: colors.text.error },
  // Hors défilement : la déconnexion reste atteignable quelle que soit la
  // longueur du menu.
  footer: {
    paddingHorizontal: SCREEN_PADDING,
    paddingTop: spacing.md,
    paddingBottom: spacing.lg,
    backgroundColor: colors.neutral[50],
  },
});
