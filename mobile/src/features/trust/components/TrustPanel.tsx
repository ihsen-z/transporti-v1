import { useEffect, useState } from 'react';
import { ActivityIndicator, Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { Txt } from '@/shared/ui/Txt';
import { TextField } from '@/shared/ui/TextField';
import { Button } from '@/shared/ui/Button';
import { Badge } from '@/shared/ui/Badge';
import { statusVariant } from '@/shared/ui/statusVariant';
import { colors, spacing, fontSize } from '@/shared/theme';
import type { DocumentDto, VehicleSubmitBody, VerificationStatus } from '../api/dto';
import { useTrustStatus } from '../api/useTrustStatus';
import { useSubmitVehicle } from '../api/useSubmitVehicle';
import { useTrustDocuments } from '../api/useTrustDocuments';
import { DocumentRow } from './DocumentRow';
import { AddDocumentSheet } from './AddDocumentSheet';

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
          <Txt style={styles.title}>{t('trust.title')}</Txt>
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
              <Txt style={styles.label}>{t('trust.status_label')}</Txt>
              <Badge label={t(`trust.status.${currentStatus}`)} variant={statusVariant(currentStatus)} />
            </View>

            {/* Véhicule */}
            <Txt style={styles.section}>{t('trust.vehicle_title')}</Txt>
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
            {submit.isSuccess ? <Txt style={styles.saved}>{t('trust.vehicle_saved')}</Txt> : null}

            {/* Documents */}
            <Txt style={styles.section}>{t('trust.docs_title')}</Txt>
            {documents.isLoading ? (
              <ActivityIndicator color={colors.brand[500]} />
            ) : docs.length === 0 ? (
              <Txt style={styles.empty}>{t('trust.docs_empty')}</Txt>
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
  modal: { flex: 1, backgroundColor: colors.neutral[50] },
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
  section: {
    fontSize: fontSize.lg,
    fontWeight: '800',
    color: colors.brand[600],
    marginTop: spacing.lg,
  },
  saved: { color: colors.green[700], fontSize: fontSize.sm, fontWeight: '700' },
  empty: { fontSize: fontSize.md, color: colors.neutral[500] },
});
