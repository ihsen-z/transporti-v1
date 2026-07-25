import { useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useTranslation } from 'react-i18next';
import { Select } from '@/shared/ui/Select';
import { TextField } from '@/shared/ui/TextField';
import { Button } from '@/shared/ui/Button';
import { colors, spacing, fontSize, radii } from '@/shared/theme';
import { DOCUMENT_TYPES, isExpiringType, type DocumentType } from '../data/documentTypes';
import { useUploadDocument } from '../api/useUploadDocument';

interface PickedImage {
  uri: string;
  fileName: string;
  mimeType: string;
}

interface Props {
  visible: boolean;
  onClose: () => void;
}

export function AddDocumentSheet({ visible, onClose }: Props) {
  const { t } = useTranslation();
  const upload = useUploadDocument();
  const [docType, setDocType] = useState<DocumentType | null>(null);
  const [image, setImage] = useState<PickedImage | null>(null);
  const [expiresAt, setExpiresAt] = useState('');
  const [formError, setFormError] = useState<string | null>(null);

  const typeOptions = DOCUMENT_TYPES.map((d) => ({
    value: d.code,
    label: t(`trust.doc.${d.code}`),
  }));

  const pickImage = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      setFormError(t('trust.errors.permission'));
      return;
    }
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.7,
    });
    if (res.canceled) return;
    const asset = res.assets?.[0];
    if (!asset) return;
    const uri = asset.uri;
    setImage({
      uri,
      fileName: asset.fileName ?? uri.split('/').pop() ?? 'document.jpg',
      mimeType: asset.mimeType ?? 'image/jpeg',
    });
    setFormError(null);
  };

  const submit = () => {
    if (!docType) return setFormError(t('trust.errors.type_required'));
    if (!image) return setFormError(t('trust.errors.image_required'));
    if (isExpiringType(docType) && !/^\d{4}-\d{2}-\d{2}$/.test(expiresAt)) {
      return setFormError(t('trust.errors.expires_required'));
    }
    setFormError(null);
    upload.mutate({
      document_type: docType,
      uri: image.uri,
      fileName: image.fileName,
      mimeType: image.mimeType,
      expires_at: isExpiringType(docType) ? expiresAt : undefined,
    });
  };

  const close = () => {
    setDocType(null);
    setImage(null);
    setExpiresAt('');
    setFormError(null);
    upload.reset();
    onClose();
  };

  const serverError = upload.error
    ? upload.error.detail ?? t(`trust.errors.${upload.error.kind === 'network' ? 'network' : 'validation'}`)
    : null;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={close}>
      <Pressable style={styles.backdrop} onPress={close}>
        <Pressable style={styles.sheet} onPress={() => undefined}>
          {upload.isSuccess ? (
            <View style={styles.successBox}>
              <Text style={styles.successText}>{t('trust.uploaded')}</Text>
              <Button label={t('common.close')} onPress={close} variant="primary" />
            </View>
          ) : (
            <>
              <Text style={styles.title}>{t('trust.add_doc')}</Text>
              <Select
                label={t('trust.doc_type')}
                placeholder={t('trust.doc_type_ph')}
                value={docType}
                options={typeOptions}
                onChange={setDocType}
              />
              {docType && isExpiringType(docType) ? (
                <TextField
                  label={t('trust.expires_at')}
                  placeholder={t('trust.expires_ph')}
                  value={expiresAt}
                  onChangeText={setExpiresAt}
                />
              ) : null}
              <Button
                label={image ? t('trust.image_selected') : t('trust.pick_image')}
                onPress={pickImage}
                variant="primary"
              />
              {formError ? <Text style={styles.error}>{formError}</Text> : null}
              {serverError ? <Text style={styles.error}>{serverError}</Text> : null}
              <Button
                label={t('trust.upload')}
                onPress={submit}
                variant="cta"
                loading={upload.isPending}
              />
            </>
          )}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: colors.neutral[0],
    borderTopLeftRadius: radii['2xl'],
    borderTopRightRadius: radii['2xl'],
    padding: spacing.xl,
    gap: spacing.lg,
  },
  title: { fontSize: fontSize.xl, fontWeight: '800', color: colors.neutral[900] },
  error: { color: colors.error, fontSize: fontSize.sm, fontWeight: '600' },
  successBox: { gap: spacing.lg, paddingVertical: spacing.lg },
  successText: { fontSize: fontSize.md, fontWeight: '800', color: colors.green[700], textAlign: 'center' },
});
