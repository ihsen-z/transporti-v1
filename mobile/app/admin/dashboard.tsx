import React from 'react';
import { View, Text, StyleSheet, SafeAreaView, ScrollView, TouchableOpacity, ActivityIndicator, Dimensions } from 'react-native';
import { useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { useTheme } from '../../src/core/theme/ThemeProvider';
import { useAdminStats } from '../../src/features/admin/api/adminApi';

const { width } = Dimensions.get('window');
const CARD_WIDTH = (width - 48) / 2;

export default function AdminDashboardScreen() {
  const { theme, isRTL } = useTheme();
  const router = useRouter();
  const { data: stats, isLoading, error, refetch } = useAdminStats();

  if (isLoading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background.default }]}>
        <View style={styles.center}>
          <ActivityIndicator size="large" color={theme.colors.primary[500]} />
        </View>
      </SafeAreaView>
    );
  }

  if (error || !stats) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background.default }]}>
        {/* Header */}
        <View style={[styles.header, { borderBottomColor: theme.colors.border.default, backgroundColor: theme.colors.background.card }]}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Feather name={isRTL ? "arrow-right" : "arrow-left"} size={24} color={theme.colors.text.primary} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: theme.colors.text.primary }]}>Dashboard Admin</Text>
          <View style={{ width: 44 }} />
        </View>
        <View style={styles.center}>
          <Feather name="alert-circle" size={48} color={theme.colors.error[500]} />
          <Text style={[styles.errorText, { color: theme.colors.text.primary }]}>
            Impossible de charger les statistiques d'administration.
          </Text>
          <TouchableOpacity
            style={[styles.retryButton, { backgroundColor: theme.colors.primary[500] }]}
            onPress={() => refetch()}
          >
            <Text style={styles.retryButtonText}>Réessayer</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background.default }]}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: theme.colors.border.default, backgroundColor: theme.colors.background.card }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Feather name={isRTL ? "arrow-right" : "arrow-left"} size={24} color={theme.colors.text.primary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.colors.text.primary }]}>Dashboard Admin</Text>
        <TouchableOpacity onPress={() => refetch()} style={styles.refreshButton}>
          <Feather name="refresh-cw" size={20} color={theme.colors.text.primary} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Section Litiges Actifs */}
        {stats.activeDisputes > 0 && (
          <View style={[styles.disputeBanner, { backgroundColor: theme.colors.error[50], borderColor: theme.colors.error[500] }]}>
            <Feather name="alert-triangle" size={24} color={theme.colors.error[500]} />
            <View style={styles.disputeTextContainer}>
              <Text style={[styles.disputeTitle, { color: theme.colors.error[700] }]}>
                {stats.activeDisputes} {stats.activeDisputes > 1 ? 'Litiges actifs' : 'Litige actif'}
              </Text>
              <Text style={[styles.disputeSub, { color: theme.colors.error[700] }]}>
                Des dossiers nécessitent votre intervention immédiate.
              </Text>
            </View>
          </View>
        )}

        {/* Section Finances */}
        <Text style={[styles.sectionTitle, { color: theme.colors.text.secondary }]}>Finances de la Plateforme</Text>
        <View style={styles.cardRow}>
          <View style={[styles.card, { width: CARD_WIDTH, backgroundColor: theme.colors.background.card, borderColor: theme.colors.border.default }]}>
            <View style={styles.cardHeader}>
              <View style={[styles.iconContainer, { backgroundColor: theme.colors.success[50] }]}>
                <Feather name="trending-up" size={18} color={theme.colors.success[500]} />
              </View>
            </View>
            <Text style={[styles.cardLabel, { color: theme.colors.text.secondary }]}>Revenu Estimé</Text>
            <Text style={[styles.cardValue, { color: theme.colors.success[500] }]}>{stats.platformRevenue.toFixed(2)} TND</Text>
            <Text style={[styles.cardSubText, { color: theme.colors.text.disabled }]}>Commission 10%</Text>
          </View>

          <View style={[styles.card, { width: CARD_WIDTH, backgroundColor: theme.colors.background.card, borderColor: theme.colors.border.default }]}>
            <View style={styles.cardHeader}>
              <View style={[styles.iconContainer, { backgroundColor: theme.colors.primary[50] }]}>
                <Feather name="shield" size={18} color={theme.colors.primary[500]} />
              </View>
            </View>
            <Text style={[styles.cardLabel, { color: theme.colors.text.secondary }]}>Total Séquestré</Text>
            <Text style={[styles.cardValue, { color: theme.colors.text.primary }]}>{stats.totalEscrow.toFixed(2)} TND</Text>
            <Text style={[styles.cardSubText, { color: theme.colors.text.disabled }]}>Flux financiers gérés</Text>
          </View>
        </View>

        <View style={[styles.cardFull, { backgroundColor: theme.colors.background.card, borderColor: theme.colors.border.default }]}>
          <Text style={[styles.cardFullTitle, { color: theme.colors.text.secondary }]}>Répartition des fonds en Séquestre</Text>
          <View style={styles.progressSection}>
            <View style={styles.progressRow}>
              <View style={styles.progressLabelRow}>
                <Text style={[styles.progressLabel, { color: theme.colors.text.primary }]}>En attente (HELD)</Text>
                <Text style={[styles.progressVal, { color: theme.colors.text.secondary }]}>{stats.pendingEscrow.toFixed(2)} TND</Text>
              </View>
            </View>
            <View style={styles.progressRow}>
              <View style={styles.progressLabelRow}>
                <Text style={[styles.progressLabel, { color: theme.colors.text.primary }]}>Libérés (RELEASED)</Text>
                <Text style={[styles.progressVal, { color: theme.colors.text.secondary }]}>{stats.releasedEscrow.toFixed(2)} TND</Text>
              </View>
            </View>
            <View style={styles.progressRow}>
              <View style={styles.progressLabelRow}>
                <Text style={[styles.progressLabel, { color: theme.colors.text.primary }]}>Bloqués / Échoués (FAILED)</Text>
                <Text style={[styles.progressVal, { color: theme.colors.error[500] }]}>{stats.blockedEscrow.toFixed(2)} TND</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Section Activité Utilisateurs */}
        <Text style={[styles.sectionTitle, { color: theme.colors.text.secondary, marginTop: 24 }]}>Activité Utilisateurs</Text>
        <View style={styles.cardRow}>
          <View style={[styles.card, { width: CARD_WIDTH, backgroundColor: theme.colors.background.card, borderColor: theme.colors.border.default }]}>
            <View style={styles.cardHeader}>
              <View style={[styles.iconContainer, { backgroundColor: theme.colors.neutral[100] }]}>
                <Feather name="users" size={18} color={theme.colors.neutral[800]} />
              </View>
            </View>
            <Text style={[styles.cardLabel, { color: theme.colors.text.secondary }]}>Utilisateurs</Text>
            <Text style={[styles.cardValue, { color: theme.colors.text.primary }]}>{stats.totalUsers}</Text>
            <Text style={[styles.cardSubText, { color: theme.colors.text.secondary }]}>{stats.activeUsers} actifs</Text>
          </View>

          <View style={[styles.card, { width: CARD_WIDTH, backgroundColor: theme.colors.background.card, borderColor: theme.colors.border.default }]}>
            <View style={styles.cardHeader}>
              <View style={[styles.iconContainer, { backgroundColor: theme.colors.success[50] }]}>
                <Feather name="check-circle" size={18} color={theme.colors.success[500]} />
              </View>
            </View>
            <Text style={[styles.cardLabel, { color: theme.colors.text.secondary }]}>Transporteurs</Text>
            <Text style={[styles.cardValue, { color: theme.colors.text.primary }]}>{stats.totalTransporters}</Text>
            <Text style={[styles.cardSubText, { color: theme.colors.success[500] }]}>{stats.verifiedTransporters} vérifiés</Text>
          </View>
        </View>

        <View style={[styles.cardFull, { backgroundColor: theme.colors.background.card, borderColor: theme.colors.border.default, marginBottom: 12 }]}>
          <View style={styles.trustScoreRow}>
            <View style={styles.trustScoreLeft}>
              <Text style={[styles.cardFullTitle, { color: theme.colors.text.secondary, marginBottom: 4 }]}>Score de Confiance Moyen</Text>
              <Text style={[styles.trustValue, { color: theme.colors.primary[500] }]}>{stats.avgTrustScore} / 100</Text>
            </View>
            <View style={[styles.iconContainerBig, { backgroundColor: theme.colors.primary[50] }]}>
              <Feather name="award" size={32} color={theme.colors.primary[500]} />
            </View>
          </View>
        </View>

        {/* Section Activité Annonces */}
        <Text style={[styles.sectionTitle, { color: theme.colors.text.secondary, marginTop: 24 }]}>Volume d'Annonces</Text>
        <View style={[styles.cardFull, { backgroundColor: theme.colors.background.card, borderColor: theme.colors.border.default, marginBottom: 40 }]}>
          <View style={styles.jobsStatsGrid}>
            <View style={styles.jobStatItem}>
              <Text style={[styles.jobStatValue, { color: theme.colors.primary[500] }]}>{stats.activeJobs}</Text>
              <Text style={[styles.jobStatLabel, { color: theme.colors.text.secondary }]}>Actives</Text>
            </View>
            <View style={styles.jobStatDivider} />
            <View style={styles.jobStatItem}>
              <Text style={[styles.jobStatValue, { color: theme.colors.success[500] }]}>{stats.completedJobs}</Text>
              <Text style={[styles.jobStatLabel, { color: theme.colors.text.secondary }]}>Livrées</Text>
            </View>
            <View style={styles.jobStatDivider} />
            <View style={styles.jobStatItem}>
              <Text style={[styles.jobStatValue, { color: theme.colors.warning[500] }]}>{stats.pendingJobs}</Text>
              <Text style={[styles.jobStatLabel, { color: theme.colors.text.secondary }]}>Brouillons</Text>
            </View>
            <View style={styles.jobStatDivider} />
            <View style={styles.jobStatItem}>
              <Text style={[styles.jobStatValue, { color: theme.colors.error[500] }]}>{stats.cancelledJobs}</Text>
              <Text style={[styles.jobStatLabel, { color: theme.colors.text.secondary }]}>Annulées</Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    height: 56,
    borderBottomWidth: 1,
  },
  backButton: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 22,
  },
  refreshButton: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 22,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  scrollContent: {
    padding: 16,
  },
  disputeBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 20,
    gap: 12,
  },
  disputeTextContainer: {
    flex: 1,
  },
  disputeTitle: {
    fontSize: 15,
    fontWeight: 'bold',
  },
  disputeSub: {
    fontSize: 12,
    marginTop: 2,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    textTransform: 'uppercase',
    marginBottom: 12,
    marginLeft: 4,
  },
  cardRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  card: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  iconContainer: {
    width: 32,
    height: 32,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardLabel: {
    fontSize: 12,
    fontWeight: '500',
    marginBottom: 4,
  },
  cardValue: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  cardSubText: {
    fontSize: 11,
  },
  cardFull: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 16,
  },
  cardFullTitle: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 12,
  },
  progressSection: {
    gap: 12,
  },
  progressRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  progressLabelRow: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  progressLabel: {
    fontSize: 13,
  },
  progressVal: {
    fontSize: 13,
    fontWeight: '600',
  },
  trustScoreRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  trustScoreLeft: {
    flex: 1,
  },
  trustValue: {
    fontSize: 24,
    fontWeight: 'bold',
    marginTop: 4,
  },
  iconContainerBig: {
    width: 56,
    height: 56,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  jobsStatsGrid: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
  },
  jobStatItem: {
    flex: 1,
    alignItems: 'center',
  },
  jobStatValue: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  jobStatLabel: {
    fontSize: 11,
    fontWeight: '500',
  },
  jobStatDivider: {
    width: 1,
    height: 32,
    backgroundColor: '#E8EAED',
  },
  errorText: {
    fontSize: 14,
    textAlign: 'center',
    marginTop: 12,
    marginBottom: 20,
  },
  retryButton: {
    height: 44,
    paddingHorizontal: 24,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  retryButtonText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: 'bold',
  },
});
