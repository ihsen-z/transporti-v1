import { Redirect, Tabs } from 'expo-router';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '@/core/auth/authStore';
import { useProfile } from '@/features/auth/api/useProfile';
import { colors } from '@/shared/theme';

// Fabrique d'icône d'onglet (état plein si actif, contour sinon).
function tabIcon(
  active: keyof typeof Ionicons.glyphMap,
  inactive: keyof typeof Ionicons.glyphMap,
) {
  return ({ color, size, focused }: { color: string; size: number; focused: boolean }) => (
    <Ionicons name={focused ? active : inactive} color={color} size={size} />
  );
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
  const showSearch = role === 'CLIENT';
  const showPublish = role === 'TRANSPORTER';

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.brand[500],
        tabBarInactiveTintColor: colors.neutral[400],
      }}
    >
      <Tabs.Screen
        name="home"
        options={{ title: t('tabs.home'), tabBarIcon: tabIcon('home', 'home-outline') }}
      />
      <Tabs.Screen
        name="search"
        options={{
          title: t('tabs.search'),
          href: showSearch ? '/search' : null,
          tabBarIcon: tabIcon('search', 'search-outline'),
        }}
      />
      <Tabs.Screen
        name="publish"
        options={{
          title: t('tabs.publish'),
          href: showPublish ? '/publish' : null,
          tabBarIcon: tabIcon('add-circle', 'add-circle-outline'),
        }}
      />
      <Tabs.Screen
        name="messages"
        options={{
          title: t('tabs.messages'),
          tabBarIcon: tabIcon('chatbubbles', 'chatbubbles-outline'),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{ title: t('tabs.profile'), tabBarIcon: tabIcon('person', 'person-outline') }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
});
