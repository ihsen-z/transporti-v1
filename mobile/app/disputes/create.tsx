import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, ScrollView, TextInput, ActivityIndicator, Alert, Modal, FlatList } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { useTheme } from '../../src/core/theme/ThemeProvider';
import { useAuthStore } from '../../src/core/auth/authStore';
import { useCreateDispute, useEligibleJobs } from '../../src/features/disputes/api/disputesApi';
import { DISPUTE_REASON_LABELS, DisputeReason } from '../../src/features/disputes/domain/disputeModel';
import { JobModel } from '../../src/features/jobs/domain/jobModel';

export default function CreateDisputeScreen() {
  const { theme, isRTL } = useTheme();
  const router = useRouter();
  const params = useLocalSearchParams();
  const { user } = useAuthStore();
  
  const initialJobId = params.jobId ? Number(params.jobId) : null;
  
  const { data: eligibleJobs, isLoading: isLoadingJobs } = useEligibleJobs(user?.role);
  const createDisputeMutation = useCreateDispute();

  const [selectedJob, setSelectedJob] = useState<JobModel | null>(null);
  const [reason, setReason] = useState<DisputeReason | ''>('');
  const [description, setDescription] = useState('');
  
  // Custom Modals visibility
  const [isJobModalVisible, setIsJobModalVisible] = useState(false);
  const [isReasonModalVisible, setIsReasonModalVisible] = useState(false);

  // Pre-select job if initialJobId is provided
  useEffect(() => {
    if (eligibleJobs && initialJobId) {
      const matchedJob = eligibleJobs.find((j) => j.id === initialJobId);
      if (matchedJob) {
        setSelectedJob(matchedJob);
      }
    }
  }, [eligibleJobs, initialJobId]);

  const descriptionLength = description.trim().length;
  const isDescriptionValid = descriptionLength >= 20;
  const isFormValid = selectedJob && reason && isDescriptionValid;

  const handleSubmit = async () => {
    if (!isFormValid || !selectedJob) return;

    try {
      await createDisputeMutation.mutateAsync({
        job_id: selectedJob.id,
        reason,
        description: description.trim(),
      });
      
      Alert.alert('Succès', 'Votre litige a été ouvert avec succès.', [
        {
          text: 'OK',
          onPress: () => {
            // Go to list screen or back
            router.replace('/disputes');
          },
        },
      ]);
    } catch (err: any) {
      const errorMsg = err.response?.data?.error || err.message || '';
      
      // Translate common backend errors
      if (errorMsg.includes('already has an active dispute')) {
        Alert.alert('Erreur', 'Ce job a déjà un litige actif en cours.');
      } else if (errorMsg.includes('not a participant')) {
        Alert.alert('Erreur', 'Vous ne pouvez signaler que les missions auxquelles vous participez.');
      } else {
        Alert.alert('Erreur', errorMsg || 'Échec de la création du litige.');
      }
    }
  };

  const getJobTypeLabel = (type: string) => {
    switch (type) {
      case 'TRANSPORT':
        return 'Transport';
      case 'MOVING':
        return 'Déménagement';
      case 'DELIVERY':
        return 'Livraison';
      default:
        return type;
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background.default }]}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: theme.colors.border.default }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Feather name={isRTL ? "arrow-right" : "arrow-left"} size={24} color={theme.colors.text.primary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.colors.text.primary }]}>Ouvrir un litige</Text>
        <View style={{ width: 44 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Text style={[styles.instructions, { color: theme.colors.text.secondary }]}>
          Veuillez remplir le formulaire ci-dessous pour signaler un problème. Notre équipe de modération étudiera la situation sous 24 à 48 heures.
        </Text>

        {/* Job Selection */}
        <View style={styles.formGroup}>
          <Text style={[styles.label, { color: theme.colors.text.primary }]}>Mission concernée</Text>
          {isLoadingJobs ? (
            <View style={[styles.selector, styles.selectorDisabled, { borderColor: theme.colors.border.default }]}>
              <ActivityIndicator size="small" color={theme.colors.primary[500]} style={{ marginRight: 8 }} />
              <Text style={{ color: theme.colors.text.secondary }}>Chargement de vos missions...</Text>
            </View>
          ) : eligibleJobs && eligibleJobs.length === 0 ? (
            <View style={[styles.noJobsAlert, { backgroundColor: theme.colors.warning[50], borderColor: theme.colors.warning[500] }]}>
              <Feather name="alert-triangle" size={18} color={theme.colors.warning[700]} />
              <Text style={[styles.noJobsText, { color: theme.colors.warning[700] }]}>
                Aucune mission éligible pour un litige. Seules les missions en cours ou terminées peuvent faire l'objet d'un litige.
              </Text>
            </View>
          ) : (
            <TouchableOpacity
              style={[styles.selector, { borderColor: theme.colors.border.default, backgroundColor: theme.colors.background.card }]}
              onPress={() => setIsJobModalVisible(true)}
            >
              <Text style={{ color: selectedJob ? theme.colors.text.primary : theme.colors.text.disabled }}>
                {selectedJob
                  ? `#${selectedJob.id} · ${getJobTypeLabel(selectedJob.jobType)} · ${selectedJob.pickupAddress.split(',')[0]} → ${selectedJob.dropoffAddress.split(',')[0]}`
                  : 'Sélectionner une mission'}
              </Text>
              <Feather name="chevron-down" size={18} color={theme.colors.neutral[600]} />
            </TouchableOpacity>
          )}

          {/* Job Preview details */}
          {selectedJob && (
            <View style={[styles.jobPreview, { backgroundColor: theme.colors.primary[50] }]}>
              <View style={styles.previewRow}>
                <View style={[styles.previewDot, { backgroundColor: theme.colors.primary[500] }]} />
                <Text style={[styles.previewText, { color: theme.colors.text.primary }]} numberOfLines={1}>
                  {selectedJob.pickupAddress}
                </Text>
              </View>
              <View style={[styles.previewRow, { marginTop: 6 }]}>
                <View style={[styles.previewDot, { backgroundColor: theme.colors.success[500] }]} />
                <Text style={[styles.previewText, { color: theme.colors.text.primary }]} numberOfLines={1}>
                  {selectedJob.dropoffAddress}
                </Text>
              </View>
            </View>
          )}
        </View>

        {/* Reason Selection */}
        <View style={styles.formGroup}>
          <Text style={[styles.label, { color: theme.colors.text.primary }]}>Motif du litige</Text>
          <TouchableOpacity
            style={[styles.selector, { borderColor: theme.colors.border.default, backgroundColor: theme.colors.background.card }]}
            onPress={() => setIsReasonModalVisible(true)}
          >
            <Text style={{ color: reason ? theme.colors.text.primary : theme.colors.text.disabled }}>
              {reason ? DISPUTE_REASON_LABELS[reason] : 'Sélectionner un motif'}
            </Text>
            <Feather name="chevron-down" size={18} color={theme.colors.neutral[600]} />
          </TouchableOpacity>
        </View>

        {/* Description Input */}
        <View style={styles.formGroup}>
          <Text style={[styles.label, { color: theme.colors.text.primary }]}>Description détaillée</Text>
          <TextInput
            style={[
              styles.textArea,
              {
                borderColor: descriptionLength > 0 && !isDescriptionValid ? theme.colors.error[500] : theme.colors.border.default,
                backgroundColor: theme.colors.background.card,
                color: theme.colors.text.primary,
              },
            ]}
            value={description}
            onChangeText={setDescription}
            placeholder="Décrivez précisément le problème rencontré (20 caractères minimum)..."
            placeholderTextColor={theme.colors.text.disabled}
            multiline
            numberOfLines={5}
            textAlignVertical="top"
          />
          <View style={styles.counterRow}>
            <Text
              style={[
                styles.counterText,
                descriptionLength > 0 && !isDescriptionValid ? { color: theme.colors.error[500] } : { color: theme.colors.text.secondary },
              ]}
            >
              {descriptionLength > 0 && !isDescriptionValid
                ? `Minimum 20 caractères (${20 - descriptionLength} restants)`
                : 'Minimum 20 caractères'}
            </Text>
            <Text style={[styles.counterText, { color: theme.colors.text.secondary }]}>
              {descriptionLength}/2000
            </Text>
          </View>
        </View>

        {/* Submit Buttons */}
        <View style={styles.btnRow}>
          <TouchableOpacity
            style={[styles.btn, styles.cancelBtn, { borderColor: theme.colors.border.default }]}
            onPress={() => router.back()}
          >
            <Text style={[styles.btnText, { color: theme.colors.text.primary }]}>Annuler</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.btn,
              styles.submitBtn,
              { backgroundColor: theme.colors.primary[500] },
              !isFormValid && styles.btnDisabled,
            ]}
            onPress={handleSubmit}
            disabled={!isFormValid || createDisputeMutation.isPending}
          >
            {createDisputeMutation.isPending ? (
              <ActivityIndicator color="#FFF" />
            ) : (
              <>
                <Feather name="shield" size={16} color="#FFF" />
                <Text style={[styles.btnText, styles.submitBtnText]}>Ouvrir le litige</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Eligible Jobs Modal */}
      <Modal visible={isJobModalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.colors.background.card }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: theme.colors.text.primary }]}>Sélectionner une mission</Text>
              <TouchableOpacity onPress={() => setIsJobModalVisible(false)} style={styles.closeBtn}>
                <Feather name="x" size={24} color={theme.colors.text.primary} />
              </TouchableOpacity>
            </View>

            <FlatList
              data={eligibleJobs}
              keyExtractor={(item) => item.id.toString()}
              contentContainerStyle={{ paddingBottom: 24 }}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[styles.modalItem, { borderBottomColor: theme.colors.border.default }]}
                  onPress={() => {
                    setSelectedJob(item);
                    setIsJobModalVisible(false);
                  }}
                >
                  <Text style={[styles.modalItemTitle, { color: theme.colors.text.primary }]}>
                    #{item.id} · {getJobTypeLabel(item.jobType)}
                  </Text>
                  <Text style={[styles.modalItemDesc, { color: theme.colors.text.secondary }]}>
                    {item.pickupAddress.split(',')[0]} → {item.dropoffAddress.split(',')[0]}
                  </Text>
                </TouchableOpacity>
              )}
            />
          </View>
        </View>
      </Modal>

      {/* Reasons Modal */}
      <Modal visible={isReasonModalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.colors.background.card }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: theme.colors.text.primary }]}>Sélectionner un motif</Text>
              <TouchableOpacity onPress={() => setIsReasonModalVisible(false)} style={styles.closeBtn}>
                <Feather name="x" size={24} color={theme.colors.text.primary} />
              </TouchableOpacity>
            </View>

            <FlatList
              data={Object.entries(DISPUTE_REASON_LABELS)}
              keyExtractor={([key]) => key}
              contentContainerStyle={{ paddingBottom: 24 }}
              renderItem={({ item }) => {
                const [key, label] = item;
                return (
                  <TouchableOpacity
                    style={[styles.modalItem, { borderBottomColor: theme.colors.border.default }]}
                    onPress={() => {
                      setReason(key as DisputeReason);
                      setIsReasonModalVisible(false);
                    }}
                  >
                    <Text style={[styles.modalItemTitle, { color: theme.colors.text.primary }]}>{label}</Text>
                  </TouchableOpacity>
                );
              }}
            />
          </View>
        </View>
      </Modal>
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
  instructions: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 20,
  },
  formGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  selector: {
    height: 50,
    borderWidth: 1,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
  },
  selectorDisabled: {
    backgroundColor: '#F1F3F4',
    justifyContent: 'flex-start',
  },
  noJobsAlert: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    flexDirection: 'row',
    gap: 8,
  },
  noJobsText: {
    fontSize: 12,
    lineHeight: 18,
    flex: 1,
  },
  jobPreview: {
    marginTop: 8,
    padding: 12,
    borderRadius: 8,
  },
  previewRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  previewDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  previewText: {
    fontSize: 12,
    flex: 1,
  },
  textArea: {
    height: 120,
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    lineHeight: 20,
  },
  counterRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  counterText: {
    fontSize: 11,
  },
  btnRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 20,
    marginBottom: 40,
  },
  btn: {
    flex: 1,
    height: 48,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cancelBtn: {
    borderWidth: 1,
  },
  submitBtn: {
    flexDirection: 'row',
    gap: 8,
  },
  submitBtnText: {
    color: '#FFF',
  },
  btnText: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  btnDisabled: {
    opacity: 0.5,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    maxHeight: '70%',
    paddingTop: 16,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  closeBtn: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalItem: {
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderBottomWidth: 0.5,
  },
  modalItemTitle: {
    fontSize: 14,
    fontWeight: '500',
  },
  modalItemDesc: {
    fontSize: 12,
    marginTop: 2,
  },
});
