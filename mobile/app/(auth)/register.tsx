import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ActivityIndicator, Alert, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useAuthStore } from '../../src/core/auth/authStore';
import { authApi } from '../../src/features/identity/api/authApi';
import { colors, typography, spacing, radius } from '../../src/core/theme/tokens';

export default function RegisterScreen() {
  const { t } = useTranslation('auth');
  const router = useRouter();
  const loginStore = useAuthStore((state) => state.login);
  const [isLoading, setIsLoading] = useState(false);

  const schema = z.object({
    name: z.string().min(2, { message: t('name_too_short', { defaultValue: 'Au moins 2 caractères.' }) }),
    email: z.string().email({ message: t('email_invalid', { defaultValue: 'Email invalide.' }) }),
    phone: z.string().min(8, { message: t('phone_too_short', { defaultValue: 'Au moins 8 chiffres.' }) }),
    password: z.string().min(6, { message: t('password_too_short', { defaultValue: 'Au moins 6 caractères.' }) }),
    role: z.enum(['CLIENT', 'TRANSPORTER']),
  });

  type FormData = z.infer<typeof schema>;

  const { control, handleSubmit, setValue, watch, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: '',
      email: '',
      phone: '',
      password: '',
      role: 'CLIENT',
    },
  });

  const selectedRole = watch('role');

  const onSubmit = async (data: FormData) => {
    setIsLoading(true);
    const result = await authApi.register(data);
    setIsLoading(false);

    if (result.success) {
      const { user, access, refresh } = result.data;
      await loginStore(user, access, refresh);
      router.replace('/(tabs)/home');
    } else {
      Alert.alert(
        t('error_title', { defaultValue: 'Erreur' }),
        result.error.message || t('register_failed', { defaultValue: "Échec de l'inscription" })
      );
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.scrollContainer} keyboardShouldPersistTaps="handled">
      <View style={styles.header}>
        <Text style={styles.brandTitle}>Transporti</Text>
        <Text style={styles.subtitle}>{t('create_account_message', { defaultValue: 'Créer un nouveau compte' })}</Text>
      </View>

      <View style={styles.form}>
        <View style={styles.roleContainer}>
          <TouchableOpacity
            style={[styles.roleTab, selectedRole === 'CLIENT' && styles.roleTabActive]}
            onPress={() => setValue('role', 'CLIENT')}
          >
            <Text style={[styles.roleTabText, selectedRole === 'CLIENT' && styles.roleTabTextActive]}>
              {t('client', { defaultValue: 'Client' })}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.roleTab, selectedRole === 'TRANSPORTER' && styles.roleTabActive]}
            onPress={() => setValue('role', 'TRANSPORTER')}
          >
            <Text style={[styles.roleTabText, selectedRole === 'TRANSPORTER' && styles.roleTabTextActive]}>
              {t('transporter', { defaultValue: 'Transporteur' })}
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>{t('name', { defaultValue: 'Nom complet' })}</Text>
          <Controller
            control={control}
            name="name"
            render={({ field: { onChange, onBlur, value } }) => (
              <TextInput
                style={[styles.input, errors.name && styles.inputError]}
                onBlur={onBlur}
                onChangeText={onChange}
                value={value}
                placeholder="Ex: Mohamed Ali"
                placeholderTextColor={colors.text.disabled}
                autoCapitalize="words"
              />
            )}
          />
          {errors.name && <Text style={styles.errorText}>{errors.name.message}</Text>}
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>{t('email', { defaultValue: 'E-mail' })}</Text>
          <Controller
            control={control}
            name="email"
            render={({ field: { onChange, onBlur, value } }) => (
              <TextInput
                style={[styles.input, errors.email && styles.inputError]}
                onBlur={onBlur}
                onChangeText={onChange}
                value={value}
                placeholder="Ex: mohamed.ali@gmail.com"
                placeholderTextColor={colors.text.disabled}
                keyboardType="email-address"
                autoCapitalize="none"
              />
            )}
          />
          {errors.email && <Text style={styles.errorText}>{errors.email.message}</Text>}
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>{t('phone', { defaultValue: 'Téléphone' })}</Text>
          <Controller
            control={control}
            name="phone"
            render={({ field: { onChange, onBlur, value } }) => (
              <TextInput
                style={[styles.input, errors.phone && styles.inputError]}
                onBlur={onBlur}
                onChangeText={onChange}
                value={value}
                placeholder="Ex: 55123456"
                placeholderTextColor={colors.text.disabled}
                keyboardType="phone-pad"
              />
            )}
          />
          {errors.phone && <Text style={styles.errorText}>{errors.phone.message}</Text>}
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>{t('password', { defaultValue: 'Mot de passe' })}</Text>
          <Controller
            control={control}
            name="password"
            render={({ field: { onChange, onBlur, value } }) => (
              <TextInput
                style={[styles.input, errors.password && styles.inputError]}
                onBlur={onBlur}
                onChangeText={onChange}
                value={value}
                placeholder="••••••••"
                placeholderTextColor={colors.text.disabled}
                secureTextEntry
                autoCapitalize="none"
              />
            )}
          />
          {errors.password && <Text style={styles.errorText}>{errors.password.message}</Text>}
        </View>

        <TouchableOpacity
          onPress={handleSubmit(onSubmit)}
          style={styles.registerButton}
          disabled={isLoading}
        >
          {isLoading ? (
            <ActivityIndicator color={colors.text.inverse} />
          ) : (
            <Text style={styles.registerButtonText}>{t('register', { defaultValue: "S'inscrire" })}</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => router.push('/(auth)/login')}
          style={styles.loginLink}
        >
          <Text style={styles.loginLinkLabel}>
            {t('alreadyHaveAccount', { defaultValue: 'Vous avez déjà un compte ? Se connecter' })}
          </Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scrollContainer: {
    flexGrow: 1,
    padding: spacing.xl,
    justifyContent: 'center',
    backgroundColor: colors.background.default,
  },
  header: {
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  brandTitle: {
    fontSize: typography.sizes['3xl'].fontSize,
    lineHeight: typography.sizes['3xl'].lineHeight,
    fontFamily: typography.fontFamily.bold,
    color: colors.primary[500],
    marginBottom: spacing.xs,
  },
  subtitle: {
    fontSize: typography.sizes.base.fontSize,
    lineHeight: typography.sizes.base.lineHeight,
    fontFamily: typography.fontFamily.regular,
    color: colors.text.secondary,
  },
  form: {
    width: '100%',
  },
  roleContainer: {
    flexDirection: 'row',
    marginBottom: spacing.xl,
    backgroundColor: colors.neutral[100],
    borderRadius: radius.md,
    padding: 4,
  },
  roleTab: {
    flex: 1,
    paddingVertical: spacing.sm,
    alignItems: 'center',
    borderRadius: radius.sm,
  },
  roleTabActive: {
    backgroundColor: colors.background.card,
  },
  roleTabText: {
    fontSize: typography.sizes.sm.fontSize,
    fontFamily: typography.fontFamily.medium,
    color: colors.text.secondary,
  },
  roleTabTextActive: {
    color: colors.primary[500],
    fontFamily: typography.fontFamily.semibold,
  },
  inputGroup: {
    marginBottom: spacing.base,
  },
  label: {
    fontSize: typography.sizes.sm.fontSize,
    lineHeight: typography.sizes.sm.lineHeight,
    fontFamily: typography.fontFamily.medium,
    color: colors.text.primary,
    marginBottom: spacing.xs,
  },
  input: {
    height: 50,
    backgroundColor: colors.background.card,
    borderWidth: 1,
    borderColor: colors.border.default,
    borderRadius: radius.md,
    paddingHorizontal: spacing.base,
    fontSize: typography.sizes.base.fontSize,
    fontFamily: typography.fontFamily.regular,
    color: colors.text.primary,
  },
  inputError: {
    borderColor: colors.error[500],
  },
  errorText: {
    fontSize: typography.sizes.xs.fontSize,
    lineHeight: typography.sizes.xs.lineHeight,
    fontFamily: typography.fontFamily.regular,
    color: colors.error[500],
    marginTop: spacing.xs,
  },
  registerButton: {
    height: 50,
    backgroundColor: colors.primary[500],
    borderRadius: radius.md,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: spacing.md,
    marginBottom: spacing.xl,
  },
  registerButtonText: {
    color: colors.text.inverse,
    fontSize: typography.sizes.base.fontSize,
    fontFamily: typography.fontFamily.semibold,
  },
  loginLink: {
    alignItems: 'center',
  },
  loginLinkLabel: {
    fontSize: typography.sizes.sm.fontSize,
    fontFamily: typography.fontFamily.medium,
    color: colors.primary[500],
  },
});
