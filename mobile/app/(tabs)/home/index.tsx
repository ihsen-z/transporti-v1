import React from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native';
import { useAuthStore } from '../../../src/core/auth/authStore';
import { useTheme } from '../../../src/core/theme/ThemeProvider';
import { useDashboardMetrics } from '../../../src/features/payments/api/walletApi';
import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

export default function HomeScreen() {
  const { user } = useAuthStore();
  const { theme } = useTheme();
  const router = useRouter();
  const { data: metrics, isLoading } = useDashboardMetrics();
  const isClient = user?.role === 'CLIENT';

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background.default }]}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={[styles.headerBanner, { backgroundColor: theme.colors.primary[500] }]}>
          <View>
            <Text style={[styles.welcomeText, { color: theme.colors.text.inverse }]}>Bonjour,</Text>
            <Text style={[styles.nameText, { color: theme.colors.text.inverse }]}>{user?.name || 'Utilisateur'}</Text>
          </View>
          <View style={styles.roleBadge}>
            <Text style={styles.roleBadgeText}>{isClient ? 'Client' : 'Transporteur'}</Text>
          </View>
        </View>

        <Text style={[styles.sectionTitle, { color: theme.colors.text.primary }]}>Actions rapides</Text>
        <View style={styles.actionsGrid}>
          {isClient ? (
            <TouchableOpacity
              style={[styles.actionCard, { backgroundColor: theme.colors.background.card, borderColor: theme.colors.border.default }]}
              onPress={() => router.push('/(tabs)/create')}
            >
              <Feather name="plus-circle" size={28} color={theme.colors.primary[500]} />
              <Text style={[styles.actionTitle, { color: theme.colors.text.primary }]}>Publier une annonce</Text>
              <Text style={styles.actionDesc}>Créer une demande de transport</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={[styles.actionCard, { backgroundColor: theme.colors.background.card, borderColor: theme.colors.border.default }]}
              onPress={() => router.push('/(tabs)/jobs')}
            >
              <Feather name="search" size={28} color={theme.colors.primary[500]} />
              <Text style={[styles.actionTitle, { color: theme.colors.text.primary }]}>Rechercher</Text>
              <Text style={styles.actionDesc}>Trouver des missions de transport</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={[styles.actionCard, { backgroundColor: theme.colors.background.card, borderColor: theme.colors.border.default }]}
            onPress={() => router.push('/trust/status')}
          >
            <Feather name="shield" size={28} color={theme.colors.success[500]} />
            <Text style={[styles.actionTitle, { color: theme.colors.text.primary }]}>Vérification</Text>
            <Text style={styles.actionDesc}>Statut KYC et documents</Text>
          </TouchableOpacity>
        </View>

        <Text style={[styles.sectionTitle, { color: theme.colors.text.primary }]}>Statistiques</Text>
        {isLoading ? (
          <View style={[styles.statsCard, { backgroundColor: theme.colors.background.card, borderColor: theme.colors.border.default, justifyContent: 'center' }]}>
            <ActivityIndicator color={theme.colors.primary[500]} />
          </View>
        ) : (
          <View style={[styles.statsCard, { backgroundColor: theme.colors.background.card, borderColor: theme.colors.border.default }]}>
            <View style={styles.statItem}>
              <Text style={[styles.statValue, { color: theme.colors.primary[500] }]}>
                {isClient 
                  ? (metrics?.role === 'CLIENT' ? metrics.active_jobs : 0)
                  : (metrics?.role === 'TRANSPORTER' ? metrics.completed_missions : 0)}
              </Text>
              <Text style={styles.statLabel}>{isClient ? 'Missions actives' : 'Missions livrées'}</Text>
            </View>
            <View style={styles.divider} />
            <View style={styles.statItem}>
              <Text style={[styles.statValue, { color: theme.colors.primary[500] }]}>
                {isClient
                  ? `${(metrics?.role === 'CLIENT' ? metrics.total_spent : 0).toFixed(0)} TND`
                  : `${(metrics?.role === 'TRANSPORTER' ? metrics.total_earned : 0).toFixed(0)} TND`}
              </Text>
              <Text style={styles.statLabel}>{isClient ? 'Total dépensé' : 'Gains accumulés'}</Text>
            </View>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
  },
  headerBanner: {
    borderRadius: 16,
    padding: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
    marginTop: 10,
  },
  welcomeText: {
    fontSize: 14,
    opacity: 0.9,
  },
  nameText: {
    fontSize: 22,
    fontWeight: 'bold',
    marginTop: 4,
  },
  roleBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  roleBadgeText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '600',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 12,
    marginTop: 8,
  },
  actionsGrid: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  actionCard: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
    alignItems: 'flex-start',
  },
  actionTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    marginTop: 12,
  },
  actionDesc: {
    fontSize: 11,
    color: '#777',
    marginTop: 4,
  },
  statsCard: {
    flexDirection: 'row',
    borderWidth: 1,
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#777',
  },
  divider: {
    width: 1,
    height: '100%',
    backgroundColor: '#E8EAED',
    marginHorizontal: 10,
  },
});
