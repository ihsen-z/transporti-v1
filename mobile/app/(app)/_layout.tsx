import { Redirect, Tabs } from 'expo-router';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { Icon, type IconName } from '@/shared/ui/icons';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '@/core/auth/authStore';
import { useProfile } from '@/features/auth/api/useProfile';
import { FloatingTabBar } from '@/shared/ui/FloatingTabBar';
import { colors } from '@/shared/theme';

// Fabrique d'icône d'onglet. Lucide n'a pas de paires plein/contour : l'état
// actif se lit à la couleur (posée par la barre) et à un trait plus appuyé.
function tabIcon(name: IconName) {
  const TabIcon = ({
    color,
    size,
    focused,
  }: {
    color: string;
    size: number;
    focused: boolean;
  }) => <Icon name={name} color={color} size={size} strokeWidth={focused ? 2.5 : 2} />;
  TabIcon.displayName = `TabIcon(${name})`;
  return TabIcon;
}

// Zone authentifiée = navigation à onglets CONDITIONNELLE par rôle.
// L'autorisation reste autoritative côté serveur (RequireRole) ; ici on ne fait
// que masquer/afficher les onglets (href: null = masqué du bar).
export default function AppLayout() {
  const { t } = useTranslation();
  const status = useAuthStore((s) => s.status);
  const user = useAuthStore((s) => s.user);

  // Recharge le profil si session présente mais rôle inconnu (retour d'appli).
  const needsProfile = status === 'authenticated' && user === null;
  const profile = useProfile(needsProfile);

  if (status === 'unauthenticated') {
    return <Redirect href="/login" />;
  }

  if (needsProfile && profile.isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.brand[500]} />
      </View>
    );
  }

  const role = user?.role;

  // Barre flottante custom (pilule + FAB orange central). La visibilité des
  // onglets et le choix du FAB par rôle vivent dans FloatingTabBar : ici on
  // déclare simplement tous les écrans + leurs icônes/titres.
  return (
    <Tabs
      tabBar={(props) => <FloatingTabBar {...props} role={role} />}
      screenOptions={{ headerShown: false }}
    >
      <Tabs.Screen
        name="home"
        options={{ title: t('tabs.home'), tabBarIcon: tabIcon('house') }}
      />
      <Tabs.Screen
        name="search"
        options={{ title: t('tabs.search'), tabBarIcon: tabIcon('search') }}
      />
      <Tabs.Screen
        name="publish"
        options={{ title: t('tabs.publish'), tabBarIcon: tabIcon('circle-plus') }}
      />
      <Tabs.Screen
        name="requests"
        options={{
          title: t('tabs.requests'),
          tabBarIcon: tabIcon('inbox'),
        }}
      />
      <Tabs.Screen
        name="messages"
        options={{
          title: t('tabs.messages'),
          tabBarIcon: tabIcon('message-circle'),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{ title: t('tabs.profile'), tabBarIcon: tabIcon('user') }}
      />
      <Tabs.Screen
        name="gains"
        options={{ title: t('tabs.gains'), tabBarIcon: tabIcon('wallet') }}
      />
      {/* Écran de détail, atteint par navigation et non par la barre : `href:
          null` le retire des onglets tout en le gardant adressable — condition
          pour qu'une notification puisse un jour ouvrir directement la bonne
          mission. */}
      <Tabs.Screen name="mission/[id]" options={{ href: null }} />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
});
