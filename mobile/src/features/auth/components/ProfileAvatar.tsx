import { useMemo } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useTranslation } from 'react-i18next';
import { Avatar } from '@/shared/ui/Avatar';
import { Txt } from '@/shared/ui/Txt';
import { colors, spacing, fontSize } from '@/shared/theme';
import { useAuthStore } from '@/core/auth/authStore';
import { useUploadAvatar } from '../api/useUploadAvatar';

// Avatar de profil éditable : affiche la photo (ou l'initiale) et permet de la
// changer via la galerie -> upload multipart (auth/avatar/).
export function ProfileAvatar() {
  const { t } = useTranslation();
  const user = useAuthStore((s) => s.user);
  const upload = useUploadAvatar();

  const displayName =
    `${user?.firstName ?? ''} ${user?.lastName ?? ''}`.trim() || user?.email || '';

  const onPick = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) return; // permission refusée : on n'ouvre pas la galerie
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    const asset = result.canceled ? null : result.assets[0];
    if (!asset) return;
    upload.mutate({
      uri: asset.uri,
      fileName: asset.fileName ?? 'avatar.jpg',
      mimeType: asset.mimeType ?? 'image/jpeg',
    });
  };

  const errorMsg = useMemo(() => {
    if (!upload.error) return null;
    return upload.error.detail ?? t('auth.errors.network');
  }, [upload.error, t]);

  return (
    <View style={styles.wrap}>
      <Pressable onPress={onPick} accessibilityRole="button" disabled={upload.isPending}>
        <Avatar name={displayName} imageUrl={user?.avatarUrl} size={72} />
        <View style={styles.badge}>
          {upload.isPending ? (
            <ActivityIndicator color={colors.neutral[0]} size="small" />
          ) : (
            <Ionicons name="camera" size={15} color={colors.neutral[0]} />
          )}
        </View>
      </Pressable>
      <Pressable onPress={onPick} accessibilityRole="button" disabled={upload.isPending}>
        <Txt style={styles.link}>{t('profile.change_photo')}</Txt>
      </Pressable>
      {errorMsg ? <Txt style={styles.error}>{errorMsg}</Txt> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', gap: spacing.sm },
  badge: {
    position: 'absolute',
    right: -2,
    bottom: -2,
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: colors.cta[500],
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: colors.neutral[0],
  },
  link: { fontSize: fontSize.sm, fontWeight: '700', color: colors.brand[600] },
  error: { fontSize: fontSize.sm, color: colors.error, textAlign: 'center' },
});
