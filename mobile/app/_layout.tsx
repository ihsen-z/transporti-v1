import React, { useEffect, useState } from 'react';
import { Slot, useRouter, useSegments } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from '../src/core/theme/ThemeProvider';
import { ErrorBoundary } from '../src/core/error/ErrorBoundary';
import { queryClient } from '../src/core/api/queryClient';
import { setupInterceptors } from '../src/core/api/interceptors';
import { initSentry } from '../src/core/monitoring/sentry';
import { useAuthStore } from '../src/core/auth/authStore';
import '../src/core/i18n/i18n';
import { View, ActivityIndicator } from 'react-native';
import { colors } from '../src/core/theme/tokens';

SplashScreen.preventAutoHideAsync().catch(() => {});

initSentry();
setupInterceptors();

export default function RootLayout() {
  const { isAuthenticated, isLoading, restoreSession } = useAuthStore();
  const segments = useSegments();
  const router = useRouter();
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    async function prepare() {
      try {
        await restoreSession();
      } catch (e) {
        console.warn('Error restoring session:', e);
      } finally {
        setIsReady(true);
        await SplashScreen.hideAsync().catch(() => {});
      }
    }
    prepare();
  }, []);

  useEffect(() => {
    if (!isReady) return;

    const inAuthGroup = segments[0] === '(auth)';

    if (!isAuthenticated && !inAuthGroup) {
      router.replace('/(auth)/login');
    } else if (isAuthenticated && inAuthGroup) {
      router.replace('/(tabs)/home');
    }
  }, [isAuthenticated, isReady, segments, router]);

  if (!isReady || isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F8F9FA' }}>
        <ActivityIndicator size="large" color={colors.primary[500]} />
      </View>
    );
  }

  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider>
          <Slot />
        </ThemeProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}
