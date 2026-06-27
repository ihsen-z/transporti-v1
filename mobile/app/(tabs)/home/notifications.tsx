import React from 'react';
import { View, Text, StyleSheet, SafeAreaView, FlatList, ActivityIndicator, TouchableOpacity } from 'react-native';
import { useNotifications, useMarkNotificationRead } from '../../../src/features/notifications/api/notificationApi';
import { useTheme } from '../../../src/core/theme/ThemeProvider';
import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

export default function NotificationsScreen() {
  const { theme } = useTheme();
  const router = useRouter();
  const { data: notifications, isLoading, error, refetch } = useNotifications();
  const { mutate: markRead } = useMarkNotificationRead();

  const handleMarkRead = (id: number) => {
    markRead(id);
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'JOB':
        return 'briefcase';
      case 'PAYMENT':
        return 'credit-card';
      case 'TRUST':
        return 'shield';
      case 'DISPUTE':
        return 'alert-triangle';
      case 'REVIEW':
        return 'star';
      default:
        return 'bell';
    }
  };

  const renderItem = ({ item }: { item: any }) => (
    <TouchableOpacity
      style={[
        styles.notiCard,
        { backgroundColor: theme.colors.background.card, borderColor: theme.colors.border.default },
        !item.is_read && { borderLeftWidth: 4, borderLeftColor: theme.colors.primary[500] },
      ]}
      onPress={() => {
        if (!item.is_read) handleMarkRead(item.id);
      }}
    >
      <View style={[styles.iconContainer, { backgroundColor: theme.colors.neutral[100] }]}>
        <Feather name={getCategoryIcon(item.category)} size={20} color={theme.colors.primary[500]} />
      </View>
      <View style={styles.notiContent}>
        <Text style={[styles.title, { color: theme.colors.text.primary }, !item.is_read && { fontWeight: 'bold' }]}>
          {item.title}
        </Text>
        <Text style={[styles.body, { color: theme.colors.text.secondary }]}>{item.body}</Text>
        <Text style={styles.time}>{new Date(item.created_at).toLocaleDateString('fr-FR')}</Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background.default }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Feather name="arrow-left" size={24} color={theme.colors.text.primary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.colors.text.primary }]}>Notifications</Text>
      </View>

      {isLoading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary[500]} />
        </View>
      ) : error ? (
        <View style={styles.centerContainer}>
          <Feather name="alert-circle" size={40} color={theme.colors.error[500]} />
          <Text style={[styles.errorText, { color: theme.colors.text.primary }]}>Erreur lors du chargement des notifications</Text>
        </View>
      ) : notifications && notifications.length === 0 ? (
        <View style={styles.centerContainer}>
          <Feather name="bell-off" size={48} color={theme.colors.neutral[400]} />
          <Text style={[styles.emptyText, { color: theme.colors.text.secondary }]}>Vous n'avez pas de notifications.</Text>
        </View>
      ) : (
        <FlatList
          data={notifications}
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
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E8EAED',
  },
  backButton: {
    marginRight: 16,
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
  notiCard: {
    flexDirection: 'row',
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    alignItems: 'center',
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  notiContent: {
    flex: 1,
  },
  title: {
    fontSize: 14,
    marginBottom: 4,
  },
  body: {
    fontSize: 12,
    marginBottom: 6,
  },
  time: {
    fontSize: 10,
    color: '#777',
  },
  errorText: {
    fontSize: 15,
    fontWeight: '500',
    marginTop: 12,
  },
  emptyText: {
    fontSize: 14,
    marginTop: 12,
  },
});
