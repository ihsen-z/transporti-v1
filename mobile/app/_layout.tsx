import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { QueryClientProvider } from '@tanstack/react-query';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { queryClient } from '@/core/api/queryClient';
import { useAuthStore } from '@/core/auth/authStore';
import '@/core/i18n'; // init i18n (effet de bord)

// Layout racine : fournit les providers globaux (React Query, safe area),
// initialise l'i18n et hydrate la session au démarrage. Les écrans de route
// restent minces (règle : composition, la logique vit dans src/features|core).
export default function RootLayout() {
  const hydrate = useAuthStore((s) => s.hydrate);

  useEffect(() => {
    void hydrate();
  }, [hydrate]);

  return (
    <QueryClientProvider client={queryClient}>
      <SafeAreaProvider>
        <StatusBar style="auto" />
        <Stack screenOptions={{ headerShown: false }} />
      </SafeAreaProvider>
    </QueryClientProvider>
  );
}
