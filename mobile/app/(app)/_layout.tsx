import { Redirect, Stack } from 'expo-router';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { useAuthStore } from '@/core/auth/authStore';
import { useProfile } from '@/features/auth/api/useProfile';
import { colors } from '@/shared/theme';

// Zone authentifiée. Garde-fou : renvoie au login si la session est tombée
// (ex : refresh échoué -> logout via l'intercepteur 401).
export default function AppLayout() {
  const status = useAuthStore((s) => s.status);
  const user = useAuthStore((s) => s.user);

  // Au retour d'appli, seul le token a survécu : on recharge le profil pour
  // récupérer le rôle (nécessaire au routage par rôle).
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

  return <Stack screenOptions={{ headerShown: false }} />;
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
});
