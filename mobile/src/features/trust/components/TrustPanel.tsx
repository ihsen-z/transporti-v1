import { useEffect, useState } from 'react';
import { ActivityIndicator, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { TextField } from '@/shared/ui/TextField';
import { Button } from '@/shared/ui/Button';
import { colors, spacing, fontSize, radii } from '@/shared/theme';
import type { DocumentDto, VehicleSubmitBody, VerificationStatus } from '../api/dto';
import { useTrustStatus } from '../api/useTrustStatus';
import { useSubmitVehicle } from '../api/useSubmitVehicle';
import { useTrustDocuments } from '../api/useTrustDocuments';
import { DocumentRow } from './DocumentRow';
import { AddDocumentSheet } from './AddDocumentSheet';

const STATUS_COLOR: Record<VerificationStatus, string> = {
  UNVERIFIED: colors.neutral[400],
  PENDING: colors.warning,
  PARTIALLY_REVIEWED: colors.brand[500],
  VERIFIED: colors.green[600],
  REJECTED: colors.error,
  SUSPENDED: colors.error,
};

interface Props {
  visible: boolean;
  onClose: () => void;
}

export function TrustPanel({ visible, onClose }: Props) {
  const { t } = useTranslation();
  const status = useTrustStatus(visible);
  const documents = useTrustDocuments(visible);
  const submit = useSubmitVehicle();
  const [addOpen, setAddOpen] = useState(false);
  const [vtype, setVtype] = useState('');
  const [cap, setCap] = useState('');
  const [plate, setPlate] = useState('');

  // Pré-remplit le formulaire véhicule depuis le statut chargé.
  useEffect(() => {
    if (status.data) {
      setVtype(status.data.vehicle_type ?? '');
      setCap(status.data.vehicle_capacity_kg ?? '');
      setPlate(status.data.vehicle_plate ?? '');
    }
  }, [status.data]);

  const onSave = () => {
    const body: VehicleSubmitBody = {};
    if (vtype.trim()) body.vehicle_type = vtype.trim();
    if (cap.trim()) body.vehicle_capacity_kg = cap.trim();
    if (plate.trim()) body.vehicle_plate = plate.trim();
    submit.mutate(body);
  };

  const currentStatus: VerificationStatus =
    status.data?.verification_status ?? 'UNVERIFIED';
  const docs = documents.data ?? [];

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <SafeAreaView style={styles.modal} edges={['top', 'bottom']}>
        <View style={styles.header}>
          <Text style={styles.title}>{t('trust.title')}</Text>
          <Pressable onPress={onClose} accessibilityRole="button">
            <Ionicons name="close" size={26} color={colors.neutral[700]} />
          </Pressable>
        </View>

        {status.isLoading ? (
          <ActivityIndicator style={styles.loader} color={colors.brand[500]} />
        ) : (
          <ScrollView contentContainerStyle={styles.content}>
            {/* Statut */}
            <View style={styles.statusRow}>
              <Text style={styles.label}>{t('trust.status_label')}</Text>
              <View style={[styles.badge, { backgroundColor: STATUS_COLOR[currentStatus] }]}>
                <Text style={styles.badgeText}>{t(`trust.status.${currentStatus}`)}</Text>
              </View>
            </View>

            {/* Véhicule */}
            <Text style={styles.section}>{t('trust.vehicle_title')}</Text>
            <TextField
              label={t('trust.vehicle_type')}
              placeholder={t('trust.vehicle_type_ph')}
              value={vtype}
              onChangeText={setVtype}
              autoCapitalize="sentences"
            />
            <TextField
              label={t('trust.vehicle_capacity')}
              placeholder={t('trust.vehicle_capacity_ph')}
              value={cap}
              onChangeText={setCap}
              keyboardType="numeric"
            />
            <TextField
              label={t('trust.vehicle_plate')}
              placeholder={t('trust.vehicle_plate_ph')}
              value={plate}
              onChangeText={setPlate}
              autoCapitalize="characters"
            />
            <Button
              label={t('trust.vehicle_save')}
              onPress={onSave}
              variant="primary"
              loading={submit.isPending}
            />
            {submit.isSuccess ? <Text style={styles.saved}>{t('trust.vehicle_saved')}</Text> : null}

            {/* Documents */}
            <Text style={styles.section}>{t('trust.docs_title')}</Text>
            {documents.isLoading ? (
              <ActivityIndicator color={colors.brand[500]} />
            ) : docs.length === 0 ? (
              <Text style={styles.empty}>{t('trust.docs_empty')}</Text>
            ) : (
              docs.map((d: DocumentDto) => <DocumentRow key={d.id} doc={d} />)
            )}
            <Button
              label={t('trust.add_doc')}
              onPress={() => setAddOpen(true)}
              variant="cta"
            />
          </ScrollView>
        )}

        <AddDocumentSheet visible={addOpen} onClose={() => setAddOpen(false)} />
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modal: { flex: 1, backgroundColor: colors.neutral[0] },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.xl,
  },
  title: { fontSize: fontSize['2xl'], fontWeight: '800', color: colors.neutral[900] },
  loader: { marginTop: spacing['2xl'] },
  content: { paddingHorizontal: spacing.xl, paddingBottom: spacing.xl, gap: spacing.md },
  statusRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  label: { fontSize: fontSize.md, fontWeight: '600', color: colors.neutral[700] },
  badge: { paddingVertical: 4, paddingHorizontal: spacing.md, borderRadius: radii.full },
  badgeText: { color: colors.neutral[0], fontSize: fontSize.sm, fontWeight: '800' },
  section: {
    fontSize: fontSize.lg,
    fontWeight: '800',
    color: colors.brand[600],
    marginTop: spacing.lg,
  },
  saved: { color: colors.green[700], fontSize: fontSize.sm, fontWeight: '700' },
  empty: { fontSize: fontSize.md, color: colors.neutral[500] },
});
