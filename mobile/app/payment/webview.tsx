import React, { useState } from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, ActivityIndicator, Alert, Platform } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTheme } from '../../src/core/theme/ThemeProvider';
import { Feather } from '@expo/vector-icons';

// Safely require react-native-webview on native platforms only to avoid web bundler errors
let NativeWebView: any = null;
if (Platform.OS !== 'web') {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    NativeWebView = require('react-native-webview').WebView;
  } catch (e) {
    console.error('Failed to load react-native-webview', e);
  }
}

export default function PaymentWebViewScreen() {
  const { payment_url, job_id } = useLocalSearchParams<{ payment_url: string; job_id: string }>();
  const router = useRouter();
  const { theme } = useTheme();
  const [isLoading, setIsLoading] = useState(true);

  if (!payment_url) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background.default }]}>
        <View style={styles.center}>
          <Feather name="alert-circle" size={48} color={theme.colors.error[500]} />
          <Text style={[styles.errorText, { color: theme.colors.text.primary }]}>URL de paiement manquante.</Text>
          <TouchableOpacity style={[styles.backButton, { backgroundColor: theme.colors.primary[500] }]} onPress={() => router.back()}>
            <Text style={styles.backButtonText}>Retour</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const handleUrlChange = (url: string) => {
    // Intercept callback redirects
    if (url.startsWith('transporti://payment/callback') || url.includes('payment/callback')) {
      const isSuccess = url.includes('status=success');
      const jobId = job_id || '';

      if (isSuccess) {
        Alert.alert('Paiement Réussi', 'Votre paiement en séquestre a été enregistré avec succès.');
      } else {
        Alert.alert('Paiement Échoué', 'Le paiement a échoué ou a été annulé.');
      }

      router.replace({
        pathname: `/job/[id]`,
        params: { id: jobId },
      });
      return false; // Intercepted
    }
    return true; // Proceed loading
  };

  // Fallback simulator for Web
  if (Platform.OS === 'web') {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background.default }]}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backIconButton}>
            <Feather name="arrow-left" size={24} color={theme.colors.text.primary} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: theme.colors.text.primary }]}>Simulation de Paiement Konnect</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.simulatorContainer}>
          <View style={[styles.simulatorCard, { backgroundColor: theme.colors.background.card, borderColor: theme.colors.border.default }]}>
            <Feather name="credit-card" size={48} color={theme.colors.primary[500]} style={{ marginBottom: 16 }} />
            <Text style={[styles.simulatorTitle, { color: theme.colors.text.primary }]}>Passerelle de Paiement (Simulateur Web)</Text>
            <Text style={[styles.simulatorDesc, { color: theme.colors.text.secondary }]}>
              URL de destination : {payment_url}
            </Text>
            
            <View style={styles.simulatorActions}>
              <TouchableOpacity
                style={[styles.simButton, { backgroundColor: theme.colors.success[500] }]}
                onPress={() => handleUrlChange(`transporti://payment/callback?status=success&job_id=${job_id}`)}
              >
                <Text style={styles.simButtonText}>Simuler Succès</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.simButton, { backgroundColor: theme.colors.error[500] }]}
                onPress={() => handleUrlChange(`transporti://payment/callback?status=failed&job_id=${job_id}`)}
              >
                <Text style={styles.simButtonText}>Simuler Échec</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  // Native WebView
  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background.default }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backIconButton}>
          <Feather name="arrow-left" size={24} color={theme.colors.text.primary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.colors.text.primary }]}>Paiement Sécurisé</Text>
        <View style={{ width: 40 }} />
      </View>

      <View style={{ flex: 1, position: 'relative' }}>
        {NativeWebView ? (
          <NativeWebView
            source={{ uri: payment_url }}
            onNavigationStateChange={(navState: any) => {
              handleUrlChange(navState.url);
            }}
            onShouldStartLoadWithRequest={(request: any) => {
              return handleUrlChange(request.url);
            }}
            onLoadStart={() => setIsLoading(true)}
            onLoadEnd={() => setIsLoading(false)}
            style={{ flex: 1 }}
          />
        ) : (
          <View style={styles.center}>
            <Text style={{ color: theme.colors.text.primary }}>Erreur: WebView non supporté sur cette plateforme.</Text>
          </View>
        )}

        {isLoading && (
          <View style={[styles.loadingIndicatorContainer, { backgroundColor: theme.colors.background.default }]}>
            <ActivityIndicator size="large" color={theme.colors.primary[500]} />
            <Text style={[styles.loadingText, { color: theme.colors.text.secondary }]}>Chargement de la passerelle...</Text>
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F3F4',
  },
  backIconButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  errorText: {
    fontSize: 16,
    marginVertical: 16,
    textAlign: 'center',
  },
  backButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  backButtonText: {
    color: '#FFF',
    fontWeight: 'bold',
  },
  loadingIndicatorContainer: {
    ...StyleSheet.absoluteFill,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
  },
  simulatorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  simulatorCard: {
    width: '100%',
    maxWidth: 500,
    borderWidth: 1,
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
  },
  simulatorTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
    textAlign: 'center',
  },
  simulatorDesc: {
    fontSize: 13,
    marginBottom: 24,
    textAlign: 'center',
  },
  simulatorActions: {
    flexDirection: 'row',
    gap: 16,
    width: '100%',
  },
  simButton: {
    flex: 1,
    height: 48,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  simButtonText: {
    color: '#FFF',
    fontWeight: 'bold',
    fontSize: 14,
  },
});
