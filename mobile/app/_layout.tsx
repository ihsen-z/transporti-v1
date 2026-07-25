import { useEffect, useReducer } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { QueryClientProvider } from '@tanstack/react-query';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { queryClient } from '@/core/api/queryClient';
import { useAuthStore } from '@/core/auth/authStore';
import i18n from '@/core/i18n'; // init i18n (effet de bord) + instance pour le re-render

// Layout racine : providers globaux (React Query, safe area), init i18n,
// hydratation session. Les écrans de route restent minces (composition).
export default function RootLayout() {
  const hydrate = useAuthStore((s) => s.hydrate);

  // react-i18next ne re-render pas fiablement les écrans mémoïsés du navigateur
  // au changement de langue. On re-monte la Stack via une clé incrémentée à
  // chaque 'languageChanged' : tout l'arbre se re-render (texte + sens RTL).
  const [langTick, bumpLang] = useReducer((x: number) => x + 1, 0);

  useEffect(() => {
    void hydrate();
  }, [hydrate]);

  useEffect(() => {
    const onLangChange = () => bumpLang();
    i18n.on('languageChanged', onLangChange);
    return () => {
      i18n.off('languageChanged', onLangChange);
    };
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <SafeAreaProvider>
        <StatusBar style="auto" />
        <Stack key={langTick} screenOptions={{ headerShown: false }} />
      </SafeAreaProvider>
    </QueryClientProvider>
  );
}
