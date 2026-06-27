import React, { useState } from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, ScrollView, ActivityIndicator, Alert, TextInput } from 'react-native';
import { useTrustProfile, useSubmitVerification } from '../../src/features/trust/api/trustApi';
import { useTheme } from '../../src/core/theme/ThemeProvider';
import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

export default function TrustStatusScreen() {
  const { theme } = useTheme();
  const router = useRouter();
  const { data: profile, isLoading, error, refetch } = useTrustProfile();
  const { mutateAsync: submitVerification, isPending: isSubmitting } = useSubmitVerification();

  const [vehicleType, setVehicleType] = useState('');
  const [vehicleCapacity, setVehicleCapacity] = useState('');
  const [vehiclePlate, setVehiclePlate] = useState('');

  const handleSubmit = async () => {
    if (!vehicleType || !vehicleCapacity || !vehiclePlate) {
      Alert.alert('Champs requis', 'Veuillez remplir tous les détails du véhicule.');
      return;
    }

    try {
      await submitVerification({
        vehicle_type: vehicleType,
        vehicle_capacity_kg: vehicleCapacity,
        vehicle_plate: vehiclePlate,
      });
      Alert.alert('Succès', 'Votre demande de vérification a été soumise.', [
        { text: 'OK', onPress: () => refetch() },
      ]);
    } catch (err: any) {
      Alert.alert('Erreur', err.message || 'Échec de la soumission.');
    }
  };

  if (isLoading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background.default }]}>
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary[500]} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background.default }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Feather name="arrow-left" size={24} color={theme.colors.text.primary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.colors.text.primary }]}>Vérification KYC</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={[styles.statusCard, { backgroundColor: theme.colors.background.card, borderColor: theme.colors.border.default }]}>
          <Feather
            name={profile?.isVerified ? 'check-circle' : profile?.isPending ? 'clock' : 'alert-circle'}
            size={40}
            color={profile?.isVerified ? theme.colors.success[500] : profile?.isPending ? theme.colors.warning[500] : theme.colors.error[500]}
          />
          <Text style={[styles.statusTitle, { color: theme.colors.text.primary }]}>
            {profile?.statusLabel || 'Non vérifié'}
          </Text>
          {profile?.rejectionReason && (
            <Text style={[styles.rejectionText, { color: theme.colors.error[700] }]}>
              Motif du rejet : {profile.rejectionReason}
            </Text>
          )}
          <Text style={[styles.scoreText, { color: theme.colors.text.secondary }]}>
            Score de confiance actuel : {profile?.trustScore || 0} / 100
          </Text>
        </View>

        {(!profile || profile.verificationStatus === 'UNVERIFIED' || profile.verificationStatus === 'REJECTED') && (
          <View style={styles.formSection}>
            <Text style={[styles.sectionTitle, { color: theme.colors.text.primary }]}>Soumettre vos documents</Text>

            <View style={styles.docButtonsContainer}>
              <TouchableOpacity style={styles.docButton} onPress={() => router.push('/trust/upload')}>
                <Feather name="upload-cloud" size={20} color="#FFF" />
                <Text style={styles.docButtonText}>ID National (Face)</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.docButton} onPress={() => router.push('/trust/upload')}>
                <Feather name="upload-cloud" size={20} color="#FFF" />
                <Text style={styles.docButtonText}>ID National (Dos)</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Type de véhicule</Text>
              <TextInput
                style={styles.input}
                value={vehicleType}
                onChangeText={setVehicleType}
                placeholder="Ex: Van, Camionnette..."
                placeholderTextColor={theme.colors.text.disabled}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Capacité de charge (kg)</Text>
              <TextInput
                style={styles.input}
                value={vehicleCapacity}
                onChangeText={setVehicleCapacity}
                keyboardType="numeric"
                placeholder="Ex: 1500"
                placeholderTextColor={theme.colors.text.disabled}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Plaque d'immatriculation</Text>
              <TextInput
                style={styles.input}
                value={vehiclePlate}
                onChangeText={setVehiclePlate}
                placeholder="Ex: 123 TUNIS 4567"
                placeholderTextColor={theme.colors.text.disabled}
              />
            </View>

            <TouchableOpacity
              style={[styles.submitButton, { backgroundColor: theme.colors.primary[500] }]}
              onPress={handleSubmit}
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <ActivityIndicator color="#FFF" />
              ) : (
                <Text style={styles.submitButtonText}>Soumettre pour vérification</Text>
              )}
            </TouchableOpacity>
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
  },
  scrollContent: {
    padding: 16,
  },
  statusCard: {
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 16,
    padding: 24,
    marginBottom: 24,
  },
  statusTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginVertical: 12,
    textAlign: 'center',
  },
  rejectionText: {
    fontSize: 13,
    marginBottom: 10,
    textAlign: 'center',
  },
  scoreText: {
    fontSize: 13,
  },
  formSection: {
    width: '100%',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  docButtonsContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  docButton: {
    flex: 1,
    height: 50,
    backgroundColor: '#1A73E8',
    borderRadius: 8,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  docButtonText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: 'bold',
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 13,
    fontWeight: '500',
    marginBottom: 6,
  },
  input: {
    height: 48,
    borderWidth: 1,
    borderColor: '#E8EAED',
    borderRadius: 8,
    backgroundColor: '#FFF',
    paddingHorizontal: 12,
    fontSize: 14,
  },
  submitButton: {
    height: 50,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 10,
    marginBottom: 40,
  },
  submitButtonText: {
    color: '#FFF',
    fontSize: 15,
    fontWeight: '600',
  },
});
