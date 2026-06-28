import React, { useState } from 'react';
import { View, Text, StyleSheet, SafeAreaView, ScrollView, TouchableOpacity, ActivityIndicator, Alert, TextInput, Modal } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useJobDetail, useJobOffers, useAcceptOffer, useSubmitOffer, useConfirmCompletion } from '../../src/features/jobs/api/jobApi';
import { useAuthStore } from '../../src/core/auth/authStore';
import { useTheme } from '../../src/core/theme/ThemeProvider';
import { Feather } from '@expo/vector-icons';
import { MapViewWrapper } from '../../src/shared/components/maps/MapViewWrapper';
import { apiClient } from '../../src/core/api/client';

export default function JobDetailScreen() {
  const { id } = useLocalSearchParams();
  const jobId = Number(id);
  const router = useRouter();
  const { user } = useAuthStore();
  const { theme } = useTheme();

  const isClient = user?.role === 'CLIENT';

  const { data: job, isLoading: isJobLoading, error: jobError, refetch: refetchJob } = useJobDetail(jobId);
  const { data: offers, isLoading: isOffersLoading, refetch: refetchOffers } = useJobOffers(jobId);

  const { mutateAsync: acceptOffer, isPending: isAccepting } = useAcceptOffer();
  const { mutateAsync: submitOffer, isPending: isSubmittingOffer } = useSubmitOffer();
  const { mutateAsync: confirmCompletion, isPending: isCompleting } = useConfirmCompletion();

  // Transporter bid form state
  const [bidPrice, setBidPrice] = useState('');
  const [bidMessage, setBidMessage] = useState('');

  // Client accept offer state
  const [selectedOfferId, setSelectedOfferId] = useState<number | null>(null);
  const [isPaymentModalVisible, setIsPaymentModalVisible] = useState(false);
  const [isInitiatingPayment, setIsInitiatingPayment] = useState(false);

  if (isJobLoading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background.default }]}>
        <View style={styles.center}>
          <ActivityIndicator size="large" color={theme.colors.primary[500]} />
        </View>
      </SafeAreaView>
    );
  }

  if (jobError || !job) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background.default }]}>
        <View style={styles.center}>
          <Feather name="alert-circle" size={48} color={theme.colors.error[500]} />
          <Text style={[styles.errorText, { color: theme.colors.text.primary }]}>Erreur lors du chargement de la mission</Text>
          <TouchableOpacity style={[styles.backButton, { backgroundColor: theme.colors.primary[500] }]} onPress={() => router.back()}>
            <Text style={styles.backButtonText}>Retour</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // Find if transporter already bid
  const myOffer = offers?.find((o) => o.transporter.id === user?.id);

  // Map settings
  const hasCoordinates = job.pickupLat && job.pickupLng && job.dropoffLat && job.dropoffLng;
  const initialRegion = hasCoordinates
    ? {
        latitude: (job.pickupLat! + job.dropoffLat!) / 2,
        longitude: (job.pickupLng! + job.dropoffLng!) / 2,
        latitudeDelta: Math.abs(job.pickupLat! - job.dropoffLat!) * 1.5 || 0.1,
        longitudeDelta: Math.abs(job.pickupLng! - job.dropoffLng!) * 1.5 || 0.1,
      }
    : null;

  const handleAcceptOffer = async (paymentMethod: 'DIGITAL' | 'COD') => {
    if (!selectedOfferId) return;
    setIsPaymentModalVisible(false);
    try {
      if (paymentMethod === 'DIGITAL') {
        setIsInitiatingPayment(true);
        // 1. Accept offer on backend (creates escrow transaction in INITIATED state)
        await acceptOffer({ offerId: selectedOfferId, payment_method: 'DIGITAL' });

        // 2. Initiate payment session on Konnect
        const response = await apiClient.post<{ payment_url: string; gateway_ref: string }>('/payments/initiate/', {
          job_id: jobId,
          platform: 'mobile',
        });

        setIsInitiatingPayment(false);

        // 3. Navigate to WebView payment screen
        router.push({
          pathname: '/payment/webview',
          params: { payment_url: response.data.payment_url, job_id: jobId },
        });
      } else {
        // Cash on delivery (COD)
        await acceptOffer({ offerId: selectedOfferId, payment_method: 'COD' });
        Alert.alert('Succès', 'Offre acceptée avec paiement à la livraison. La mission est maintenant en cours.');
        refetchJob();
        refetchOffers();
      }
    } catch (err: any) {
      setIsInitiatingPayment(false);
      Alert.alert('Erreur', err.message || "Impossible d'accepter l'offre.");
    }
  };

  const handleConfirmCompletion = async () => {
    Alert.alert(
      'Confirmer la livraison',
      'Confirmez-vous que les objets ont bien été livrés ? Cela débloquera les fonds en faveur du transporteur.',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Confirmer',
          onPress: async () => {
            try {
              await confirmCompletion({ job_id: jobId });
              Alert.alert('Succès', 'Livraison confirmée. Escrow libéré.');
              refetchJob();
            } catch (err: any) {
              Alert.alert('Erreur', err.message || 'Impossible de valider la livraison.');
            }
          },
        },
      ]
    );
  };

  const handleSubmitOffer = async () => {
    if (!bidPrice || isNaN(Number(bidPrice)) || Number(bidPrice) <= 0) {
      Alert.alert('Erreur', 'Veuillez saisir un prix valide.');
      return;
    }
    try {
      await submitOffer({
        job: jobId,
        total_price: Number(bidPrice),
        message: bidMessage || 'Disponible pour ce transport.',
        valid_until: new Date(Date.now() + 3 * 86400000).toISOString(),
      });
      Alert.alert('Succès', 'Votre offre a été soumise avec succès.');
      setBidPrice('');
      setBidMessage('');
      refetchOffers();
    } catch (err: any) {
      Alert.alert('Erreur', err.message || 'Impossible de soumettre l’offre.');
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background.default }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backIconButton}>
          <Feather name="arrow-left" size={24} color={theme.colors.text.primary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.colors.text.primary }]}>Détails de la mission</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Job Detail Card */}
        <View style={[styles.detailCard, { backgroundColor: theme.colors.background.card, borderColor: theme.colors.border.default }]}>
          <View style={styles.cardHeader}>
            <View style={[styles.typeBadge, { backgroundColor: theme.colors.primary[50] }]}>
              <Text style={[styles.typeText, { color: theme.colors.primary[700] }]}>{job.jobType}</Text>
            </View>
            <View style={[styles.statusBadge, { backgroundColor: theme.colors.neutral[100] }]}>
              <Text style={[styles.statusText, { color: theme.colors.neutral[600] }]}>{job.status}</Text>
            </View>
          </View>

          <Text style={[styles.title, { color: theme.colors.text.primary }]}>{job.formattedPriceRange}</Text>

          <View style={styles.addressRow}>
            <View style={styles.addressDotContainer}>
              <View style={[styles.dot, { backgroundColor: theme.colors.primary[500] }]} />
              <View style={styles.dotLine} />
              <View style={[styles.dot, { backgroundColor: theme.colors.success[500] }]} />
            </View>
            <View style={styles.addressTextContainer}>
              <Text style={[styles.addressText, { color: theme.colors.text.primary }]} numberOfLines={1}>
                {job.pickupAddress}
              </Text>
              <View style={{ height: 24 }} />
              <Text style={[styles.addressText, { color: theme.colors.text.primary }]} numberOfLines={1}>
                {job.dropoffAddress}
              </Text>
            </View>
          </View>

          <View style={styles.metaRow}>
            <Feather name="calendar" size={16} color={theme.colors.text.secondary} />
            <Text style={[styles.metaText, { color: theme.colors.text.secondary }]}>
              Prévu le : {job.scheduledTime.toLocaleDateString('fr-FR')} à {job.scheduledTime.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
            </Text>
          </View>

          {job.description ? (
            <View style={styles.descSection}>
              <Text style={[styles.descTitle, { color: theme.colors.text.primary }]}>Description</Text>
              <Text style={[styles.descText, { color: theme.colors.text.secondary }]}>{job.description}</Text>
            </View>
          ) : null}
        </View>

        {/* Map View */}
        {hasCoordinates && initialRegion ? (
          <View style={styles.mapContainer}>
            <MapViewWrapper
              pickupLat={job.pickupLat!}
              pickupLng={job.pickupLng!}
              dropoffLat={job.dropoffLat!}
              dropoffLng={job.dropoffLng!}
              initialRegion={initialRegion}
              pickupColor={theme.colors.primary[500]}
              dropoffColor={theme.colors.success[500]}
            />
          </View>
        ) : null}

        {/* Client (Owner) view of received offers */}
        {isClient && job.status === 'PUBLISHED' && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: theme.colors.text.primary }]}>Offres reçues ({offers?.length || 0})</Text>
            {isOffersLoading ? (
              <ActivityIndicator color={theme.colors.primary[500]} style={{ marginTop: 12 }} />
            ) : offers && offers.length > 0 ? (
              offers.map((offer) => (
                <View key={offer.id} style={[styles.offerCard, { backgroundColor: theme.colors.background.card, borderColor: theme.colors.border.default }]}>
                  <View style={styles.offerHeader}>
                    <Text style={[styles.transporterName, { color: theme.colors.text.primary }]}>{offer.transporter.name}</Text>
                    <Text style={[styles.offerPrice, { color: theme.colors.primary[500] }]}>{offer.total_price} TND</Text>
                  </View>

                  {offer.trust_badge && (
                    <Text style={[styles.trustText, { color: theme.colors.text.secondary }]}>
                      ⭐ Trust Score: {offer.trust_badge.trust_score}% | {offer.trust_badge.total_jobs_completed} courses
                    </Text>
                  )}

                  <Text style={[styles.offerMessage, { color: theme.colors.text.secondary }]}>{offer.message}</Text>

                  <TouchableOpacity
                    style={[styles.acceptButton, { backgroundColor: theme.colors.primary[500] }]}
                    onPress={() => {
                      setSelectedOfferId(offer.id);
                      setIsPaymentModalVisible(true);
                    }}
                  >
                    <Text style={styles.acceptButtonText}>Accepter l'offre</Text>
                  </TouchableOpacity>
                </View>
              ))
            ) : (
              <Text style={[styles.emptyText, { color: theme.colors.text.secondary }]}>Aucune offre reçue pour le moment.</Text>
            )}
          </View>
        )}

        {/* Client (Owner) view when IN_PROGRESS */}
        {isClient && job.status === 'IN_PROGRESS' && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: theme.colors.text.primary }]}>Mission en cours</Text>
            <View style={styles.actionRow}>
              <TouchableOpacity
                style={[styles.chatButton, { backgroundColor: theme.colors.primary[500] }]}
                onPress={() => router.push(`/chat/${jobId}`)}
              >
                <Feather name="message-circle" size={18} color="#FFF" style={{ marginRight: 8 }} />
                <Text style={styles.actionButtonText}>Ouvrir la discussion</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.completeButton, { backgroundColor: theme.colors.success[500] }]}
                onPress={handleConfirmCompletion}
                disabled={isCompleting}
              >
                <Feather name="check-circle" size={18} color="#FFF" style={{ marginRight: 8 }} />
                <Text style={styles.actionButtonText}>Valider la livraison</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Transporter layout: submit a bid */}
        {!isClient && job.status === 'PUBLISHED' && (
          <View style={styles.section}>
            {myOffer ? (
              <View style={[styles.myOfferCard, { backgroundColor: theme.colors.primary[50], borderColor: theme.colors.primary[100] }]}>
                <Text style={[styles.myOfferTitle, { color: theme.colors.primary[700] }]}>Votre offre a été soumise</Text>
                <Text style={[styles.myOfferPrice, { color: theme.colors.text.primary }]}>Montant : {myOffer.total_price} TND</Text>
                <Text style={[styles.myOfferMessage, { color: theme.colors.text.secondary }]}>Message : {myOffer.message}</Text>
                <View style={styles.statusRow}>
                  <Feather name="clock" size={14} color={theme.colors.neutral[600]} />
                  <Text style={[styles.statusLabel, { color: theme.colors.neutral[600] }]}>Statut : {myOffer.status}</Text>
                </View>
              </View>
            ) : (
              <View style={[styles.bidForm, { backgroundColor: theme.colors.background.card, borderColor: theme.colors.border.default }]}>
                <Text style={[styles.formTitle, { color: theme.colors.text.primary }]}>Proposer vos services</Text>

                <View style={styles.formGroup}>
                  <Text style={styles.formLabel}>Prix total (TND)</Text>
                  <TextInput
                    style={styles.formInput}
                    value={bidPrice}
                    onChangeText={setBidPrice}
                    placeholder="Ex: 150"
                    keyboardType="numeric"
                  />
                </View>

                <View style={styles.formGroup}>
                  <Text style={styles.formLabel}>Message au client</Text>
                  <TextInput
                    style={[styles.formInput, styles.formTextArea]}
                    value={bidMessage}
                    onChangeText={setBidMessage}
                    placeholder="Ex: Disponible samedi, j'ai des couvertures de protection."
                    multiline
                    numberOfLines={3}
                  />
                </View>

                <TouchableOpacity
                  style={[styles.submitBidButton, { backgroundColor: theme.colors.primary[500] }]}
                  onPress={handleSubmitOffer}
                  disabled={isSubmittingOffer}
                >
                  {isSubmittingOffer ? <ActivityIndicator color="#FFF" /> : <Text style={styles.submitBidText}>Soumettre l'offre</Text>}
                </TouchableOpacity>
              </View>
            )}
          </View>
        )}

        {/* Transporter view when IN_PROGRESS */}
        {!isClient && job.status === 'IN_PROGRESS' && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: theme.colors.text.primary }]}>Mission acceptée</Text>
            <View style={styles.actionRow}>
              <TouchableOpacity
                style={[styles.chatButton, { backgroundColor: theme.colors.primary[500] }]}
                onPress={() => router.push(`/chat/${jobId}`)}
              >
                <Feather name="message-circle" size={18} color="#FFF" style={{ marginRight: 8 }} />
                <Text style={styles.actionButtonText}>Ouvrir la discussion</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Signal a problem button for active/completed jobs */}
        {(job.status === 'IN_PROGRESS' || job.status === 'COMPLETED') && (
          <View style={[styles.section, { marginTop: 10 }]}>
            <TouchableOpacity
              style={[styles.disputeButton, { borderColor: theme.colors.error[500] }]}
              onPress={() => router.push(`/disputes/create?jobId=${jobId}`)}
            >
              <Feather name="alert-triangle" size={16} color={theme.colors.error[700]} />
              <Text style={[styles.disputeButtonText, { color: theme.colors.error[700] }]}>
                Signaler un problème (Litige)
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>

      {/* Payment Selection Modal */}
      <Modal visible={isPaymentModalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.colors.background.card }]}>
            <Text style={[styles.modalTitle, { color: theme.colors.text.primary }]}>Sélectionner le mode de paiement</Text>
            <Text style={[styles.modalDesc, { color: theme.colors.text.secondary }]}>
              Choisissez comment régler le transporteur pour cette mission.
            </Text>

            <TouchableOpacity style={styles.paymentOption} onPress={() => handleAcceptOffer('DIGITAL')}>
              <Feather name="credit-card" size={24} color={theme.colors.primary[500]} />
              <View style={styles.paymentOptionText}>
                <Text style={[styles.paymentOptionTitle, { color: theme.colors.text.primary }]}>Paiement en ligne sécurisé</Text>
                <Text style={[styles.paymentOptionDesc, { color: theme.colors.text.secondary }]}>
                  Les fonds sont conservés en séquestre et libérés après livraison.
                </Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity style={styles.paymentOption} onPress={() => handleAcceptOffer('COD')}>
              <Feather name="dollar-sign" size={24} color={theme.colors.success[500]} />
              <View style={styles.paymentOptionText}>
                <Text style={[styles.paymentOptionTitle, { color: theme.colors.text.primary }]}>Paiement à la livraison (COD)</Text>
                <Text style={[styles.paymentOptionDesc, { color: theme.colors.text.secondary }]}>
                  Régler en espèces directement au transporteur lors du dépôt.
                </Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity style={[styles.closeModalButton, { borderColor: theme.colors.border.default }]} onPress={() => setIsPaymentModalVisible(false)}>
              <Text style={[styles.closeModalText, { color: theme.colors.text.primary }]}>Annuler</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Initiating Payment Overlay */}
      {isInitiatingPayment && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color="#FFF" />
          <Text style={styles.loadingOverlayText}>Initiation du paiement sécurisé...</Text>
        </View>
      )}
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
  scrollContent: {
    padding: 16,
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
  detailCard: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  typeBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  typeText: {
    fontSize: 11,
    fontWeight: 'bold',
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  statusText: {
    fontSize: 11,
    fontWeight: 'bold',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  addressRow: {
    flexDirection: 'row',
    marginBottom: 20,
  },
  addressDotContainer: {
    alignItems: 'center',
    width: 16,
    marginRight: 12,
    paddingVertical: 4,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  dotLine: {
    width: 2,
    height: 32,
    backgroundColor: '#E8EAED',
    marginVertical: 4,
  },
  addressTextContainer: {
    flex: 1,
  },
  addressText: {
    fontSize: 14,
    fontWeight: '500',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 8,
  },
  metaText: {
    fontSize: 13,
  },
  descSection: {
    borderTopWidth: 1,
    borderTopColor: '#F1F3F4',
    paddingTop: 16,
    marginTop: 10,
  },
  descTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 6,
  },
  descText: {
    fontSize: 13,
    lineHeight: 18,
  },
  mapContainer: {
    height: 200,
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 24,
  },
  map: {
    flex: 1,
  },
  section: {
    marginBottom: 30,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  emptyText: {
    fontSize: 14,
    textAlign: 'center',
    marginTop: 10,
  },
  offerCard: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  offerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  transporterName: {
    fontSize: 15,
    fontWeight: 'bold',
  },
  offerPrice: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  trustText: {
    fontSize: 12,
    marginBottom: 8,
  },
  offerMessage: {
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 16,
  },
  acceptButton: {
    height: 40,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  acceptButtonText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: 'bold',
  },
  actionRow: {
    flexDirection: 'row',
    gap: 12,
  },
  chatButton: {
    flex: 1,
    height: 46,
    borderRadius: 8,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  completeButton: {
    flex: 1,
    height: 46,
    borderRadius: 8,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionButtonText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: 'bold',
  },
  myOfferCard: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
  },
  myOfferTitle: {
    fontSize: 15,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  myOfferPrice: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 6,
  },
  myOfferMessage: {
    fontSize: 13,
    marginBottom: 12,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statusLabel: {
    fontSize: 12,
  },
  bidForm: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
  },
  formTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  formGroup: {
    marginBottom: 16,
  },
  formLabel: {
    fontSize: 13,
    fontWeight: '500',
    marginBottom: 6,
  },
  formInput: {
    height: 48,
    borderWidth: 1,
    borderColor: '#E8EAED',
    borderRadius: 8,
    paddingHorizontal: 12,
    fontSize: 14,
  },
  formTextArea: {
    height: 80,
    textAlignVertical: 'top',
    paddingTop: 12,
  },
  submitBidButton: {
    height: 48,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
  },
  submitBidText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: 'bold',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 24,
    paddingBottom: 40,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  modalDesc: {
    fontSize: 13,
    marginBottom: 24,
    lineHeight: 18,
  },
  paymentOption: {
    flexDirection: 'row',
    borderWidth: 1,
    borderColor: '#E8EAED',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    alignItems: 'center',
  },
  paymentOptionText: {
    marginLeft: 16,
    flex: 1,
  },
  paymentOptionTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  paymentOptionDesc: {
    fontSize: 11,
    lineHeight: 15,
  },
  closeModalButton: {
    height: 48,
    borderRadius: 12,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
  },
  closeModalText: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 999,
  },
  loadingOverlayText: {
    color: '#FFF',
    marginTop: 16,
    fontSize: 14,
    fontWeight: 'bold',
  },
  disputeButton: {
    height: 48,
    borderWidth: 1,
    borderRadius: 8,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  disputeButtonText: {
    fontSize: 14,
    fontWeight: 'bold',
  },
});
