import React, { useState } from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, ScrollView, ActivityIndicator, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { useTheme } from '../../src/core/theme/ThemeProvider';
import { imageService } from '../../src/core/media/imageService';
import { useUploadQueueStore, UploadTask } from '../../src/core/media/uploadQueue';

interface DocumentTypeItem {
  key: string;
  label: string;
  description: string;
}

export default function DocumentUploadScreen() {
  const { theme } = useTheme();
  const router = useRouter();
  const { tasks, addTask, startUploads } = useUploadQueueStore();
  const [isProcessing, setIsProcessing] = useState(false);

  const documentTypes: DocumentTypeItem[] = [
    {
      key: 'CIN_FRONT',
      label: 'ID National (Face)',
      description: 'Copie lisible du recto de votre carte d’identité.',
    },
    {
      key: 'CIN_BACK',
      label: 'ID National (Dos)',
      description: 'Copie lisible du verso de votre carte d’identité.',
    },
    {
      key: 'CARTE_GRISE',
      label: 'Carte Grise',
      description: 'Certificat d’immatriculation du véhicule à utiliser.',
    },
    {
      key: 'INSURANCE',
      label: 'Attestation d’Assurance',
      description: 'Justificatif d’assurance valide pour le transport.',
    },
  ];

  const handleSelectSource = (docType: string) => {
    Alert.alert(
      'Ajouter un document',
      'Choisissez la source du document :',
      [
        {
          text: 'Prendre une photo (Appareil)',
          onPress: () => handleAddDocument(docType, 'camera'),
        },
        {
          text: 'Choisir depuis la galerie',
          onPress: () => handleAddDocument(docType, 'gallery'),
        },
        {
          text: 'Annuler',
          style: 'cancel',
        },
      ]
    );
  };

  const handleAddDocument = async (docType: string, source: 'camera' | 'gallery') => {
    setIsProcessing(true);
    try {
      const uri = source === 'camera' 
        ? await imageService.capturePhoto() 
        : await imageService.pickImage();
      
      if (uri) {
        addTask(uri, docType);
      }
    } catch (err: any) {
      Alert.alert('Erreur', err.message || 'Impossible de charger l’image.');
    } finally {
      setIsProcessing(false);
    }
  };

  const getTaskStatus = (docType: string): UploadTask | undefined => {
    // Find the latest task for this document type
    const matchingTasks = tasks.filter((t) => t.documentType === docType);
    if (matchingTasks.length === 0) return undefined;
    return matchingTasks[matchingTasks.length - 1];
  };

  const renderStatusBadge = (task?: UploadTask) => {
    if (!task) {
      return (
        <View style={[styles.badge, { backgroundColor: theme.colors.neutral[100] }]}>
          <Feather name="circle" size={14} color={theme.colors.text.secondary} />
          <Text style={[styles.badgeText, { color: theme.colors.text.secondary }]}>Non fourni</Text>
        </View>
      );
    }

    switch (task.status) {
      case 'completed':
        return (
          <View style={[styles.badge, { backgroundColor: theme.colors.success[50] || '#E6F7ED' }]}>
            <Feather name="check" size={14} color={theme.colors.success[500]} />
            <Text style={[styles.badgeText, { color: theme.colors.success[700] || theme.colors.success[500] }]}>Téléversé</Text>
          </View>
        );
      case 'uploading':
        return (
          <View style={[styles.badge, { backgroundColor: theme.colors.primary[50] || '#E8F4FD' }]}>
            <ActivityIndicator size="small" color={theme.colors.primary[500]} style={{ marginRight: 4 }} />
            <Text style={[styles.badgeText, { color: theme.colors.primary[700] || theme.colors.primary[500] }]}>Envoi...</Text>
          </View>
        );
      case 'failed':
        return (
          <View style={[styles.badge, { backgroundColor: theme.colors.error[50] || '#FDECEE' }]}>
            <Feather name="alert-triangle" size={14} color={theme.colors.error[500]} />
            <Text style={[styles.badgeText, { color: theme.colors.error[700] || theme.colors.error[500] }]}>Échec</Text>
          </View>
        );
      case 'queued':
      default:
        return (
          <View style={[styles.badge, { backgroundColor: theme.colors.warning[50] || '#FFF8E1' }]}>
            <Feather name="clock" size={14} color={theme.colors.warning[500]} />
            <Text style={[styles.badgeText, { color: theme.colors.warning[700] || theme.colors.warning[500] }]}>En attente</Text>
          </View>
        );
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background.default }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Feather name="arrow-left" size={24} color={theme.colors.text.primary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.colors.text.primary }]}>Documents Justificatifs</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Text style={[styles.instructions, { color: theme.colors.text.secondary }]}>
          Pour être vérifié en tant que transporteur officiel, vous devez téléverser les documents valides ci-dessous. Les fichiers sont traités de manière sécurisée en arrière-plan.
        </Text>

        {isProcessing && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="small" color={theme.colors.primary[500]} />
            <Text style={[styles.loadingText, { color: theme.colors.text.secondary }]}>Traitement de l'image...</Text>
          </View>
        )}

        <View style={styles.listContainer}>
          {documentTypes.map((item) => {
            const task = getTaskStatus(item.key);
            return (
              <View 
                key={item.key} 
                style={[
                  styles.card, 
                  { 
                    backgroundColor: theme.colors.background.card, 
                    borderColor: theme.colors.border.default 
                  }
                ]}
              >
                <View style={styles.cardHeader}>
                  <Text style={[styles.cardLabel, { color: theme.colors.text.primary }]}>{item.label}</Text>
                  {renderStatusBadge(task)}
                </View>
                
                <Text style={[styles.cardDescription, { color: theme.colors.text.secondary }]}>
                  {item.description}
                </Text>

                {task?.error && (
                  <Text style={[styles.errorDetails, { color: theme.colors.error[500] }]}>
                    Erreur: {task.error}
                  </Text>
                )}

                <TouchableOpacity 
                  style={[
                    styles.uploadButton, 
                    { 
                      backgroundColor: task?.status === 'completed' 
                        ? theme.colors.neutral[50] 
                        : theme.colors.primary[500] 
                    }
                  ]}
                  onPress={() => handleSelectSource(item.key)}
                >
                  <Feather 
                    name={task?.status === 'completed' ? 'refresh-cw' : 'upload-cloud'} 
                    size={16} 
                    color={task?.status === 'completed' ? theme.colors.text.primary : '#FFF'} 
                  />
                  <Text 
                    style={[
                      styles.uploadButtonText, 
                      { 
                        color: task?.status === 'completed' ? theme.colors.text.primary : '#FFF' 
                      }
                    ]}
                  >
                    {task?.status === 'completed' ? 'Remplacer le document' : 'Sélectionner le fichier'}
                  </Text>
                </TouchableOpacity>
              </View>
            );
          })}
        </View>

        {tasks.some((t) => t.status === 'failed') && (
          <TouchableOpacity 
            style={[styles.retryAllButton, { backgroundColor: theme.colors.warning[500] }]}
            onPress={startUploads}
          >
            <Feather name="refresh-cw" size={18} color="#FFF" style={{ marginRight: 8 }} />
            <Text style={styles.retryAllText}>Réessayer tous les téléversements en échec</Text>
          </TouchableOpacity>
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
  scrollContent: {
    padding: 16,
  },
  instructions: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 20,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    backgroundColor: '#F1F3F4',
    borderRadius: 8,
    marginBottom: 16,
    gap: 8,
  },
  loadingText: {
    fontSize: 13,
  },
  listContainer: {
    gap: 16,
    marginBottom: 24,
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
  cardLabel: {
    fontSize: 15,
    fontWeight: 'bold',
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    gap: 4,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: 'bold',
  },
  cardDescription: {
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 16,
  },
  errorDetails: {
    fontSize: 12,
    marginBottom: 12,
    fontStyle: 'italic',
  },
  uploadButton: {
    height: 40,
    borderRadius: 8,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  uploadButtonText: {
    fontSize: 13,
    fontWeight: 'bold',
  },
  retryAllButton: {
    height: 48,
    borderRadius: 8,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 40,
  },
  retryAllText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: 'bold',
  },
});
