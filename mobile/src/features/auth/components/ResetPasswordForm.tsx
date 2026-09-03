import { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useTranslation } from 'react-i18next';
import { Link } from 'expo-router';
import { TextField } from '@/shared/ui/TextField';
import { Button } from '@/shared/ui/Button';
import { colors, spacing, fontSize } from '@/shared/theme';
import { usePasswordResetConfirm } from '../api/usePasswordResetConfirm';

const schema = z
  .object({
    new_password: z.string().min(8, 'auth.errors.password_min'),
    new_password_confirm: z.string().min(1, 'auth.errors.password_required'),
  })
  .refine((d) => d.new_password === d.new_password_confirm, {
    message: 'auth.errors.password_mismatch',
    path: ['new_password_confirm'],
  });

type FormValues = z.infer<typeof schema>;

interface Props {
  uid: string;
  token: string;
}

// Étape de confirmation du lien de réinitialisation (uid + token, fournis par
// l'e-mail ou le deep link `transporti://reset-password`). Contrairement au
// changement de mot de passe, aucune session n'est ouverte ici.
export function ResetPasswordForm({ uid, token }: Props) {
  const { t } = useTranslation();
  const confirm = usePasswordResetConfirm();

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { new_password: '', new_password_confirm: '' },
  });

  const onSubmit = handleSubmit((values) =>
    confirm.mutate({ uid, token, new_password: values.new_password }),
  );

  const serverError = useMemo(() => {
    if (!confirm.error) return null;
    const key =
      confirm.error.kind === 'weak_password'
        ? 'auth.errors.password_min'
        : confirm.error.kind === 'network'
          ? 'auth.errors.network'
          : 'auth.reset.invalid_link';
    return t(key);
  }, [confirm.error, t]);

  const err = (name: keyof FormValues) =>
    errors[name] ? t(errors[name]?.message ?? '') : undefined;

  if (confirm.isSuccess) {
    return (
      <View style={styles.form}>
        <Text style={styles.sent}>{t('auth.reset.success')}</Text>
        <Link href="/login" style={styles.link}>
          {t('auth.reset.login_link')}
        </Link>
      </View>
    );
  }

  return (
    <View style={styles.form}>
      <Controller
        control={control}
        name="new_password"
        render={({ field: { value, onChange, onBlur } }) => (
          <TextField
            testID="reset-password-new_password"
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
            testID="reset-password-new_password_confirm"
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

      {serverError ? (
        <Text testID="reset-password-server-error" style={styles.serverError}>
          {serverError}
        </Text>
      ) : null}

      <Button
        testID="reset-password-submit"
        label={confirm.isPending ? t('auth.reset.submitting') : t('auth.reset.submit')}
        onPress={onSubmit}
        variant="cta"
        loading={confirm.isPending}
        style={styles.submit}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  form: { gap: spacing.lg },
  sent: { fontSize: fontSize.md, color: colors.text.green, fontWeight: '600', lineHeight: 22 },
  serverError: { color: colors.text.error, fontSize: fontSize.sm, fontWeight: '600' },
  submit: { marginTop: spacing.sm },
  link: { fontSize: fontSize.md, fontWeight: '700', color: colors.brand[600], textAlign: 'center' },
});
