import React, { useState } from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, ScrollView, TextInput, ActivityIndicator, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { useTheme } from '../../src/core/theme/ThemeProvider';
import { useAuthStore } from '../../src/core/auth/authStore';
import { useDashboardMetrics } from '../../src/features/payments/api/walletApi';

export default function WalletScreen() {
  const { theme, isRTL } = useTheme();
  const router = useRouter();
  const { user } = useAuthStore();
  const { data: metrics, isLoading, refetch } = useDashboardMetrics();

  // Payout request form state
  const [bankName, setBankName] = useState('');
  const [beneficiaryName, setBeneficiaryName] = useState(user?.name || '');
  const [rib, setRib] = useState('');
  const [isSubmittingPayout, setIsSubmittingPayout] = useState(false);

  const isTransporter = user?.role === 'TRANSPORTER';

  const handleRequestPayout = () => {
    if (!bankName || !beneficiaryName || !rib) {
      Alert.alert('Champs requis', 'Veuillez remplir toutes les informations bancaires.');
      return;
    }

    if (rib.length !== 20 || isNaN(Number(rib))) {
      Alert.alert('RIB Invalide', 'Le RIB tunisien doit être composé d’exactement 20 chiffres.');
      return;
    }

    const earnings = (metrics?.role === 'TRANSPORTER' && metrics.total_earned) || 0;
    if (earnings <= 0) {
      Alert.alert('Solde insuffisant', 'Vous n’avez aucun gain disponible pour le virement.');
      return;
    }

    setIsSubmittingPayout(true);

    // Simulate API delay
    setTimeout(() => {
      setIsSubmittingPayout(false);
      Alert.alert(
        'Demande reçue',
        `Votre demande de virement de ${earnings} TND a été soumise avec succès. Elle sera créditée sur votre compte sous 3 jours ouvrables.`,
        [
          {
            text: 'OK',
            onPress: () => {
              setBankName('');
              setRib('');
              refetch();
            },
          },
        ]
      );
    }, 1500);
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

  const earnings = (metrics?.role === 'TRANSPORTER' && metrics.total_earned) || 0;
  const spent = (metrics?.role === 'CLIENT' && metrics.total_spent) || 0;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background.default }]}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: theme.colors.border.default }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Feather name={isRTL ? "arrow-right" : "arrow-left"} size={24} color={theme.colors.text.primary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.colors.text.primary }]}>Portefeuille & Gains</Text>
        <View style={{ width: 44 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Balance Card */}
        <View style={[styles.balanceCard, { backgroundColor: isTransporter ? theme.colors.success[50] : theme.colors.primary[50] }]}>
          <Feather 
            name={isTransporter ? "trending-up" : "credit-card"} 
            size={28} 
            color={isTransporter ? theme.colors.success[700] : theme.colors.primary[700]} 
          />
          <Text style={[styles.balanceLabel, { color: theme.colors.text.secondary }]}>
            {isTransporter ? 'Gains totaux accumulés (Net)' : 'Montant total dépensé'}
          </Text>
          <Text style={[styles.balanceValue, { color: isTransporter ? theme.colors.success[700] : theme.colors.primary[700] }]}>
            {isTransporter ? `${earnings.toFixed(2)} TND` : `${spent.toFixed(2)} TND`}
          </Text>
        </View>

        {/* Stats Grid */}
        <Text style={[styles.sectionTitle, { color: theme.colors.text.secondary }]}>Statistiques financières</Text>
        
        {isTransporter && metrics?.role === 'TRANSPORTER' ? (
          <View style={styles.grid}>
            <View style={[styles.gridCard, { backgroundColor: theme.colors.background.card, borderColor: theme.colors.border.default }]}>
              <Text style={[styles.gridValue, { color: theme.colors.text.primary }]}>{metrics.completed_missions}</Text>
              <Text style={[styles.gridLabel, { color: theme.colors.text.secondary }]}>Missions livrées</Text>
            </View>
            <View style={[styles.gridCard, { backgroundColor: theme.colors.background.card, borderColor: theme.colors.border.default }]}>
              <Text style={[styles.gridValue, { color: theme.colors.text.primary }]}>{metrics.total_offers}</Text>
              <Text style={[styles.gridLabel, { color: theme.colors.text.secondary }]}>Offres soumises</Text>
            </View>
            <View style={[styles.gridCard, { backgroundColor: theme.colors.background.card, borderColor: theme.colors.border.default }]}>
              <Text style={[styles.gridValue, { color: theme.colors.text.primary }]}>{metrics.acceptance_rate}%</Text>
              <Text style={[styles.gridLabel, { color: theme.colors.text.secondary }]}>Taux d'acceptation</Text>
            </View>
            <View style={[styles.gridCard, { backgroundColor: theme.colors.background.card, borderColor: theme.colors.border.default }]}>
              <Text style={[styles.gridValue, { color: theme.colors.text.primary }]}>{metrics.avg_rating} ⭐</Text>
              <Text style={[styles.gridLabel, { color: theme.colors.text.secondary }]}>Note ({metrics.review_count} avis)</Text>
            </View>
          </View>
        ) : metrics?.role === 'CLIENT' ? (
          <View style={styles.grid}>
            <View style={[styles.gridCard, { backgroundColor: theme.colors.background.card, borderColor: theme.colors.border.default }]}>
              <Text style={[styles.gridValue, { color: theme.colors.text.primary }]}>{metrics.completed_jobs}</Text>
              <Text style={[styles.gridLabel, { color: theme.colors.text.secondary }]}>Missions complétées</Text>
            </View>
            <View style={[styles.gridCard, { backgroundColor: theme.colors.background.card, borderColor: theme.colors.border.default }]}>
              <Text style={[styles.gridValue, { color: theme.colors.text.primary }]}>{metrics.active_jobs}</Text>
              <Text style={[styles.gridLabel, { color: theme.colors.text.secondary }]}>Missions actives</Text>
            </View>
            <View style={[styles.gridCard, { backgroundColor: theme.colors.background.card, borderColor: theme.colors.border.default }]}>
              <Text style={[styles.gridValue, { color: theme.colors.text.primary }]}>{metrics.favorite_transporters}</Text>
              <Text style={[styles.gridLabel, { color: theme.colors.text.secondary }]}>Favoris enregistrés</Text>
            </View>
          </View>
        ) : null}

        {/* Payout Form (Transporters only) */}
        {isTransporter ? (
          <View style={styles.payoutSection}>
            <Text style={[styles.sectionTitle, { color: theme.colors.text.secondary }]}>Demande de virement</Text>
            <View style={[styles.payoutCard, { backgroundColor: theme.colors.background.card, borderColor: theme.colors.border.default }]}>
              <Text style={[styles.payoutDesc, { color: theme.colors.text.secondary }]}>
                Transférez vos gains directement vers votre compte bancaire ou postal tunisien.
              </Text>

              <View style={styles.formGroup}>
                <Text style={[styles.label, { color: theme.colors.text.primary }]}>Nom de la banque</Text>
                <TextInput
                  style={[styles.input, { borderColor: theme.colors.border.default, color: theme.colors.text.primary }]}
                  placeholder="Ex: BIAT, BH, Poste Tunisienne..."
                  placeholderTextColor={theme.colors.text.disabled}
                  value={bankName}
                  onChangeText={setBankName}
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={[styles.label, { color: theme.colors.text.primary }]}>Nom du bénéficiaire</Text>
                <TextInput
                  style={[styles.input, { borderColor: theme.colors.border.default, color: theme.colors.text.primary }]}
                  placeholder="Nom complet"
                  placeholderTextColor={theme.colors.text.disabled}
                  value={beneficiaryName}
                  onChangeText={setBeneficiaryName}
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={[styles.label, { color: theme.colors.text.primary }]}>Numéro RIB (20 chiffres)</Text>
                <TextInput
                  style={[styles.input, { borderColor: theme.colors.border.default, color: theme.colors.text.primary }]}
                  placeholder="Ex: 01234567890123456789"
                  placeholderTextColor={theme.colors.text.disabled}
                  keyboardType="numeric"
                  maxLength={20}
                  value={rib}
                  onChangeText={setRib}
                />
              </View>

              <TouchableOpacity
                style={[styles.payoutBtn, { backgroundColor: theme.colors.success[500] }, earnings <= 0 && styles.btnDisabled]}
                onPress={handleRequestPayout}
                disabled={earnings <= 0 || isSubmittingPayout}
              >
                {isSubmittingPayout ? (
                  <ActivityIndicator color="#FFF" />
                ) : (
                  <>
                    <Feather name="arrow-up-right" size={18} color="#FFF" />
                    <Text style={styles.payoutBtnText}>Demander le virement</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          /* Escrow Explain Box (Clients only) */
          <View style={styles.infoBoxSection}>
            <View style={[styles.infoBox, { backgroundColor: theme.colors.primary[50], borderColor: theme.colors.primary[100] }]}>
              <Feather name="shield" size={24} color={theme.colors.primary[700]} style={{ marginBottom: 10 }} />
              <Text style={[styles.infoBoxTitle, { color: theme.colors.text.primary }]}>
                Paiement sécurisé par séquestre
              </Text>
              <Text style={[styles.infoBoxText, { color: theme.colors.text.secondary }]}>
                Lorsque vous acceptez une offre en ligne, votre argent est placé en séquestre de manière sécurisée. Les fonds ne sont versés au transporteur que lorsque vous confirmez la bonne réception de la livraison depuis l'écran de la mission.
              </Text>
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
  balanceCard: {
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    marginBottom: 24,
  },
  balanceLabel: {
    fontSize: 13,
    marginTop: 12,
  },
  balanceValue: {
    fontSize: 28,
    fontWeight: 'bold',
    marginTop: 6,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    textTransform: 'uppercase',
    marginBottom: 12,
    marginLeft: 4,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 24,
  },
  gridCard: {
    width: '48%',
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
    justifyContent: 'center',
  },
  gridValue: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  gridLabel: {
    fontSize: 12,
    marginTop: 4,
  },
  payoutSection: {
    marginTop: 12,
  },
  payoutCard: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 20,
    marginBottom: 40,
  },
  payoutDesc: {
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 20,
  },
  formGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 13,
    fontWeight: 'bold',
    marginBottom: 6,
  },
  input: {
    height: 48,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    fontSize: 14,
  },
  payoutBtn: {
    height: 48,
    borderRadius: 8,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 12,
    gap: 8,
  },
  payoutBtnText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: 'bold',
  },
  btnDisabled: {
    opacity: 0.5,
  },
  infoBoxSection: {
    marginTop: 12,
  },
  infoBox: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 20,
    marginBottom: 40,
  },
  infoBoxTitle: {
    fontSize: 15,
    fontWeight: 'bold',
    marginBottom: 6,
  },
  infoBoxText: {
    fontSize: 13,
    lineHeight: 20,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
