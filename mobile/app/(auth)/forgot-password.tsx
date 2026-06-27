import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ActivityIndicator, Alert, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { authApi } from '../../src/features/identity/api/authApi';
import { colors, typography, spacing, radius } from '../../src/core/theme/tokens';

export default function ForgotPasswordScreen() {
  const { t } = useTranslation('auth');
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  const schema = z.object({
    email: z.string().email({ message: t('email_invalid', { defaultValue: 'Email invalide.' }) }),
  });

  type FormData = z.infer<typeof schema>;

  const { control, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      email: '',
    },
  });

  const onSubmit = async (data: FormData) => {
    setIsLoading(true);
    const result = await authApi.forgotPassword(data.email);
    setIsLoading(false);

    if (result.success) {
      Alert.alert(
        t('success_title', { defaultValue: 'Succès' }),
        t('reset_link_sent', { defaultValue: 'Un lien de réinitialisation a été envoyé à votre adresse e-mail.' }),
        [{ text: 'OK', onPress: () => router.push('/(auth)/login') }]
      );
    } else {
      Alert.alert(
        t('error_title', { defaultValue: 'Erreur' }),
        result.error.message || t('reset_failed', { defaultValue: 'Une erreur est survenue.' })
      );
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.scrollContainer} keyboardShouldPersistTaps="handled">
      <TouchableOpacity
        onPress={() => router.back()}
        style={styles.backButton}
      >
        <Text style={styles.backButtonText}>← {t('back', { defaultValue: 'Retour' })}</Text>
      </TouchableOpacity>

      <View style={styles.header}>
        <Text style={styles.title}>{t('forgotPasswordTitle', { defaultValue: 'Mot de passe oublié' })}</Text>
        <Text style={styles.subtitle}>
          {t('forgotPasswordInstructions', { defaultValue: 'Saisissez votre e-mail pour recevoir un lien de réinitialisation.' })}
        </Text>
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
              />
            )}
          />
          {errors.email && <Text style={styles.errorText}>{errors.email.message}</Text>}
        </View>

        <TouchableOpacity
          onPress={handleSubmit(onSubmit)}
          style={styles.submitButton}
          disabled={isLoading}
        >
          {isLoading ? (
            <ActivityIndicator color={colors.text.inverse} />
          ) : (
            <Text style={styles.submitButtonText}>{t('send', { defaultValue: 'Envoyer' })}</Text>
          )}
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
  backButton: {
    position: 'absolute',
    top: 50,
    left: spacing.xl,
    paddingVertical: spacing.sm,
  },
  backButtonText: {
    fontSize: typography.sizes.base.fontSize,
    fontFamily: typography.fontFamily.medium,
    color: colors.primary[500],
  },
  header: {
    alignItems: 'center',
    marginBottom: spacing['2xl'],
    marginTop: 60,
  },
  title: {
    fontSize: typography.sizes['2xl'].fontSize,
    lineHeight: typography.sizes['2xl'].lineHeight,
    fontFamily: typography.fontFamily.bold,
    color: colors.text.primary,
    marginBottom: spacing.xs,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: typography.sizes.base.fontSize,
    lineHeight: typography.sizes.base.lineHeight,
    fontFamily: typography.fontFamily.regular,
    color: colors.text.secondary,
    textAlign: 'center',
    paddingHorizontal: spacing.sm,
  },
  form: {
    width: '100%',
  },
  inputGroup: {
    marginBottom: spacing.xl,
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
  submitButton: {
    height: 50,
    backgroundColor: colors.primary[500],
    borderRadius: radius.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  submitButtonText: {
    color: colors.text.inverse,
    fontSize: typography.sizes.base.fontSize,
    fontFamily: typography.fontFamily.semibold,
  },
});
