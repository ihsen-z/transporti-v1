import { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useTranslation } from 'react-i18next';
import { TextField } from '@/shared/ui/TextField';
import { Button } from '@/shared/ui/Button';
import { colors, spacing, fontSize } from '@/shared/theme';
import { useLogin } from '../api/useLogin';

// Les messages sont des CLÉS i18n (traduites au rendu) => schéma statique.
const schema = z.object({
  email: z
    .string()
    .min(1, 'auth.errors.email_required')
    .email('auth.errors.email_invalid'),
  password: z.string().min(1, 'auth.errors.password_required'),
});

type FormValues = z.infer<typeof schema>;

export function LoginForm() {
  const { t } = useTranslation();
  const login = useLogin();

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { email: '', password: '' },
  });

  // Après succès, le changement de statut d'auth déclenche la redirection
  // (routing gate) : pas de navigation manuelle ici.
  const onSubmit = handleSubmit((values) => {
    login.mutate(values);
  });

  // Erreur serveur/réseau normalisée -> message i18n.
  const serverError = useMemo(() => {
    if (!login.error) return null;
    const key =
      login.error.kind === 'invalid_credentials'
        ? 'auth.errors.invalid_credentials'
        : 'auth.errors.network';
    return t(key);
  }, [login.error, t]);

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

      <Controller
        control={control}
        name="password"
        render={({ field: { value, onChange, onBlur } }) => (
          <TextField
            label={t('auth.fields.password')}
            placeholder={t('auth.fields.password_placeholder')}
            value={value}
            onChangeText={onChange}
            onBlur={onBlur}
            error={errors.password ? t(errors.password.message ?? '') : undefined}
            secureTextEntry
            autoComplete="current-password"
          />
        )}
      />

      {serverError ? <Text style={styles.serverError}>{serverError}</Text> : null}

      <Button
        label={login.isPending ? t('auth.login.submitting') : t('auth.login.submit')}
        onPress={onSubmit}
        variant="cta"
        loading={login.isPending}
        style={styles.submit}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  form: { gap: spacing.lg },
  serverError: {
    color: colors.error,
    fontSize: fontSize.sm,
    fontWeight: '600',
  },
  submit: { marginTop: spacing.sm },
});
