import { useEffect, useReducer } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useFonts } from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { queryClient } from '@/core/api/queryClient';
import { persistOptions } from '@/core/api/queryPersister';
import { useAuthStore } from '@/core/auth/authStore';
import { fontsToLoad } from '@/shared/theme/typography';
import { ToastHost } from '@/shared/ui/ToastHost';
import { ErrorBoundary } from '@/shared/ui/ErrorBoundary';
import { initObservability } from '@/core/observability';
import { DeepLinkRouter } from '@/core/deeplink/DeepLinkRouter';
import i18n from '@/core/i18n'; // init i18n (effet de bord) + instance pour le re-render

// Garde le splash affiché tant que les polices ne sont pas prêtes.
void SplashScreen.preventAutoHideAsync();

// Layout racine : providers globaux (React Query, safe area), init i18n,
// hydratation session. Les écrans de route restent minces (composition).
export default function RootLayout() {
  const hydrate = useAuthStore((s) => s.hydrate);

  // Polices de la charte (Inter + Cairo, toutes graisses). On attend leur
  // chargement avant d'afficher l'app pour éviter un flash en police système.
  const [fontsLoaded, fontError] = useFonts(fontsToLoad);

  // react-i18next ne re-render pas fiablement les écrans mémoïsés du navigateur
  // au changement de langue. On re-monte la Stack via une clé incrémentée à
  // chaque 'languageChanged' : tout l'arbre se re-render (texte + sens RTL).
  const [langTick, bumpLang] = useReducer((x: number) => x + 1, 0);

  // Observabilité en premier : un crash survenant pendant l'hydratation de la
  // session doit déjà pouvoir être remonté.
  useEffect(() => {
    void initObservability();
  }, []);

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

  // Masque le splash une fois les polices prêtes (ou en cas d'échec, pour ne
  // pas bloquer l'app — on retombe alors sur la police système).
  useEffect(() => {
    if (fontsLoaded || fontError) {
      void SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError]);

  if (!fontsLoaded && !fontError) {
    return null;
  }

  return (
    // ErrorBoundary au-dessus des providers : une exception levée par
    // l'hydratation du cache persisté doit elle aussi être rattrapée.
    <ErrorBoundary>
      <PersistQueryClientProvider client={queryClient} persistOptions={persistOptions}>
        <SafeAreaProvider>
          {/* "dark" = contenu sombre sur nos fonds clairs. L'app est verrouillée
              en thème clair (app.json userInterfaceStyle), donc "auto" n'a rien
              à arbitrer et masquait la barre sur un appareil en mode sombre. */}
          <StatusBar style="dark" />
          <DeepLinkRouter />
          <Stack key={langTick} screenOptions={{ headerShown: false }} />
          <ToastHost />
        </SafeAreaProvider>
      </PersistQueryClientProvider>
    </ErrorBoundary>
  );
}
