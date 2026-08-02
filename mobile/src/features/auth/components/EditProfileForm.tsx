import { useEffect, useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useTranslation } from 'react-i18next';
import { TextField } from '@/shared/ui/TextField';
import { Button } from '@/shared/ui/Button';
import { colors, spacing, fontSize } from '@/shared/theme';
import { showToast } from '@/shared/ui/toastStore';
import { useAuthStore } from '@/core/auth/authStore';
import { useUpdateProfile } from '../api/useUpdateProfile';

// Messages = clés i18n (traduites au rendu).
const schema = z.object({
  first_name: z.string().min(1, 'auth.errors.first_name_required'),
  last_name: z.string().min(1, 'auth.errors.last_name_required'),
  phone: z.string().min(1, 'auth.errors.phone_required'),
});

type FormValues = z.infer<typeof schema>;

interface Props {
  onDone: () => void;
}

// Formulaire d'édition du profil. Pré-rempli depuis le store ; sur succès, le
// store est mis à jour (dans le hook) et le panneau se ferme (onDone).
export function EditProfileForm({ onDone }: Props) {
  const { t } = useTranslation();
  const user = useAuthStore((s) => s.user);
  const update = useUpdateProfile();

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      first_name: user?.firstName ?? '',
      last_name: user?.lastName ?? '',
      phone: user?.phone ?? '',
    },
  });

  useEffect(() => {
    if (update.isSuccess) {
      showToast(t('common.saved'));
      onDone();
    }
  }, [update.isSuccess, onDone, t]);

  const onSubmit = handleSubmit((values) => update.mutate(values));

  const serverError = useMemo(() => {
    if (!update.error) return null;
    return t(update.error.kind === 'network' ? 'auth.errors.network' : 'auth.errors.validation');
  }, [update.error, t]);

  const err = (name: keyof FormValues) =>
    errors[name] ? t(errors[name]?.message ?? '') : undefined;

  return (
    <View style={styles.form}>
      <Controller
        control={control}
        name="first_name"
        render={({ field: { value, onChange, onBlur } }) => (
          <TextField
            label={t('auth.fields.first_name')}
            placeholder={t('auth.fields.first_name_placeholder')}
            value={value}
            onChangeText={onChange}
            onBlur={onBlur}
            error={err('first_name')}
          />
        )}
      />
      <Controller
        control={control}
        name="last_name"
        render={({ field: { value, onChange, onBlur } }) => (
          <TextField
            label={t('auth.fields.last_name')}
            placeholder={t('auth.fields.last_name_placeholder')}
            value={value}
            onChangeText={onChange}
            onBlur={onBlur}
            error={err('last_name')}
          />
        )}
      />
      <Controller
        control={control}
        name="phone"
        render={({ field: { value, onChange, onBlur } }) => (
          <TextField
            label={t('auth.fields.phone')}
            placeholder={t('auth.fields.phone_placeholder')}
            value={value}
            onChangeText={onChange}
            onBlur={onBlur}
            error={err('phone')}
            keyboardType="phone-pad"
            autoComplete="tel"
          />
        )}
      />

      {serverError ? <Text style={styles.serverError}>{serverError}</Text> : null}

      <Button
        label={update.isPending ? t('profile.saving') : t('profile.save')}
        onPress={onSubmit}
        variant="cta"
        loading={update.isPending}
        style={styles.submit}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  form: { gap: spacing.lg },
  serverError: { color: colors.error, fontSize: fontSize.sm, fontWeight: '600' },
  submit: { marginTop: spacing.sm },
});
