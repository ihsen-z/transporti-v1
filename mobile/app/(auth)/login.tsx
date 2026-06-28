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

export default function LoginScreen() {
  const { t } = useTranslation('auth');
  const router = useRouter();
  const loginStore = useAuthStore((state) => state.login);
  const [isLoading, setIsLoading] = useState(false);

  const schema = z.object({
    email: z.string().email({ message: t('email_invalid', { defaultValue: 'Email invalide.' }) }),
    password: z.string().min(6, { message: t('password_too_short', { defaultValue: 'Au moins 6 caractères.' }) }),
  });

  type FormData = z.infer<typeof schema>;

  const { control, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  const onSubmit = async (data: FormData) => {
    setIsLoading(true);
    console.log('[login.tsx] onSubmit starting for:', data.email);
    const result = await authApi.login(data.email, data.password);
    setIsLoading(false);
    console.log('[login.tsx] onSubmit result:', JSON.stringify(result));

    if (result.success) {
      const { user, access, refresh } = result.data;
      console.log('[login.tsx] login successful, calling loginStore with:', { user, access: access ? 'exists' : 'missing', refresh: refresh ? 'exists' : 'missing' });
      await loginStore(user, access, refresh);
      console.log('[login.tsx] loginStore completed, replacing route to /(tabs)/home');
      router.replace('/(tabs)/home');
    } else {
      console.error('[login.tsx] login failed:', result.error);
      Alert.alert(
        t('error_title', { defaultValue: 'Erreur' }),
        result.error.message || t('login_failed', { defaultValue: 'Échec de la connexion' })
      );
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.scrollContainer} keyboardShouldPersistTaps="handled">
      <View style={styles.header}>
        <Text style={styles.brandTitle}>Transporti</Text>
        <Text style={styles.subtitle}>{t('welcome_message', { defaultValue: 'Connectez-vous pour continuer' })}</Text>
      </View>

      <View style={styles.form}>
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
                placeholder="Ex: chaker@transporti.tn"
                placeholderTextColor={colors.text.disabled}
                keyboardType="email-address"
                autoCapitalize="none"
                autoComplete="email"
              />
            )}
          />
          {errors.email && <Text style={styles.errorText}>{errors.email.message}</Text>}
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
          onPress={() => router.push('/(auth)/forgot-password')}
          style={styles.forgotButton}
        >
          <Text style={styles.forgotText}>{t('forgotPassword', { defaultValue: 'Mot de passe oublié ?' })}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={handleSubmit(onSubmit)}
          style={styles.loginButton}
          disabled={isLoading}
        >
          {isLoading ? (
            <ActivityIndicator color={colors.text.inverse} />
          ) : (
            <Text style={styles.loginButtonText}>{t('login', { defaultValue: 'Se connecter' })}</Text>
          )}
        </TouchableOpacity>

        {__DEV__ && (
          <TouchableOpacity
            onPress={async () => {
              try {
                await loginStore(
                  { id: 999, email: 'test@client.com', phone: '12345678', role: 'CLIENT', name: 'Test Client', is_verified: true },
                  'fake-access-token',
                  'fake-refresh-token'
                );
                router.replace('/(tabs)/home');
              } catch (err: any) {
                Alert.alert('Dev Login Error', err?.message || String(err));
              }
            }}
            style={[styles.loginButton, { backgroundColor: colors.warning[500], marginTop: -10 }]}
          >
            <Text style={styles.loginButtonText}>[DEV] Auto-Login Client</Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity
          onPress={() => router.push('/(auth)/register')}
          style={styles.registerLink}
        >
          <Text style={styles.registerLinkLabel}>
            {t('dontHaveAccount', { defaultValue: "Vous n'avez pas de compte ? S'inscrire" })}
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
    marginBottom: spacing['2xl'],
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
  inputGroup: {
    marginBottom: spacing.lg,
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
  forgotButton: {
    alignSelf: 'flex-end',
    marginBottom: spacing.xl,
  },
  forgotText: {
    fontSize: typography.sizes.sm.fontSize,
    fontFamily: typography.fontFamily.medium,
    color: colors.primary[500],
  },
  loginButton: {
    height: 50,
    backgroundColor: colors.primary[500],
    borderRadius: radius.md,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  loginButtonText: {
    color: colors.text.inverse,
    fontSize: typography.sizes.base.fontSize,
    fontFamily: typography.fontFamily.semibold,
  },
  registerLink: {
    alignItems: 'center',
  },
  registerLinkLabel: {
    fontSize: typography.sizes.sm.fontSize,
    fontFamily: typography.fontFamily.medium,
    color: colors.primary[500],
  },
});
