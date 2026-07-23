import { Redirect } from 'expo-router';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { useAuthStore } from '@/core/auth/authStore';
import { colors } from '@/shared/theme';

// Aiguillage racine : oriente selon l'état d'auth hydraté au boot (_layout).
//   idle/loading      -> attente (hydratation en cours)
//   unauthenticated   -> login
//   authenticated     -> zone applicative
export default function Index() {
  const status = useAuthStore((s) => s.status);

  if (status === 'idle' || status === 'loading') {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.brand[500]} />
      </View>
    );
  }

  if (status === 'unauthenticated') {
    return <Redirect href="/login" />;
  }

  return <Redirect href="/home" />;
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
});
