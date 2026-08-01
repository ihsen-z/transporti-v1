import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, StyleSheet, Switch, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Button } from '@/shared/ui/Button';
import { colors, spacing, fontSize } from '@/shared/theme';
import { useNotificationPrefs, useUpdateNotificationPrefs } from '../api/useNotificationPrefs';
import type { NotificationPrefKey, NotificationPrefsDto } from '../api/prefsDto';

// Regroupement pour l'affichage : canaux d'abord, puis catégories d'alertes.
const CHANNELS: NotificationPrefKey[] = ['email_enabled', 'push_enabled', 'sms_enabled'];
const CATEGORIES: NotificationPrefKey[] = [
  'notify_new_offer',
  'notify_offer_accepted',
  'notify_job_completed',
  'notify_new_message',
  'notify_dispute',
];

interface Props {
  onDone: () => void;
}

// Réglages des notifications : charge les préférences, expose des interrupteurs
// et enregistre l'ensemble en un PUT. Sur succès, le panneau se ferme.
export function NotificationPrefsForm({ onDone }: Props) {
  const { t } = useTranslation();
  const prefs = useNotificationPrefs(true);
  const update = useUpdateNotificationPrefs();
  const [local, setLocal] = useState<NotificationPrefsDto | null>(null);

  // Initialise l'état local une fois les préférences chargées.
  useEffect(() => {
    if (prefs.data && !local) setLocal(prefs.data);
  }, [prefs.data, local]);

  useEffect(() => {
    if (update.isSuccess) onDone();
  }, [update.isSuccess, onDone]);

  const serverError = useMemo(() => {
    if (prefs.isError) return t('common.retry');
    if (update.isError) return t('auth.errors.network');
    return null;
  }, [prefs.isError, update.isError, t]);

  if (prefs.isLoading || !local) {
    return <ActivityIndicator style={styles.loader} color={colors.brand[500]} />;
  }

  const toggle = (key: NotificationPrefKey) => (value: boolean) =>
    setLocal((prev) => (prev ? { ...prev, [key]: value } : prev));

  const renderRow = (key: NotificationPrefKey) => (
    <View key={key} style={styles.row}>
      <Text style={styles.rowLabel}>{t(`notif_prefs.${key}`)}</Text>
      <Switch
        value={local[key]}
        onValueChange={toggle(key)}
        trackColor={{ true: colors.brand[500], false: colors.neutral[200] }}
      />
    </View>
  );

  return (
    <View style={styles.form}>
      <Text style={styles.section}>{t('notif_prefs.channels')}</Text>
      {CHANNELS.map(renderRow)}

      <Text style={styles.section}>{t('notif_prefs.categories')}</Text>
      {CATEGORIES.map(renderRow)}

      {serverError ? <Text style={styles.serverError}>{serverError}</Text> : null}

      <Button
        label={update.isPending ? t('profile.saving') : t('profile.save')}
        onPress={() => update.mutate(local)}
        variant="cta"
        loading={update.isPending}
        style={styles.submit}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  form: { gap: spacing.sm },
  loader: { marginTop: spacing['2xl'] },
  section: {
    fontSize: fontSize.md,
    fontWeight: '800',
    color: colors.brand[600],
    marginTop: spacing.md,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
  },
  rowLabel: { flex: 1, fontSize: fontSize.md, color: colors.neutral[900] },
  serverError: { color: colors.error, fontSize: fontSize.sm, fontWeight: '600', marginTop: spacing.sm },
  submit: { marginTop: spacing.lg },
});
