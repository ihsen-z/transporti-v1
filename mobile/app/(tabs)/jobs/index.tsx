import React from 'react';
import { View, Text, StyleSheet, SafeAreaView, FlatList, ActivityIndicator, TouchableOpacity } from 'react-native';
import { useJobsList } from '../../../src/features/jobs/api/jobApi';
import { useAuthStore } from '../../../src/core/auth/authStore';
import { useTheme } from '../../../src/core/theme/ThemeProvider';
import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

export default function JobsScreen() {
  const { user } = useAuthStore();
  const { theme } = useTheme();
  const router = useRouter();
  const isClient = user?.role === 'CLIENT';
  
  const { data: jobs, isLoading, error, refetch } = useJobsList(isClient ? 'my' : 'public');

  const renderItem = ({ item }: { item: any }) => (
    <TouchableOpacity
      style={[styles.jobCard, { backgroundColor: theme.colors.background.card, borderColor: theme.colors.border.default }]}
      onPress={() => router.push(`/job/${item.id}`)}
    >
      <View style={styles.cardHeader}>
        <Text style={[styles.jobType, { color: theme.colors.primary[500] }]}>{item.jobType}</Text>
        <Text style={styles.jobPrice}>{item.formattedPriceRange}</Text>
      </View>
      <Text style={[styles.address, { color: theme.colors.text.primary }]}>
        📍 {item.pickupAddress} ➔ {item.dropoffAddress}
      </Text>
      {item.description ? (
        <Text style={[styles.desc, { color: theme.colors.text.secondary }]} numberOfLines={2}>
          {item.description}
        </Text>
      ) : null}
      <View style={styles.cardFooter}>
        <Text style={styles.dateText}>📅 {item.scheduledTime.toLocaleDateString('fr-FR')}</Text>
        <View style={[styles.statusBadge, { backgroundColor: theme.colors.primary[50] }]}>
          <Text style={[styles.statusText, { color: theme.colors.primary[700] }]}>{item.status}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background.default }]}>
      <View style={styles.header}>
        <Text style={[styles.headerTitle, { color: theme.colors.text.primary }]}>
          {isClient ? 'Mes Annonces' : 'Annonces Disponibles'}
        </Text>
      </View>

      {isLoading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary[500]} />
        </View>
      ) : error ? (
        <View style={styles.centerContainer}>
          <Feather name="alert-circle" size={40} color={theme.colors.error[500]} />
          <Text style={[styles.errorText, { color: theme.colors.text.primary }]}>Erreur lors du chargement des annonces</Text>
          <TouchableOpacity style={[styles.retryButton, { backgroundColor: theme.colors.primary[500] }]} onPress={() => refetch()}>
            <Text style={styles.retryButtonText}>Réessayer</Text>
          </TouchableOpacity>
        </View>
      ) : jobs && jobs.length === 0 ? (
        <View style={styles.centerContainer}>
          <Feather name="inbox" size={48} color={theme.colors.neutral[400]} />
          <Text style={[styles.emptyText, { color: theme.colors.text.secondary }]}>Aucune annonce pour le moment.</Text>
        </View>
      ) : (
        <FlatList
          data={jobs}
          renderItem={renderItem}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={styles.listContent}
          onRefresh={refetch}
          refreshing={isLoading}
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
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E8EAED',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  listContent: {
    padding: 16,
  },
  jobCard: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  jobType: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  jobPrice: {
    fontSize: 15,
    fontWeight: 'bold',
  },
  address: {
    fontSize: 13,
    fontWeight: '500',
    marginBottom: 8,
  },
  desc: {
    fontSize: 12,
    marginBottom: 12,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#F1F3F4',
    paddingTop: 12,
  },
  dateText: {
    fontSize: 12,
    color: '#777',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600',
  },
  errorText: {
    fontSize: 15,
    fontWeight: '500',
    marginVertical: 12,
    textAlign: 'center',
  },
  retryButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '600',
  },
  emptyText: {
    fontSize: 14,
    marginTop: 12,
    textAlign: 'center',
  },
});
