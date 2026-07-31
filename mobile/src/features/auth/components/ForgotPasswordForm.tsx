import { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useTranslation } from 'react-i18next';
import { TextField } from '@/shared/ui/TextField';
import { Button } from '@/shared/ui/Button';
import { colors, spacing, fontSize } from '@/shared/theme';
import { usePasswordReset } from '../api/usePasswordReset';

const schema = z.object({
  email: z
    .string()
    .min(1, 'auth.errors.email_required')
    .email('auth.errors.email_invalid'),
});

type FormValues = z.infer<typeof schema>;

export function ForgotPasswordForm() {
  const { t } = useTranslation();
  const reset = usePasswordReset();

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { email: '' },
  });

  const onSubmit = handleSubmit((values) => reset.mutate(values));

  const serverError = useMemo(() => {
    if (!reset.error) return null;
    return t('auth.errors.network');
  }, [reset.error, t]);

  // Succès : le serveur renvoie toujours 200 (anti-énumération). On affiche un
  // message localisé confirmant l'envoi, à la place du formulaire.
  if (reset.isSuccess) {
    return (
      <View style={styles.form}>
        <Text style={styles.sent}>{t('auth.forgot.sent')}</Text>
      </View>
    );
  }

  return (
    <View style={styles.form}>
      <Controller
        control={control}
        name="email"
        render={({ field: { value, onChange, onBlur } }) => (
          <TextField
            label={t('auth.fields.email')}
            placeholder={t('auth.fields.email_placeholder')}
            value={value}
            onChangeText={onChange}
            onBlur={onBlur}
            error={errors.email ? t(errors.email.message ?? '') : undefined}
            keyboardType="email-address"
            autoComplete="email"
          />
        )}
      />

      {serverError ? <Text style={styles.serverError}>{serverError}</Text> : null}

      <Button
        label={reset.isPending ? t('auth.forgot.submitting') : t('auth.forgot.submit')}
        onPress={onSubmit}
        variant="cta"
        loading={reset.isPending}
        style={styles.submit}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  form: { gap: spacing.lg },
  sent: { fontSize: fontSize.md, color: colors.green[700], fontWeight: '600', lineHeight: 22 },
  serverError: { color: colors.error, fontSize: fontSize.sm, fontWeight: '600' },
  submit: { marginTop: spacing.sm },
});
