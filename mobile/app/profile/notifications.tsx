import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, ScrollView, Switch, ActivityIndicator, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { useTheme } from '../../src/core/theme/ThemeProvider';
import { useNotificationPreferences, useUpdateNotificationPreferences } from '../../src/features/identity/api/notificationPrefsApi';

export default function NotificationPreferencesScreen() {
  const { theme, isRTL } = useTheme();
  const router = useRouter();
  const { data: prefs, isLoading, error } = useNotificationPreferences();
  const updatePrefsMutation = useUpdateNotificationPreferences();

  // Local state for toggles
  const [emailEnabled, setEmailEnabled] = useState(true);
  const [pushEnabled, setPushEnabled] = useState(true);
  const [smsEnabled, setSmsEnabled] = useState(false);
  const [notifyNewOffer, setNotifyNewOffer] = useState(true);
  const [notifyOfferAccepted, setNotifyOfferAccepted] = useState(true);
  const [notifyNewMessage, setNotifyNewMessage] = useState(true);

  // Sync local state when API data loads
  useEffect(() => {
    if (prefs) {
      setEmailEnabled(prefs.email_enabled);
      setPushEnabled(prefs.push_enabled);
      setSmsEnabled(prefs.sms_enabled);
      setNotifyNewOffer(prefs.notify_new_offer);
      setNotifyOfferAccepted(prefs.notify_offer_accepted);
      setNotifyNewMessage(prefs.notify_new_message);
    }
  }, [prefs]);

  const handleSave = async () => {
    try {
      await updatePrefsMutation.mutateAsync({
        email_enabled: emailEnabled,
        push_enabled: pushEnabled,
        sms_enabled: smsEnabled,
        notify_new_offer: notifyNewOffer,
        notify_offer_accepted: notifyOfferAccepted,
        notify_new_message: notifyNewMessage,
      });
      Alert.alert('Succès', 'Vos préférences de notification ont été mises à jour.');
    } catch (err: any) {
      Alert.alert('Erreur', err.message || 'Impossible de sauvegarder vos préférences.');
    }
  };

  if (isLoading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background.default }]}>
        <View style={styles.center}>
          <ActivityIndicator size="large" color={theme.colors.primary[500]} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background.default }]}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: theme.colors.border.default }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Feather name={isRTL ? "arrow-right" : "arrow-left"} size={24} color={theme.colors.text.primary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.colors.text.primary }]}>Notifications</Text>
        <View style={{ width: 44 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Canaux Section */}
        <Text style={[styles.sectionTitle, { color: theme.colors.text.secondary }]}>Canaux de notification</Text>
        
        <View style={[styles.card, { backgroundColor: theme.colors.background.card, borderColor: theme.colors.border.default }]}>
          <TouchableOpacity 
            style={styles.row} 
            onPress={() => setEmailEnabled(!emailEnabled)}
            activeOpacity={0.7}
          >
            <View style={styles.rowLeft}>
              <Text style={[styles.rowLabel, { color: theme.colors.text.primary }]}>Email</Text>
              <Text style={[styles.rowSub, { color: theme.colors.text.secondary }]}>Recevoir les alertes par email</Text>
            </View>
            <Switch
              value={emailEnabled}
              onValueChange={setEmailEnabled}
              trackColor={{ false: theme.colors.neutral[200], true: theme.colors.primary[100] }}
              thumbColor={emailEnabled ? theme.colors.primary[500] : theme.colors.neutral[400]}
            />
          </TouchableOpacity>

          <View style={[styles.divider, { backgroundColor: theme.colors.border.default }]} />

          <TouchableOpacity 
            style={styles.row} 
            onPress={() => setPushEnabled(!pushEnabled)}
            activeOpacity={0.7}
          >
            <View style={styles.rowLeft}>
              <Text style={[styles.rowLabel, { color: theme.colors.text.primary }]}>Notifications push</Text>
              <Text style={[styles.rowSub, { color: theme.colors.text.secondary }]}>Notifications sur votre mobile</Text>
            </View>
            <Switch
              value={pushEnabled}
              onValueChange={setPushEnabled}
              trackColor={{ false: theme.colors.neutral[200], true: theme.colors.primary[100] }}
              thumbColor={pushEnabled ? theme.colors.primary[500] : theme.colors.neutral[400]}
            />
          </TouchableOpacity>

          <View style={[styles.divider, { backgroundColor: theme.colors.border.default }]} />

          <TouchableOpacity 
            style={styles.row} 
            onPress={() => setSmsEnabled(!smsEnabled)}
            activeOpacity={0.7}
          >
            <View style={styles.rowLeft}>
              <Text style={[styles.rowLabel, { color: theme.colors.text.primary }]}>SMS</Text>
              <Text style={[styles.rowSub, { color: theme.colors.text.secondary }]}>Alertes importantes par SMS</Text>
            </View>
            <Switch
              value={smsEnabled}
              onValueChange={setSmsEnabled}
              trackColor={{ false: theme.colors.neutral[200], true: theme.colors.primary[100] }}
              thumbColor={smsEnabled ? theme.colors.primary[500] : theme.colors.neutral[400]}
            />
          </TouchableOpacity>
        </View>

        {/* Types Section */}
        <Text style={[styles.sectionTitle, { color: theme.colors.text.secondary, marginTop: 24 }]}>Types de notification</Text>
        
        <View style={[styles.card, { backgroundColor: theme.colors.background.card, borderColor: theme.colors.border.default }]}>
          <TouchableOpacity 
            style={styles.row} 
            onPress={() => setNotifyNewOffer(!notifyNewOffer)}
            activeOpacity={0.7}
          >
            <View style={styles.rowLeft}>
              <Text style={[styles.rowLabel, { color: theme.colors.text.primary }]}>Nouvelles offres</Text>
              <Text style={[styles.rowSub, { color: theme.colors.text.secondary }]}>Quand une nouvelle offre est reçue</Text>
            </View>
            <Switch
              value={notifyNewOffer}
              onValueChange={setNotifyNewOffer}
              trackColor={{ false: theme.colors.neutral[200], true: theme.colors.primary[100] }}
              thumbColor={notifyNewOffer ? theme.colors.primary[500] : theme.colors.neutral[400]}
            />
          </TouchableOpacity>

          <View style={[styles.divider, { backgroundColor: theme.colors.border.default }]} />

          <TouchableOpacity 
            style={styles.row} 
            onPress={() => setNotifyOfferAccepted(!notifyOfferAccepted)}
            activeOpacity={0.7}
          >
            <View style={styles.rowLeft}>
              <Text style={[styles.rowLabel, { color: theme.colors.text.primary }]}>Réservations & Statuts</Text>
              <Text style={[styles.rowSub, { color: theme.colors.text.secondary }]}>Mises à jour et confirmations de livraison</Text>
            </View>
            <Switch
              value={notifyOfferAccepted}
              onValueChange={setNotifyOfferAccepted}
              trackColor={{ false: theme.colors.neutral[200], true: theme.colors.primary[100] }}
              thumbColor={notifyOfferAccepted ? theme.colors.primary[500] : theme.colors.neutral[400]}
            />
          </TouchableOpacity>

          <View style={[styles.divider, { backgroundColor: theme.colors.border.default }]} />

          <TouchableOpacity 
            style={styles.row} 
            onPress={() => setNotifyNewMessage(!notifyNewMessage)}
            activeOpacity={0.7}
          >
            <View style={styles.rowLeft}>
              <Text style={[styles.rowLabel, { color: theme.colors.text.primary }]}>Messages</Text>
              <Text style={[styles.rowSub, { color: theme.colors.text.secondary }]}>Nouveaux messages dans le chat</Text>
            </View>
            <Switch
              value={notifyNewMessage}
              onValueChange={setNotifyNewMessage}
              trackColor={{ false: theme.colors.neutral[200], true: theme.colors.primary[100] }}
              thumbColor={notifyNewMessage ? theme.colors.primary[500] : theme.colors.neutral[400]}
            />
          </TouchableOpacity>
        </View>

        {/* Save Button */}
        <TouchableOpacity
          style={[styles.saveButton, { backgroundColor: theme.colors.primary[500] }]}
          onPress={handleSave}
          disabled={updatePrefsMutation.isPending}
        >
          {updatePrefsMutation.isPending ? (
            <ActivityIndicator color="#FFF" />
          ) : (
            <>
              <Feather name="save" size={18} color="#FFF" />
              <Text style={styles.saveButtonText}>Sauvegarder les préférences</Text>
            </>
          )}
        </TouchableOpacity>
      </ScrollView>
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
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  scrollContent: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    textTransform: 'uppercase',
    marginBottom: 8,
    marginLeft: 4,
  },
  card: {
    borderWidth: 1,
    borderRadius: 12,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    minHeight: 64, // WCAG target
  },
  rowLeft: {
    flex: 1,
    paddingRight: 16,
  },
  rowLabel: {
    fontSize: 15,
    fontWeight: 'bold',
  },
  rowSub: {
    fontSize: 12,
    marginTop: 2,
  },
  divider: {
    height: 1,
  },
  saveButton: {
    height: 48,
    borderRadius: 8,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 32,
    marginBottom: 40,
    gap: 8,
  },
  saveButtonText: {
    color: '#FFF',
    fontSize: 15,
    fontWeight: 'bold',
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
