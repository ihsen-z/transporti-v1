import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '@/core/auth/authStore';

// Écran d'accueil minimal du S0 : prouve que la fondation démarre (providers,
// i18n, hydratation d'auth). Le vrai routage par rôle (auth vs onglets) est
// câblé au sprint S1.
export default function Index() {
  const { t } = useTranslation();
  const status = useAuthStore((s) => s.status);

  if (status === 'idle' || status === 'loading') {
    return (
      <View style={styles.center}>
        <ActivityIndicator />
        <Text style={styles.muted}>{t('common.loading')}</Text>
      </View>
    );
  }

  return (
    <View style={styles.center}>
      <Text style={styles.title}>{t('app.name')}</Text>
      <Text style={styles.muted}>{t('app.tagline')}</Text>
      <Text style={styles.badge}>{t('s0.ready')}</Text>
      <Text style={styles.muted}>
        {status === 'authenticated'
          ? t('s0.session_active')
          : t('s0.session_none')}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: 24,
  },
  title: { fontSize: 28, fontWeight: '700' },
  muted: { color: '#6b7280' },
  badge: { marginTop: 12, color: '#16a34a', fontWeight: '600' },
});
