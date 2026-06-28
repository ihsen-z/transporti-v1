import React, { useState } from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, ScrollView, ActivityIndicator, FlatList } from 'react-native';
import { useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { useTheme } from '../../src/core/theme/ThemeProvider';
import { useAuthStore } from '../../src/core/auth/authStore';
import { useMyDisputes } from '../../src/features/disputes/api/disputesApi';
import { DISPUTE_REASON_LABELS, DisputeStatus, DisputeModel } from '../../src/features/disputes/domain/disputeModel';

export default function DisputesListScreen() {
  const { theme, isRTL } = useTheme();
  const router = useRouter();
  const { user } = useAuthStore();
  const { data: disputes, isLoading, error, refetch } = useMyDisputes();
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  };

  const getStatusStyle = (status: DisputeStatus) => {
    switch (status) {
      case 'OPEN':
        return {
          bg: theme.colors.warning[50],
          text: theme.colors.warning[700],
          border: theme.colors.warning[500],
          label: 'Ouvert',
          icon: 'clock' as const,
        };
      case 'INVESTIGATING':
        return {
          bg: theme.colors.primary[50],
          text: theme.colors.primary[700],
          border: theme.colors.primary[500],
          label: 'En cours',
          icon: 'search' as const,
        };
      case 'RESOLVED':
        return {
          bg: theme.colors.success[50],
          text: theme.colors.success[700],
          border: theme.colors.success[500],
          label: 'Résolu',
          icon: 'check-circle' as const,
        };
      case 'REJECTED':
        return {
          bg: theme.colors.error[50],
          text: theme.colors.error[700],
          border: theme.colors.error[500],
          label: 'Rejeté',
          icon: 'x-circle' as const,
        };
      default:
        return {
          bg: theme.colors.neutral[50],
          text: theme.colors.neutral[600],
          border: theme.colors.neutral[200],
          label: status,
          icon: 'alert-circle' as const,
        };
    }
  };

  const filteredDisputes = disputes
    ? statusFilter === 'ALL'
      ? disputes
      : disputes.filter((d) => d.status === statusFilter)
    : [];

  const tabs = [
    { id: 'ALL', label: 'Tous', count: disputes?.length || 0 },
    {
      id: 'OPEN',
      label: 'Ouverts',
      count: disputes?.filter((d) => d.status === 'OPEN').length || 0,
    },
    {
      id: 'INVESTIGATING',
      label: 'En cours',
      count: disputes?.filter((d) => d.status === 'INVESTIGATING').length || 0,
    },
    {
      id: 'RESOLVED',
      label: 'Résolus',
      count: disputes?.filter((d) => d.status === 'RESOLVED').length || 0,
    },
    {
      id: 'REJECTED',
      label: 'Rejetés',
      count: disputes?.filter((d) => d.status === 'REJECTED').length || 0,
    },
  ];

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background.default }]}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: theme.colors.border.default }]}>
        <View style={styles.headerLeft}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Feather name={isRTL ? "arrow-right" : "arrow-left"} size={24} color={theme.colors.text.primary} />
          </TouchableOpacity>
          <View>
            <Text style={[styles.headerTitle, { color: theme.colors.text.primary }]}>Mes Litiges</Text>
            <Text style={[styles.headerSubtitle, { color: theme.colors.text.secondary }]}>Suivi de vos réclamations</Text>
          </View>
        </View>
        <TouchableOpacity
          onPress={() => router.push('/disputes/create')}
          style={[styles.createBtn, { backgroundColor: theme.colors.primary[500] }]}
        >
          <Feather name="plus" size={18} color="#FFF" />
          <Text style={styles.createBtnText}>Nouveau</Text>
        </TouchableOpacity>
      </View>

      {/* Tabs Filter */}
      <View style={styles.tabsContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabsScroll}>
          {tabs.map((tab) => {
            const isActive = statusFilter === tab.id;
            return (
              <TouchableOpacity
                key={tab.id}
                onPress={() => setStatusFilter(tab.id)}
                style={[
                  styles.tabButton,
                  isActive
                    ? { backgroundColor: theme.colors.primary[500] }
                    : { backgroundColor: theme.colors.neutral[100] },
                ]}
              >
                <Text
                  style={[
                    styles.tabButtonText,
                    isActive ? { color: '#FFF' } : { color: theme.colors.neutral[600] },
                  ]}
                >
                  {tab.label}
                </Text>
                {tab.count > 0 && (
                  <View
                    style={[
                      styles.tabBadge,
                      isActive ? { backgroundColor: 'rgba(255,255,255,0.2)' } : { backgroundColor: theme.colors.neutral[200] },
                    ]}
                  >
                    <Text
                      style={[
                        styles.tabBadgeText,
                        isActive ? { color: '#FFF' } : { color: theme.colors.neutral[600] },
                      ]}
                    >
                      {tab.count}
                    </Text>
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* List */}
      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={theme.colors.primary[500]} />
        </View>
      ) : error ? (
        <View style={styles.center}>
          <Feather name="alert-circle" size={48} color={theme.colors.error[500]} />
          <Text style={[styles.errorText, { color: theme.colors.text.primary }]}>
            Erreur lors de la récupération des litiges
          </Text>
          <TouchableOpacity
            style={[styles.retryBtn, { backgroundColor: theme.colors.primary[500] }]}
            onPress={() => refetch()}
          >
            <Text style={styles.retryBtnText}>Réessayer</Text>
          </TouchableOpacity>
        </View>
      ) : filteredDisputes.length === 0 ? (
        <ScrollView contentContainerStyle={styles.emptyContainer}>
          <View style={[styles.emptyIconContainer, { backgroundColor: theme.colors.neutral[50] }]}>
            <Feather name="shield" size={40} color={theme.colors.neutral[400]} />
          </View>
          <Text style={[styles.emptyTitle, { color: theme.colors.text.primary }]}>Aucun litige</Text>
          <Text style={[styles.emptySubtitle, { color: theme.colors.text.secondary }]}>
            {statusFilter === 'ALL'
              ? "Vous n'avez aucun litige ouvert pour le moment."
              : 'Aucun litige ne correspond à ce filtre.'}
          </Text>
          {statusFilter === 'ALL' && (
            <TouchableOpacity
              style={[styles.emptyCreateBtn, { borderColor: theme.colors.primary[500] }]}
              onPress={() => router.push('/disputes/create')}
            >
              <Text style={[styles.emptyCreateBtnText, { color: theme.colors.primary[500] }]}>
                Ouvrir un litige
              </Text>
            </TouchableOpacity>
          )}
        </ScrollView>
      ) : (
        <FlatList
          data={filteredDisputes}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={styles.listContent}
          renderItem={({ item }: { item: DisputeModel }) => {
            const config = getStatusStyle(item.status);
            return (
              <TouchableOpacity
                style={[
                  styles.card,
                  {
                    backgroundColor: theme.colors.background.card,
                    borderColor: theme.colors.border.default,
                  },
                ]}
                onPress={() => router.push(`/job/${item.job}`)}
              >
                <View style={styles.cardHeader}>
                  <View style={styles.cardHeaderLeft}>
                    <View style={[styles.statusIconBg, { backgroundColor: config.bg }]}>
                      <Feather name={config.icon} size={16} color={config.text} />
                    </View>
                    <View>
                      <Text style={[styles.reasonText, { color: theme.colors.text.primary }]} numberOfLines={1}>
                        {DISPUTE_REASON_LABELS[item.reason] || item.reason}
                      </Text>
                      <View style={styles.metaRow}>
                        <Text
                          style={[styles.jobLink, { color: theme.colors.primary[500] }]}
                          onPress={() => router.push(`/job/${item.job}`)}
                        >
                          Mission #{item.job}
                        </Text>
                        <Text style={[styles.metaDot, { color: theme.colors.neutral[400] }]}>·</Text>
                        <Text style={[styles.dateText, { color: theme.colors.text.secondary }]}>
                          {formatDate(item.createdAt)}
                        </Text>
                      </View>
                    </View>
                  </View>
                  <Feather name="chevron-right" size={20} color={theme.colors.neutral[400]} />
                </View>

                {item.jobSummary && (
                  <Text style={[styles.routeText, { color: theme.colors.text.secondary }]} numberOfLines={1}>
                    {item.jobSummary.pickup?.split(',')[0]} → {item.jobSummary.dropoff?.split(',')[0]}
                  </Text>
                )}

                <Text style={[styles.descText, { color: theme.colors.text.secondary }]} numberOfLines={2}>
                  {item.description}
                </Text>

                {item.resolutionNotes && (
                  <View
                    style={[
                      styles.notesBox,
                      {
                        backgroundColor: item.status === 'RESOLVED' ? theme.colors.success[50] : theme.colors.error[50],
                        borderColor: item.status === 'RESOLVED' ? theme.colors.success[500] : theme.colors.error[500],
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.notesTitle,
                        { color: item.status === 'RESOLVED' ? theme.colors.success[700] : theme.colors.error[700] },
                      ]}
                    >
                      {item.status === 'RESOLVED' ? '✅ Résolution :' : '❌ Motif du rejet :'}
                    </Text>
                    <Text
                      style={[
                        styles.notesContent,
                        { color: item.status === 'RESOLVED' ? theme.colors.success[700] : theme.colors.error[700] },
                      ]}
                    >
                      {item.resolutionNotes}
                    </Text>
                  </View>
                )}
              </TouchableOpacity>
            );
          }}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  backButton: {
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
  headerSubtitle: {
    fontSize: 12,
  },
  createBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    height: 40,
    borderRadius: 8,
    gap: 4,
  },
  createBtnText: {
    color: '#FFF',
    fontSize: 13,
    fontWeight: 'bold',
  },
  tabsContainer: {
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F3F4',
  },
  tabsScroll: {
    paddingHorizontal: 16,
    gap: 8,
  },
  tabButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    height: 36,
    borderRadius: 18,
    gap: 6,
  },
  tabButtonText: {
    fontSize: 13,
    fontWeight: '500',
  },
  tabBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
  },
  tabBadgeText: {
    fontSize: 10,
    fontWeight: 'bold',
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  errorText: {
    fontSize: 14,
    marginVertical: 12,
    textAlign: 'center',
  },
  retryBtn: {
    paddingHorizontal: 20,
    height: 40,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  retryBtnText: {
    color: '#FFF',
    fontWeight: 'bold',
  },
  emptyContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  emptyIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 20,
  },
  emptyCreateBtn: {
    borderWidth: 1.5,
    paddingHorizontal: 20,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyCreateBtnText: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  listContent: {
    padding: 16,
    gap: 16,
  },
  card: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  cardHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  statusIconBg: {
    width: 32,
    height: 32,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  reasonText: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  jobLink: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  metaDot: {
    marginHorizontal: 6,
    fontSize: 12,
  },
  dateText: {
    fontSize: 12,
  },
  routeText: {
    fontSize: 12,
    fontStyle: 'italic',
    marginBottom: 8,
    marginLeft: 44,
  },
  descText: {
    fontSize: 13,
    lineHeight: 18,
    marginLeft: 44,
  },
  notesBox: {
    marginTop: 12,
    marginLeft: 44,
    padding: 10,
    borderRadius: 8,
    borderWidth: 0.5,
  },
  notesTitle: {
    fontSize: 11,
    fontWeight: 'bold',
    marginBottom: 2,
  },
  notesContent: {
    fontSize: 12,
    lineHeight: 16,
  },
});
