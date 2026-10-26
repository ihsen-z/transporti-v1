import { useMemo } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useTranslation } from 'react-i18next';
import { TextField } from '@/shared/ui/TextField';
import { Button } from '@/shared/ui/Button';
import { Txt } from '@/shared/ui/Txt';
import { FormMessage } from '@/shared/ui/FormMessage';
import { PasswordStrength } from '@/shared/ui/PasswordStrength';
import { colors, radii, spacing, fontSize, TOUCH_TARGET } from '@/shared/theme';
import { useRegister } from '../api/useRegister';

// Messages = clés i18n (traduites au rendu) => schéma statique.
const schema = z
  .object({
    first_name: z.string().min(1, 'auth.errors.first_name_required'),
    last_name: z.string().min(1, 'auth.errors.last_name_required'),
    phone: z.string().min(1, 'auth.errors.phone_required'),
    email: z.string().min(1, 'auth.errors.email_required').email('auth.errors.email_invalid'),
    password: z.string().min(8, 'auth.errors.password_min'),
    password_confirm: z.string().min(1, 'auth.errors.password_required'),
    role: z.enum(['CLIENT', 'TRANSPORTER']),
  })
  .refine((d) => d.password === d.password_confirm, {
    message: 'auth.errors.password_mismatch',
    path: ['password_confirm'],
  });

type FormValues = z.infer<typeof schema>;

const ROLES = ['CLIENT', 'TRANSPORTER'] as const;

export function RegisterForm() {
  const { t } = useTranslation();
  const register = useRegister();

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      first_name: '',
      last_name: '',
      phone: '',
      email: '',
      password: '',
      password_confirm: '',
      role: 'CLIENT',
    },
  });

  // Succès => setSession change le statut d'auth => redirection par le gate.
  const onSubmit = handleSubmit((values) => register.mutate(values));

  // Erreur serveur normalisée -> message i18n.
  const serverError = useMemo(() => {
    if (!register.error) return null;
    const k = register.error.kind;
    const key =
      k === 'email_taken'
        ? 'auth.errors.email_taken'
        : k === 'phone_taken'
          ? 'auth.errors.phone_taken'
          : k === 'network'
            ? 'auth.errors.network'
            : 'auth.errors.validation';
    return t(key);
  }, [register.error, t]);

  const err = (name: keyof FormValues) =>
    errors[name] ? t(errors[name]?.message ?? '') : undefined;

  return (
    <View style={styles.form}>
      {/* Rôle : choix segmenté (2 options), BLEU = sélection (structure). */}
      <Controller
        control={control}
        name="role"
        render={({ field: { value, onChange } }) => (
          <View style={styles.roleBlock}>
            <Txt style={styles.roleLabel}>{t('auth.register.role_label')}</Txt>
            <View style={styles.segment}>
              {ROLES.map((r) => {
                const active = value === r;
                return (
                  <Pressable
                    key={r}
                    testID={`register-role-${r}`}
                    onPress={() => onChange(r)}
                    accessibilityRole="button"
                    accessibilityState={{ selected: active }}
                    style={[styles.segItem, active && styles.segItemActive]}
                  >
                    <Txt style={[styles.segText, active && styles.segTextActive]}>
                      {t(r === 'CLIENT' ? 'auth.register.role_client' : 'auth.register.role_transporter')}
                    </Txt>
                  </Pressable>
                );
              })}
            </View>
          </View>
        )}
      />

      <View style={styles.row}>
        <Controller
          control={control}
          name="first_name"
          render={({ field: { value, onChange, onBlur } }) => (
            <View style={styles.rowItem}>
              <TextField
                testID="register-first_name"
                label={t('auth.fields.first_name')}
                placeholder={t('auth.fields.first_name_placeholder')}
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                error={err('first_name')}
              />
            </View>
          )}
        />
        <Controller
          control={control}
          name="last_name"
          render={({ field: { value, onChange, onBlur } }) => (
            <View style={styles.rowItem}>
              <TextField
                testID="register-last_name"
                label={t('auth.fields.last_name')}
                placeholder={t('auth.fields.last_name_placeholder')}
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                error={err('last_name')}
              />
            </View>
          )}
        />
      </View>

      <Controller
        control={control}
        name="phone"
        render={({ field: { value, onChange, onBlur } }) => (
          <TextField
            testID="register-phone"
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

      <Controller
        control={control}
        name="email"
        render={({ field: { value, onChange, onBlur } }) => (
          <TextField
            testID="register-email"
            label={t('auth.fields.email')}
            placeholder={t('auth.fields.email_placeholder')}
            value={value}
            onChangeText={onChange}
            onBlur={onBlur}
            error={err('email')}
            keyboardType="email-address"
            autoComplete="email"
          />
        )}
      />

      <Controller
        control={control}
        name="password"
        render={({ field: { value, onChange, onBlur } }) => (
          <View style={styles.field}>
            <TextField
              testID="register-password"
              label={t('auth.fields.password')}
              placeholder={t('auth.fields.password_placeholder')}
              value={value}
              onChangeText={onChange}
              onBlur={onBlur}
              error={err('password')}
              secureTextEntry
              autoComplete="new-password"
            />
            {/* Le minimum de 8 caractères est déjà dans le schéma zod, mais il
                ne parle qu'APRÈS l'envoi. La jauge le dit pendant la frappe. */}
            <PasswordStrength value={value} testID="register-password-strength" />
          </View>
        )}
      />

      <Controller
        control={control}
        name="password_confirm"
        render={({ field: { value, onChange, onBlur } }) => (
          <TextField
            testID="register-password_confirm"
            label={t('auth.fields.password_confirm')}
            placeholder={t('auth.fields.password_placeholder')}
            value={value}
            onChangeText={onChange}
            onBlur={onBlur}
            error={err('password_confirm')}
            secureTextEntry
            autoComplete="new-password"
          />
        )}
      />

      {serverError ? (
        <FormMessage testID="register-server-error">{serverError}</FormMessage>
      ) : null}

      <Button
        testID="register-submit"
        label={register.isPending ? t('auth.register.submitting') : t('auth.register.submit')}
        onPress={onSubmit}
        variant="cta"
        loading={register.isPending}
        style={styles.submit}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  form: { gap: spacing.lg },
  roleBlock: { gap: spacing.sm },
  roleLabel: { fontSize: fontSize.label, fontWeight: '600', color: colors.neutral[500] },
  segment: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  // Charte (.field) : même gabarit qu'un champ, parce que c'en est un — le
  // rôle est la première réponse du formulaire, pas un réglage.
  segItem: {
    flex: 1,
    minHeight: TOUCH_TARGET,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radii.input,
    borderWidth: 1,
    borderColor: colors.neutral[300],
    backgroundColor: colors.neutral[50],
  },
  segItemActive: { backgroundColor: colors.brand[600], borderColor: colors.brand[600] },
  segText: { fontSize: fontSize.md, fontWeight: '700', color: colors.neutral[900] },
  segTextActive: { color: colors.neutral[0] },
  row: { flexDirection: 'row', gap: spacing.md },
  rowItem: { flex: 1 },
  field: { gap: spacing.sm },
  submit: { marginTop: spacing.sm },
});
