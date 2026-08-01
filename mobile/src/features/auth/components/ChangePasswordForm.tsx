import { useEffect, useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useTranslation } from 'react-i18next';
import { TextField } from '@/shared/ui/TextField';
import { Button } from '@/shared/ui/Button';
import { colors, spacing, fontSize } from '@/shared/theme';
import { useChangePassword } from '../api/useChangePassword';

// Messages = clés i18n (traduites au rendu).
const schema = z
  .object({
    current_password: z.string().min(1, 'auth.errors.current_password_required'),
    new_password: z.string().min(8, 'auth.errors.password_min'),
    new_password_confirm: z.string().min(1, 'auth.errors.password_required'),
  })
  .refine((d) => d.new_password === d.new_password_confirm, {
    message: 'auth.errors.password_mismatch',
    path: ['new_password_confirm'],
  });

type FormValues = z.infer<typeof schema>;

interface Props {
  onDone: () => void;
}

// Formulaire de changement de mot de passe. Les tokens restent valides ; sur
// succès, le panneau se ferme (onDone).
export function ChangePasswordForm({ onDone }: Props) {
  const { t } = useTranslation();
  const change = useChangePassword();

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { current_password: '', new_password: '', new_password_confirm: '' },
  });

  useEffect(() => {
    if (change.isSuccess) onDone();
  }, [change.isSuccess, onDone]);

  const onSubmit = handleSubmit((values) =>
    change.mutate({
      current_password: values.current_password,
      new_password: values.new_password,
    }),
  );

  const serverError = useMemo(() => {
    if (!change.error) return null;
    const k = change.error.kind;
    const key =
      k === 'current_wrong'
        ? 'auth.errors.current_password_wrong'
        : k === 'new_weak'
          ? 'auth.errors.new_password_weak'
          : k === 'network'
            ? 'auth.errors.network'
            : 'auth.errors.validation';
    return t(key);
  }, [change.error, t]);

  const err = (name: keyof FormValues) =>
    errors[name] ? t(errors[name]?.message ?? '') : undefined;

  return (
    <View style={styles.form}>
      <Controller
        control={control}
        name="current_password"
        render={({ field: { value, onChange, onBlur } }) => (
          <TextField
            label={t('auth.fields.current_password')}
            placeholder={t('auth.fields.password_placeholder')}
            value={value}
            onChangeText={onChange}
            onBlur={onBlur}
            error={err('current_password')}
            secureTextEntry
            autoComplete="current-password"
          />
        )}
      />
      <Controller
        control={control}
        name="new_password"
        render={({ field: { value, onChange, onBlur } }) => (
          <TextField
            label={t('auth.fields.new_password')}
            placeholder={t('auth.fields.password_placeholder')}
            value={value}
            onChangeText={onChange}
            onBlur={onBlur}
            error={err('new_password')}
            secureTextEntry
            autoComplete="new-password"
          />
        )}
      />
      <Controller
        control={control}
        name="new_password_confirm"
        render={({ field: { value, onChange, onBlur } }) => (
          <TextField
            label={t('auth.fields.new_password_confirm')}
            placeholder={t('auth.fields.password_placeholder')}
            value={value}
            onChangeText={onChange}
            onBlur={onBlur}
            error={err('new_password_confirm')}
            secureTextEntry
            autoComplete="new-password"
          />
        )}
      />

      {serverError ? <Text style={styles.serverError}>{serverError}</Text> : null}

      <Button
        label={
          change.isPending
            ? t('profile.change_password_submitting')
            : t('profile.change_password_submit')
        }
        onPress={onSubmit}
        variant="cta"
        loading={change.isPending}
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
